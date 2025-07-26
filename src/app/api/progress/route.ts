import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, ProgressStatus } from '@prisma/client';

// GET /api/progress - 学習進捗取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const skip = (page - 1) * limit;

    // フィルター条件を構築
    const where: any = {};

    // 学習者は自分の進捗のみ取得可能
    if (session.user.role === UserRole.LEARNER) {
      where.userId = session.user.id;
    } else if (userId) {
      // 教育者・保護者・管理者は特定ユーザーの進捗を取得可能
      where.userId = userId;
    }

    if (courseId) {
      where.courseId = courseId;
    }

    const [progressList, total] = await Promise.all([
      prisma.learningProgress.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              subject: true,
              grade: true,
              difficulty: true,
              // estimatedHours field doesn't exist in schema
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      }),
      prisma.learningProgress.count({ where }),
    ]);

    return NextResponse.json({
      progress: progressList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('学習進捗取得エラー:', error);
    return NextResponse.json(
      { error: '学習進捗取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// POST /api/progress - 学習進捗作成・更新
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const {
      courseId,
      status,
      completedLessons,
      totalTimeSpent,
      lastAccessedLessonId,
      currentStreak,
      bestStreak,
      averageScore,
      weakAreas,
      strongAreas,
    } = body;

    // バリデーション
    if (!courseId) {
      return NextResponse.json(
        { error: 'コースIDが必要です' },
        { status: 400 }
      );
    }

    // コースの存在確認
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'コースが見つかりません' },
        { status: 404 }
      );
    }

    // 学習者は自分の進捗のみ更新可能
    const targetUserId = session.user.role === UserRole.LEARNER 
      ? session.user.id 
      : body.userId || session.user.id;

    // 既存の進捗を確認
    const existingProgress = await prisma.learningProgress.findUnique({
      where: {
        userId_courseId: {
          userId: targetUserId,
          courseId: courseId,
        },
      },
    });

    let progress;

    if (existingProgress) {
      // 既存の進捗を更新
      progress = await prisma.learningProgress.update({
        where: {
          userId_courseId: {
            userId: targetUserId,
            courseId: courseId,
          },
        },
        data: {
          status: status ? (status as ProgressStatus) : existingProgress.status,
          timeSpent: totalTimeSpent !== undefined ? totalTimeSpent : existingProgress.timeSpent,
          score: averageScore !== undefined ? averageScore : existingProgress.score,
          lessonId: lastAccessedLessonId || existingProgress.lessonId,
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              subject: true,
              grade: true,
            },
          },
        },
      });
    } else {
      // 新しい進捗を作成
      progress = await prisma.learningProgress.create({
        data: {
          userId: targetUserId,
          courseId: courseId,
          status: status ? (status as ProgressStatus) : ProgressStatus.NOT_STARTED,
          timeSpent: totalTimeSpent || 0,
          score: averageScore || 0,
          lessonId: lastAccessedLessonId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              subject: true,
              grade: true,
            },
          },
        },
      });
    }

    return NextResponse.json(progress, { status: existingProgress ? 200 : 201 });
  } catch (error) {
    console.error('学習進捗更新エラー:', error);
    return NextResponse.json(
      { error: '学習進捗更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
