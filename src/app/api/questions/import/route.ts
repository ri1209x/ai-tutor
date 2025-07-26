import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, QuestionType, Difficulty, ImportStatus } from '@prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { parse } from 'csv-parse/sync';

// POST /api/questions/import - 問題バルクインポート
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 教育者・管理者のみインポート可能
    if (session.user.role !== UserRole.EDUCATOR && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: '問題インポート権限がありません' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const lessonId = formData.get('lessonId') as string;
    const defaultSubject = formData.get('defaultSubject') as string;
    const defaultTopic = formData.get('defaultTopic') as string;
    const defaultDifficulty = (formData.get('defaultDifficulty') as string) || 'MEDIUM';

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが選択されていません' },
        { status: 400 }
      );
    }

    // ファイル形式チェック
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'サポートされていないファイル形式です（CSV, Excel のみ）' },
        { status: 400 }
      );
    }

    // ファイルサイズチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'ファイルサイズが大きすぎます（最大10MB）' },
        { status: 400 }
      );
    }

    // レッスンの存在確認と権限チェック（指定されている場合）
    if (lessonId) {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          course: {
            select: {
              creatorId: true,
            },
          },
        },
      });

      if (!lesson) {
        return NextResponse.json(
          { error: 'レッスンが見つかりません' },
          { status: 404 }
        );
      }

      if (lesson.course.creatorId !== session.user.id && session.user.role !== UserRole.ADMIN) {
        return NextResponse.json(
          { error: 'このレッスンに問題をインポートする権限がありません' },
          { status: 403 }
        );
      }
    }

    // ファイルを一時保存
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // アップロードディレクトリの作成
    const uploadDir = join(process.cwd(), 'uploads', 'imports');
    await mkdir(uploadDir, { recursive: true });

    // ファイル名の生成
    const timestamp = Date.now();
    const filename = `${timestamp}-${file.name}`;
    const filepath = join(uploadDir, filename);

    // ファイル保存
    await writeFile(filepath, buffer);

    // インポート記録を作成
    const importRecord = await prisma.questionImport.create({
      data: {
        filename,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        status: ImportStatus.PENDING,
        createdBy: session.user.id,
      },
    });

    // バックグラウンドでインポート処理を開始
    processImport(importRecord.id, filepath, {
      lessonId: lessonId || null,
      defaultSubject,
      defaultTopic,
      defaultDifficulty: defaultDifficulty as Difficulty,
      createdBy: session.user.id,
    }).catch(error => {
      console.error('Import processing error:', error);
    });

    return NextResponse.json({
      importId: importRecord.id,
      message: 'インポート処理を開始しました',
      status: 'processing',
    }, { status: 202 });

  } catch (error) {
    console.error('問題インポートエラー:', error);
    return NextResponse.json(
      { error: '問題インポート中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// GET /api/questions/import - インポート履歴取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 教育者・管理者のみ履歴閲覧可能
    if (session.user.role !== UserRole.EDUCATOR && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'インポート履歴閲覧権限がありません' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    // フィルター条件を構築
    const where: any = {};
    
    // 管理者以外は自分のインポートのみ表示
    if (session.user.role !== UserRole.ADMIN) {
      where.createdBy = session.user.id;
    }
    
    if (status) {
      where.status = status as ImportStatus;
    }

    const [imports, total] = await Promise.all([
      prisma.questionImport.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.questionImport.count({ where }),
    ]);

    return NextResponse.json({
      imports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('インポート履歴取得エラー:', error);
    return NextResponse.json(
      { error: 'インポート履歴取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// バックグラウンドインポート処理
async function processImport(
  importId: string,
  filepath: string,
  options: {
    lessonId: string | null;
    defaultSubject: string;
    defaultTopic: string;
    defaultDifficulty: Difficulty;
    createdBy: string;
  }
) {
  try {
    // インポート開始
    await prisma.questionImport.update({
      where: { id: importId },
      data: {
        status: ImportStatus.PROCESSING,
        startedAt: new Date(),
      },
    });

    // ファイル読み込み
    const fs = require('fs');
    const fileContent = fs.readFileSync(filepath, 'utf-8');

    // CSV解析
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const totalRows = records.length;
    let processedRows = 0;
    let successRows = 0;
    let errorRows = 0;
    const errors: any[] = [];

    // 各行を処理
    for (const [index, recordRaw] of records.entries()) {
      const record = recordRaw as any;
      try {
        processedRows++;

        // 必須フィールドのバリデーション
        if (!record.content || !record.questionType) {
          throw new Error('content と questionType は必須です');
        }

        // 問題タイプの検証
        const questionType = record.questionType.toUpperCase();
        if (!Object.values(QuestionType).includes(questionType as QuestionType)) {
          throw new Error(`無効な問題タイプ: ${record.questionType}`);
        }

        // 難易度の検証
        let difficulty = record.difficulty?.toUpperCase() || options.defaultDifficulty;
        if (!Object.values(Difficulty).includes(difficulty as Difficulty)) {
          difficulty = options.defaultDifficulty;
        }

        // 選択肢の処理
        let options_array: string[] = [];
        if (record.options) {
          try {
            options_array = JSON.parse(record.options);
          } catch {
            options_array = record.options.split(',').map((opt: string) => opt.trim());
          }
        }

        // ヒントの処理
        let hints_array: string[] = [];
        if (record.hints) {
          try {
            hints_array = JSON.parse(record.hints);
          } catch {
            hints_array = record.hints.split(',').map((hint: string) => hint.trim());
          }
        }

        // キーワードの処理
        let keywords_array: string[] = [];
        if (record.keywords) {
          try {
            keywords_array = JSON.parse(record.keywords);
          } catch {
            keywords_array = record.keywords.split(',').map((keyword: string) => keyword.trim());
          }
        }

        // 問題作成
        const questionData = {
          lessonId: options.lessonId,
          title: record.title || null,
          content: record.content,
          questionType: questionType as QuestionType,
          difficulty: difficulty as Difficulty,
          options: options_array,
          correctAnswer: record.correctAnswer || '',
          explanation: record.explanation || null,
          hints: hints_array,
          points: parseInt(record.points) || 1,
          estimatedTime: parseInt(record.estimatedTime) || null,
          subject: record.subject || options.defaultSubject || null,
          topic: record.topic || options.defaultTopic || null,
          keywords: keywords_array,
          isPublic: record.isPublic === 'true' || record.isPublic === '1' || true,
          createdBy: options.createdBy,
        };

        await prisma.question.create({
          data: questionData,
        });

        successRows++;

      } catch (error) {
        errorRows++;
        errors.push({
          row: index + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: record,
        });
      }

      // 進捗更新（10行ごと）
      if (processedRows % 10 === 0) {
        await prisma.questionImport.update({
          where: { id: importId },
          data: {
            processedRows,
            successRows,
            errorRows,
          },
        });
      }
    }

    // インポート完了
    await prisma.questionImport.update({
      where: { id: importId },
      data: {
        status: ImportStatus.COMPLETED,
        totalRows,
        processedRows,
        successRows,
        errorRows,
        errors: JSON.stringify(errors),
        completedAt: new Date(),
      },
    });

  } catch (error) {
    // インポート失敗
    await prisma.questionImport.update({
      where: { id: importId },
      data: {
        status: ImportStatus.FAILED,
        errors: JSON.stringify([{
          error: error instanceof Error ? error.message : 'Unknown error',
        }]),
        completedAt: new Date(),
      },
    });
  }
}
