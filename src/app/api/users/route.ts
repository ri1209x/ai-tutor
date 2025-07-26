import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// GET /api/users - ユーザー一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 管理者のみ全ユーザー取得可能
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'ユーザー一覧取得権限がありません' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    // フィルター条件を構築
    const where: any = {};
    
    if (role) {
      where.role = role as UserRole;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          grade: true,
          birthDate: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              learningProgress: true,
              answers: true,
              createdCourses: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('ユーザー取得エラー:', error);
    return NextResponse.json(
      { error: 'ユーザー取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// POST /api/users - 新しいユーザー作成（管理者用）
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 管理者のみユーザー作成可能
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'ユーザー作成権限がありません' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      email,
      role,
      grade,
      birthDate,
    } = body;

    // バリデーション
    if (!name || !email || !role) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    // メールアドレスの重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      );
    }

    // ユーザー作成
    const userData: any = {
      name,
      email,
      role: role as UserRole,
    };

    // 学習者の場合は追加情報を設定
    if (role === UserRole.LEARNER) {
      if (grade) userData.grade = parseInt(grade);
      if (birthDate) userData.birthDate = new Date(birthDate);
    }

    const user = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        grade: true,
        birthDate: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('ユーザー作成エラー:', error);
    return NextResponse.json(
      { error: 'ユーザー作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
