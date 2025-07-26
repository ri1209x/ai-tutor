import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, ImportStatus } from '@prisma/client';

// GET /api/questions/import/[id] - 個別インポート状況取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 教育者・管理者のみ閲覧可能
    if (session.user.role !== UserRole.EDUCATOR && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'インポート状況閲覧権限がありません' },
        { status: 403 }
      );
    }

    const { id } = params;

    const importRecord = await prisma.questionImport.findUnique({
      where: { id },
    });

    if (!importRecord) {
      return NextResponse.json(
        { error: 'インポート記録が見つかりません' },
        { status: 404 }
      );
    }

    // 権限チェック（管理者以外は自分のインポートのみ）
    if (session.user.role !== UserRole.ADMIN && importRecord.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'このインポート記録にアクセスする権限がありません' },
        { status: 403 }
      );
    }

    // エラー詳細をパース
    let parsedErrors = null;
    if (importRecord.errors) {
      try {
        parsedErrors = JSON.parse(importRecord.errors);
      } catch {
        parsedErrors = importRecord.errors;
      }
    }

    const response = {
      ...importRecord,
      errors: parsedErrors,
      progress: importRecord.totalRows ? {
        percentage: Math.round((importRecord.processedRows / importRecord.totalRows) * 100),
        processed: importRecord.processedRows,
        total: importRecord.totalRows,
        success: importRecord.successRows,
        failed: importRecord.errorRows,
      } : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('インポート状況取得エラー:', error);
    return NextResponse.json(
      { error: 'インポート状況取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// DELETE /api/questions/import/[id] - インポート記録削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 教育者・管理者のみ削除可能
    if (session.user.role !== UserRole.EDUCATOR && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'インポート記録削除権限がありません' },
        { status: 403 }
      );
    }

    const { id } = params;

    const importRecord = await prisma.questionImport.findUnique({
      where: { id },
    });

    if (!importRecord) {
      return NextResponse.json(
        { error: 'インポート記録が見つかりません' },
        { status: 404 }
      );
    }

    // 権限チェック（管理者以外は自分のインポートのみ）
    if (session.user.role !== UserRole.ADMIN && importRecord.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'このインポート記録を削除する権限がありません' },
        { status: 403 }
      );
    }

    // 処理中のインポートは削除不可
    if (importRecord.status === ImportStatus.PROCESSING) {
      return NextResponse.json(
        { error: '処理中のインポートは削除できません' },
        { status: 409 }
      );
    }

    // ファイル削除（オプション）
    if (importRecord.filename) {
      try {
        const fs = require('fs');
        const path = require('path');
        const filepath = path.join(process.cwd(), 'uploads', 'imports', importRecord.filename);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      } catch (error) {
        console.warn('Failed to delete import file:', error);
      }
    }

    // インポート記録削除
    await prisma.questionImport.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'インポート記録が削除されました',
      deleted: true,
    });
  } catch (error) {
    console.error('インポート記録削除エラー:', error);
    return NextResponse.json(
      { error: 'インポート記録削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
