import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, QuestionType, Difficulty } from '@prisma/client';

// GET /api/questions - 質問一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    const courseId = searchParams.get('courseId');
    const type = searchParams.get('type');
    const difficulty = searchParams.get('difficulty');
    const subject = searchParams.get('subject');
    const topic = searchParams.get('topic');
    const search = searchParams.get('search'); // 検索キーワード
    const tags = searchParams.get('tags')?.split(',').filter(Boolean); // タグフィルター
    const categories = searchParams.get('categories')?.split(',').filter(Boolean); // カテゴリフィルター
    const isActive = searchParams.get('isActive');
    const isPublic = searchParams.get('isPublic');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const skip = (page - 1) * limit;

    // フィルター条件を構築
    const where: any = {
      isActive: isActive !== null ? isActive === 'true' : true, // デフォルトでアクティブのみ
    };
    
    if (isPublic !== null) {
      where.isPublic = isPublic === 'true';
    }
    
    if (lessonId) {
      where.lessonId = lessonId;
    } else if (courseId) {
      where.lesson = {
        courseId: courseId,
      };
    }
    
    if (type) {
      where.questionType = type as QuestionType;
    }
    
    if (difficulty) {
      where.difficulty = difficulty as Difficulty;
    }
    
    if (subject) {
      where.subject = subject;
    }
    
    if (topic) {
      where.topic = topic;
    }
    
    // 検索キーワード対応
    if (search) {
      where.OR = [
        { content: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { explanation: { contains: search, mode: 'insensitive' } },
        { keywords: { hasSome: [search] } },
      ];
    }
    
    // タグフィルター
    if (tags && tags.length > 0) {
      where.questionTags = {
        some: {
          tag: {
            name: { in: tags }
          }
        }
      };
    }
    
    // カテゴリフィルター
    if (categories && categories.length > 0) {
      where.questionCategories = {
        some: {
          category: {
            name: { in: categories }
          }
        }
      };
    }
    
    // ソート条件
    const orderBy: any = {};
    if (sortBy === 'difficulty') {
      orderBy.difficulty = sortOrder;
    } else if (sortBy === 'points') {
      orderBy.points = sortOrder;
    } else if (sortBy === 'usageCount') {
      orderBy.usageCount = sortOrder;
    } else if (sortBy === 'averageScore') {
      orderBy.averageScore = sortOrder;
    } else {
      orderBy[sortBy] = sortOrder;
    }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              course: {
                select: {
                  id: true,
                  title: true,
                  subject: true,
                },
              },
            },
          },
          questionTags: {
            include: {
              tag: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
          questionCategories: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  level: true,
                },
              },
            },
          },
          answers: session.user.role === UserRole.LEARNER ? {
            where: {
              userId: session.user.id,
            },
            select: {
              id: true,
              content: true,
              isCorrect: true,
              timeSpent: true,
              createdAt: true,
            },
          } : {
            select: {
              id: true,
              userId: true,
              content: true,
              isCorrect: true,
              timeSpent: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              answers: true,
              questionTags: true,
              questionCategories: true,
            },
          },
        },
      }),
      prisma.question.count({ where }),
    ]);

    // 学習者の場合、正解と解説を非表示にする
    const processedQuestions = session.user.role === UserRole.LEARNER
      ? questions.map(q => ({
          ...q,
          correctAnswer: undefined,
          explanation: undefined,
        }))
      : questions;

    return NextResponse.json({
      questions: processedQuestions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('質問取得エラー:', error);
    return NextResponse.json(
      { error: '質問取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// POST /api/questions - 新しい質問作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 教育者のみ質問作成可能
    if (session.user.role !== UserRole.EDUCATOR && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: '質問作成権限がありません' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      lessonId,
      title,
      content,
      type,
      difficulty,
      options,
      correctAnswer,
      explanation,
      hints,
      points,
      estimatedTime,
      subject,
      topic,
      keywords,
      isPublic,
      tags,
      categories,
    } = body;

    // バリデーション
    if (!content || !type || !difficulty) {
      return NextResponse.json(
        { error: '必須項目が入力されていません（content, type, difficulty）' },
        { status: 400 }
      );
    }

    // レッスンの存在確認と権限チェック
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
        { error: 'このレッスンに質問を作成する権限がありません' },
        { status: 403 }
      );
    }

    // 選択肢問題の場合、optionsとcorrectAnswerが必要
    if (type === QuestionType.MULTIPLE_CHOICE && (!options || !correctAnswer)) {
      return NextResponse.json(
        { error: '選択肢問題にはoptionsとcorrectAnswerが必要です' },
        { status: 400 }
      );
    }

    // 問題作成をトランザクションで実行
    const newQuestion = await prisma.$transaction(async (tx) => {
      // 問題を作成
      const question = await tx.question.create({
        data: {
          lessonId: lessonId || null,
          title: title || null,
          content,
          questionType: type as QuestionType,
          difficulty: difficulty as Difficulty,
          options: options || [],
          correctAnswer,
          explanation: explanation || null,
          hints: hints || [],
          points: points || 1,
          estimatedTime: estimatedTime || null,
          subject: subject || null,
          topic: topic || null,
          keywords: keywords || [],
          isPublic: isPublic !== undefined ? isPublic : true,
          createdBy: session.user.id,
        },
      });

      // タグを作成・関連付け
      if (tags && tags.length > 0) {
        for (const tagName of tags) {
          // タグが存在しない場合は作成
          const tag = await tx.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          });

          // 問題とタグを関連付け
          await tx.questionTag.create({
            data: {
              questionId: question.id,
              tagId: tag.id,
            },
          });
        }
      }

      // カテゴリを関連付け
      if (categories && categories.length > 0) {
        for (const categoryId of categories) {
          await tx.questionCategory.create({
            data: {
              questionId: question.id,
              categoryId,
            },
          });
        }
      }

      return question;
    });

    // 作成された問題を詳細情報付きで取得
    const questionWithDetails = await prisma.question.findUnique({
      where: { id: newQuestion.id },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            course: {
              select: {
                id: true,
                title: true,
                subject: true,
              },
            },
          },
        },
        questionTags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        questionCategories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(questionWithDetails, { status: 201 });
  } catch (error) {
    console.error('質問作成エラー:', error);
    return NextResponse.json(
      { error: '質問作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
