import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// GET /api/categories/[id] - 個別カテゴリ取得
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

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
        children: {
          where: { isActive: true },
          orderBy: [
            { sortOrder: 'asc' },
            { name: 'asc' },
          ],
          select: {
            id: true,
            name: true,
            description: true,
            level: true,
            sortOrder: true,
            isActive: true,
          },
        },
        questionCategories: {
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
            questionCategories: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'カテゴリが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('カテゴリ取得エラー:', error);
    return NextResponse.json(
      { error: 'カテゴリ取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// PUT /api/categories/[id] - カテゴリ更新
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
        { error: 'カテゴリ更新権限がありません' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { name, description, parentId, sortOrder, isActive } = body;

    // 既存カテゴリの確認
    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        children: {
          select: { id: true },
        },
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'カテゴリが見つかりません' },
        { status: 404 }
      );
    }

    // 親カテゴリの変更時の循環参照チェック
    if (parentId && parentId !== existingCategory.parentId) {
      // 自分自身を親にすることはできない
      if (parentId === id) {
        return NextResponse.json(
          { error: '自分自身を親カテゴリにすることはできません' },
          { status: 400 }
        );
      }

      // 子孫を親にすることはできない（循環参照防止）
      const isDescendant = await checkIfDescendant(parentId, id);
      if (isDescendant) {
        return NextResponse.json(
          { error: '子孫カテゴリを親にすることはできません' },
          { status: 400 }
        );
      }

      // 新しい親カテゴリの確認
      const newParent = await prisma.category.findUnique({
        where: { id: parentId, isActive: true },
      });

      if (!newParent) {
        return NextResponse.json(
          { error: '指定された親カテゴリが見つかりません' },
          { status: 404 }
        );
      }

      // 階層の深さ制限チェック
      if (newParent.level >= 4) {
        return NextResponse.json(
          { error: 'カテゴリの階層が深すぎます（最大5階層）' },
          { status: 400 }
        );
      }
    }

    // 名前の重複チェック（同じ親の下で、自分以外）
    if (name && name.trim() !== existingCategory.name) {
      const duplicateCategory = await prisma.category.findFirst({
        where: {
          name: name.trim(),
          parentId: parentId !== undefined ? (parentId || null) : existingCategory.parentId,
          isActive: true,
          id: { not: id },
        },
      });

      if (duplicateCategory) {
        return NextResponse.json(
          { error: 'この階層にはすでに同じ名前のカテゴリが存在します' },
          { status: 409 }
        );
      }
    }

    // レベルの再計算
    let newLevel = existingCategory.level;
    if (parentId !== undefined && parentId !== existingCategory.parentId) {
      if (parentId) {
        const parent = await prisma.category.findUnique({
          where: { id: parentId },
          select: { level: true },
        });
        newLevel = parent ? parent.level + 1 : 0;
      } else {
        newLevel = 0;
      }
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: name?.trim() || existingCategory.name,
        description: description !== undefined ? description?.trim() || null : existingCategory.description,
        parentId: parentId !== undefined ? (parentId || null) : existingCategory.parentId,
        level: newLevel,
        sortOrder: sortOrder !== undefined ? sortOrder : existingCategory.sortOrder,
        isActive: isActive !== undefined ? isActive : existingCategory.isActive,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
        children: {
          where: { isActive: true },
          orderBy: [
            { sortOrder: 'asc' },
            { name: 'asc' },
          ],
        },
        _count: {
          select: {
            questionCategories: true,
            children: true,
          },
        },
      },
    });

    // 子カテゴリのレベルも更新（親が変更された場合）
    if (parentId !== undefined && parentId !== existingCategory.parentId) {
      await updateChildrenLevels(id, newLevel);
    }

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.error('カテゴリ更新エラー:', error);
    return NextResponse.json(
      { error: 'カテゴリ更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - カテゴリ削除
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
        { error: 'カテゴリ削除権限がありません' },
        { status: 403 }
      );
    }

    const { id } = params;

    // 既存カテゴリの確認と使用状況チェック
    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            questionCategories: true,
            children: true,
          },
        },
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'カテゴリが見つかりません' },
        { status: 404 }
      );
    }

    // 子カテゴリがある場合は削除不可
    if (existingCategory._count.children > 0) {
      return NextResponse.json(
        { 
          error: 'このカテゴリには子カテゴリが存在するため削除できません',
          childrenCount: existingCategory._count.children,
        },
        { status: 409 }
      );
    }

    // 使用中のカテゴリは論理削除
    if (existingCategory._count.questionCategories > 0) {
      await prisma.category.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        message: 'カテゴリが論理削除されました（問題で使用されているため）',
        deleted: false,
        usageCount: existingCategory._count.questionCategories,
      });
    } else {
      // 物理削除
      await prisma.category.delete({
        where: { id },
      });

      return NextResponse.json({
        message: 'カテゴリが完全に削除されました',
        deleted: true,
      });
    }
  } catch (error) {
    console.error('カテゴリ削除エラー:', error);
    return NextResponse.json(
      { error: 'カテゴリ削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// ヘルパー関数：循環参照チェック
async function checkIfDescendant(potentialParentId: string, categoryId: string): Promise<boolean> {
  const descendants = await prisma.category.findMany({
    where: {
      parentId: categoryId,
    },
    select: {
      id: true,
    },
  });

  for (const descendant of descendants) {
    if (descendant.id === potentialParentId) {
      return true;
    }
    if (await checkIfDescendant(potentialParentId, descendant.id)) {
      return true;
    }
  }

  return false;
}

// ヘルパー関数：子カテゴリのレベル更新
async function updateChildrenLevels(parentId: string, parentLevel: number): Promise<void> {
  const children = await prisma.category.findMany({
    where: { parentId },
    select: { id: true },
  });

  for (const child of children) {
    await prisma.category.update({
      where: { id: child.id },
      data: { level: parentLevel + 1 },
    });

    // 再帰的に子の子も更新
    await updateChildrenLevels(child.id, parentLevel + 1);
  }
}
