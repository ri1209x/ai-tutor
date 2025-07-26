import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// GET /api/courses/[id] - 特定のコース取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const courseId = params.id;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
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
            description: true,
            order: true,
            duration: true,
            lessonType: true,
            createdAt: true,
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
    });

    if (!course) {
      return NextResponse.json(
        { error: 'コースが見つかりません' },
        { status: 404 }
      );
    }

    // 学習者の場合、自分の進捗情報も含める
    if (session.user.role === UserRole.LEARNER) {
      const progress = await prisma.learningProgress.findUnique({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: courseId,
          },
        },
      });

      return NextResponse.json({
        ...course,
        userProgress: progress,
      });
    }

    return NextResponse.json(course);
  } catch (error) {
    console.error('コース取得エラー:', error);
    return NextResponse.json(
      { error: 'コース取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// PUT /api/courses/[id] - コース更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const courseId = params.id;

    // 既存のコースを取得
    const existingCourse = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!existingCourse) {
      return NextResponse.json(
        { error: 'コースが見つかりません' },
        { status: 404 }
      );
    }

    // 作成者または管理者のみ更新可能
    if (
      existingCourse.creatorId !== session.user.id &&
      session.user.role !== UserRole.ADMIN
    ) {
      return NextResponse.json(
        { error: 'コース更新権限がありません' },
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

    const updatedCourse = await prisma.course.update({
      where: { id: courseId },
      data: {
        title: title || existingCourse.title,
        description: description || existingCourse.description,
        subject: subject || existingCourse.subject,
        grade: grade ? parseInt(grade) : existingCourse.grade,
        difficulty: difficulty || existingCourse.difficulty,
        // estimatedHours, objectives, prerequisites fields don't exist in schema
        updatedAt: new Date(),
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

    return NextResponse.json(updatedCourse);
  } catch (error) {
    console.error('コース更新エラー:', error);
    return NextResponse.json(
      { error: 'コース更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/[id] - コース削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const courseId = params.id;

    // 既存のコースを取得
    const existingCourse = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        _count: {
          select: {
            lessons: true,
            learningProgress: true,
          },
        },
      },
    });

    if (!existingCourse) {
      return NextResponse.json(
        { error: 'コースが見つかりません' },
        { status: 404 }
      );
    }

    // 作成者または管理者のみ削除可能
    if (
      existingCourse.creatorId !== session.user.id &&
      session.user.role !== UserRole.ADMIN
    ) {
      return NextResponse.json(
        { error: 'コース削除権限がありません' },
        { status: 403 }
      );
    }

    // 学習進捗がある場合は削除を制限
    if (existingCourse._count.learningProgress > 0) {
      return NextResponse.json(
        { error: '学習進捗があるコースは削除できません' },
        { status: 400 }
      );
    }

    // トランザクションで関連データも削除
    await prisma.$transaction(async (tx) => {
      // レッスンに関連する質問と回答を削除
      const lessons = await tx.lesson.findMany({
        where: { courseId },
        select: { id: true },
      });

      for (const lesson of lessons) {
        await tx.answer.deleteMany({
          where: {
            question: {
              lessonId: lesson.id,
            },
          },
        });

        await tx.question.deleteMany({
          where: { lessonId: lesson.id },
        });
      }

      // レッスンを削除
      await tx.lesson.deleteMany({
        where: { courseId },
      });

      // コースを削除
      await tx.course.delete({
        where: { id: courseId },
      });
    });

    return NextResponse.json({ message: 'コースが正常に削除されました' });
  } catch (error) {
    console.error('コース削除エラー:', error);
    return NextResponse.json(
      { error: 'コース削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
