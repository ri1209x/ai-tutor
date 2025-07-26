import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// GET /api/tags - タグ一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeUsage = searchParams.get('includeUsage') === 'true';

    const skip = (page - 1) * limit;

    // 検索条件を構築
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [tags, total] = await Promise.all([
      prisma.tag.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { name: 'asc' },
        ],
        include: includeUsage ? {
          _count: {
            select: {
              questionTags: true,
            },
          },
        } : undefined,
      }),
      prisma.tag.count({ where }),
    ]);

    return NextResponse.json({
      tags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('タグ取得エラー:', error);
    return NextResponse.json(
      { error: 'タグ取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// POST /api/tags - 新しいタグ作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 教育者・管理者のみタグ作成可能
    if (session.user.role !== UserRole.EDUCATOR && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'タグ作成権限がありません' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, color } = body;

    // バリデーション
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'タグ名は必須です' },
        { status: 400 }
      );
    }

    // 重複チェック
    const existingTag = await prisma.tag.findUnique({
      where: { name: name.trim() },
    });

    if (existingTag) {
      return NextResponse.json(
        { error: 'このタグ名は既に存在します' },
        { status: 409 }
      );
    }

    const newTag = await prisma.tag.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null,
      },
      include: {
        _count: {
          select: {
            questionTags: true,
          },
        },
      },
    });

    return NextResponse.json(newTag, { status: 201 });
  } catch (error) {
    console.error('タグ作成エラー:', error);
    return NextResponse.json(
      { error: 'タグ作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
