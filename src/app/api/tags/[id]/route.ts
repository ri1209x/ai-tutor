import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// GET /api/tags/[id] - 個別タグ取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = params;

    const tag = await prisma.tag.findUnique({
      where: { id },
      include: {
        questionTags: {
          include: {
            question: {
              select: {
                id: true,
                title: true,
                content: true,
                subject: true,
                topic: true,
                difficulty: true,
                isActive: true,
                isPublic: true,
              },
            },
          },
        },
        _count: {
          select: {
            questionTags: true,
          },
        },
      },
    });

    if (!tag) {
      return NextResponse.json(
        { error: 'タグが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(tag);
  } catch (error) {
    console.error('タグ取得エラー:', error);
    return NextResponse.json(
      { error: 'タグ取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// PUT /api/tags/[id] - タグ更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 教育者・管理者のみ更新可能
    if (session.user.role !== UserRole.EDUCATOR && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'タグ更新権限がありません' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { name, description, color } = body;

    // 既存タグの確認
    const existingTag = await prisma.tag.findUnique({
      where: { id },
    });

    if (!existingTag) {
      return NextResponse.json(
        { error: 'タグが見つかりません' },
        { status: 404 }
      );
    }

    // 名前の重複チェック（自分以外）
    if (name && name.trim() !== existingTag.name) {
      const duplicateTag = await prisma.tag.findUnique({
        where: { name: name.trim() },
      });

      if (duplicateTag) {
        return NextResponse.json(
          { error: 'このタグ名は既に存在します' },
          { status: 409 }
        );
      }
    }

    const updatedTag = await prisma.tag.update({
      where: { id },
      data: {
        name: name?.trim() || existingTag.name,
        description: description !== undefined ? description?.trim() || null : existingTag.description,
        color: color !== undefined ? color || null : existingTag.color,
      },
      include: {
        _count: {
          select: {
            questionTags: true,
          },
        },
      },
    });

    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error('タグ更新エラー:', error);
    return NextResponse.json(
      { error: 'タグ更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// DELETE /api/tags/[id] - タグ削除
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
        { error: 'タグ削除権限がありません' },
        { status: 403 }
      );
    }

    const { id } = params;

    // 既存タグの確認と使用状況チェック
    const existingTag = await prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            questionTags: true,
          },
        },
      },
    });

    if (!existingTag) {
      return NextResponse.json(
        { error: 'タグが見つかりません' },
        { status: 404 }
      );
    }

    // 使用中のタグは削除不可
    if (existingTag._count.questionTags > 0) {
      return NextResponse.json(
        { 
          error: 'このタグは問題で使用されているため削除できません',
          usageCount: existingTag._count.questionTags,
        },
        { status: 409 }
      );
    }

    await prisma.tag.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'タグが削除されました',
      deleted: true,
    });
  } catch (error) {
    console.error('タグ削除エラー:', error);
    return NextResponse.json(
      { error: 'タグ削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
