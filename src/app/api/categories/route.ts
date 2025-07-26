import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// GET /api/categories - カテゴリ一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const parentId = searchParams.get('parentId');
    const level = searchParams.get('level');
    const includeChildren = searchParams.get('includeChildren') === 'true';
    const includeUsage = searchParams.get('includeUsage') === 'true';
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const skip = (page - 1) * limit;

    // 検索条件を構築
    const where: any = {};
    
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    } else {
      where.isActive = true; // デフォルトでアクティブのみ
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (parentId !== null) {
      where.parentId = parentId === 'null' ? null : parentId;
    }
    
    if (level !== null) {
      where.level = parseInt(level);
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { level: 'asc' },
          { sortOrder: 'asc' },
          { name: 'asc' },
        ],
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
          children: includeChildren ? {
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
          } : undefined,
          _count: includeUsage ? {
            select: {
              questionCategories: true,
              children: true,
            },
          } : undefined,
        },
      }),
      prisma.category.count({ where }),
    ]);

    return NextResponse.json({
      categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('カテゴリ取得エラー:', error);
    return NextResponse.json(
      { error: 'カテゴリ取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// POST /api/categories - 新しいカテゴリ作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 教育者・管理者のみカテゴリ作成可能
    if (session.user.role !== UserRole.EDUCATOR && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'カテゴリ作成権限がありません' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, parentId, sortOrder } = body;

    // バリデーション
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'カテゴリ名は必須です' },
        { status: 400 }
      );
    }

    // 親カテゴリの確認とレベル計算
    let level = 0;
    let parentCategory = null;

    if (parentId) {
      parentCategory = await prisma.category.findUnique({
        where: { id: parentId, isActive: true },
      });

      if (!parentCategory) {
        return NextResponse.json(
          { error: '親カテゴリが見つかりません' },
          { status: 404 }
        );
      }

      level = parentCategory.level + 1;

      // 階層の深さ制限（例：5階層まで）
      if (level > 4) {
        return NextResponse.json(
          { error: 'カテゴリの階層が深すぎます（最大5階層）' },
          { status: 400 }
        );
      }
    }

    // 同じ親の下での名前の重複チェック
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        parentId: parentId || null,
        isActive: true,
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'この階層にはすでに同じ名前のカテゴリが存在します' },
        { status: 409 }
      );
    }

    // ソート順序の設定
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined) {
      const lastCategory = await prisma.category.findFirst({
        where: { parentId: parentId || null },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      finalSortOrder = (lastCategory?.sortOrder || 0) + 1;
    }

    const newCategory = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        parentId: parentId || null,
        level,
        sortOrder: finalSortOrder,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            level: true,
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

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('カテゴリ作成エラー:', error);
    return NextResponse.json(
      { error: 'カテゴリ作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
