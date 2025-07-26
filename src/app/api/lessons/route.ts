import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// GET /api/lessons - レッスン一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!courseId) {
      return NextResponse.json(
        { error: 'コースIDが必要です' },
        { status: 400 }
      );
    }

    const skip = (page - 1) * limit;

    // コースの存在確認
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, creatorId: true },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'コースが見つかりません' },
        { status: 404 }
      );
    }

    const [lessons, total] = await Promise.all([
      prisma.lesson.findMany({
        where: { courseId },
        skip,
        take: limit,
        include: {
          course: {
            select: {
              id: true,
              title: true,
              subject: true,
            },
          },
          questions: {
            select: {
              id: true,
              questionType: true,
              difficulty: true,
            },
          },
          _count: {
            select: {
              questions: true,
            },
          },
        },
        orderBy: {
          order: 'asc',
        },
      }),
      prisma.lesson.count({ where: { courseId } }),
    ]);

    return NextResponse.json({
      lessons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('レッスン取得エラー:', error);
    return NextResponse.json(
      { error: 'レッスン取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// POST /api/lessons - 新しいレッスン作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 教育者のみレッスン作成可能
    if (session.user.role !== UserRole.EDUCATOR && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'レッスン作成権限がありません' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      courseId,
      title,
      description,
      content,
      contentType,
      estimatedMinutes,
      order,
      objectives,
    } = body;

    // バリデーション
    if (!courseId || !title || !description || !contentType) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    // コースの存在確認と権限チェック
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json(
        { error: 'コースが見つかりません' },
        { status: 404 }
      );
    }

    if (course.creatorId !== session.user.id && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'このコースにレッスンを作成する権限がありません' },
        { status: 403 }
      );
    }

    // orderが指定されていない場合、最後の順序+1を設定
    let lessonOrder = order;
    if (!lessonOrder) {
      const lastLesson = await prisma.lesson.findFirst({
        where: { courseId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      lessonOrder = (lastLesson?.order || 0) + 1;
    }

    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        title,
        description,
        content: content || '',
        lessonType: 'LECTURE',
        duration: estimatedMinutes ? parseInt(estimatedMinutes) : null,
        order: lessonOrder,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            subject: true,
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });

    return NextResponse.json(lesson, { status: 201 });
  } catch (error) {
    console.error('レッスン作成エラー:', error);
    return NextResponse.json(
      { error: 'レッスン作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
