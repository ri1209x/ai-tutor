import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// GET /api/courses - コース一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const subject = searchParams.get('subject');
    const grade = searchParams.get('grade');
    const difficulty = searchParams.get('difficulty');

    const skip = (page - 1) * limit;

    // フィルター条件を構築
    const where: any = {};
    
    if (subject) {
      where.subject = subject;
    }
    
    if (grade) {
      where.grade = parseInt(grade);
    }
    
    if (difficulty) {
      where.difficulty = difficulty;
    }

    // ユーザーの役割に応じてフィルタリング
    if (session.user.role === UserRole.EDUCATOR) {
      where.createdById = session.user.id;
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          lessons: {
            select: {
              id: true,
              title: true,
              order: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
          _count: {
            select: {
              lessons: true,
              learningProgress: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.course.count({ where }),
    ]);

    return NextResponse.json({
      courses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('コース取得エラー:', error);
    return NextResponse.json(
      { error: 'コース取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// POST /api/courses - 新しいコース作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 教育者のみコース作成可能
    if (session.user.role !== UserRole.EDUCATOR && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'コース作成権限がありません' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      subject,
      grade,
      difficulty,
      estimatedHours,
      objectives,
      prerequisites,
    } = body;

    // バリデーション
    if (!title || !description || !subject || !grade || !difficulty) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    const course = await prisma.course.create({
      data: {
        title,
        description,
        subject,
        grade: parseInt(grade),
        difficulty,
        // estimatedHours, objectives, prerequisites fields don't exist in schema
        creatorId: session.user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            lessons: true,
            learningProgress: true,
          },
        },
      },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error('コース作成エラー:', error);
    return NextResponse.json(
      { error: 'コース作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
