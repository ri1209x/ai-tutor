import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// GET /api/lessons/[id] - 特定のレッスン取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const lessonId = params.id;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            subject: true,
            grade: true,
            creatorId: true,
          },
        },
        questions: {
          select: {
            id: true,
            questionType: true,
            difficulty: true,
            content: true,
            options: true,
            correctAnswer: true,
            explanation: true,
            // order field doesn't exist in Question model
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });

    if (!lesson) {
      return NextResponse.json(
        { error: 'レッスンが見つかりません' },
        { status: 404 }
      );
    }

    // 学習者の場合、正解は非表示にする（学習中の場合）
    if (session.user.role === UserRole.LEARNER) {
      const modifiedLesson = {
        ...lesson,
        questions: lesson.questions.map(q => ({
          ...q,
          correctAnswer: undefined, // 正解を非表示
          explanation: undefined,   // 解説を非表示（回答後に表示）
        })),
      };
      return NextResponse.json(modifiedLesson);
    }

    return NextResponse.json(lesson);
  } catch (error) {
    console.error('レッスン取得エラー:', error);
    return NextResponse.json(
      { error: 'レッスン取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// PUT /api/lessons/[id] - レッスン更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const lessonId = params.id;

    // 既存のレッスンを取得
    const existingLesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: {
          select: {
            creatorId: true,
          },
        },
      },
    });

    if (!existingLesson) {
      return NextResponse.json(
        { error: 'レッスンが見つかりません' },
        { status: 404 }
      );
    }

    // コース作成者または管理者のみ更新可能
    if (
      existingLesson.course.creatorId !== session.user.id &&
      session.user.role !== UserRole.ADMIN
    ) {
      return NextResponse.json(
        { error: 'レッスン更新権限がありません' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      content,
      contentType,
      estimatedMinutes,
      order,
      objectives,
    } = body;

    const updatedLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title: title || existingLesson.title,
        description: description || existingLesson.description,
        content: content !== undefined ? content : existingLesson.content,
        lessonType: existingLesson.lessonType,
        duration: estimatedMinutes ? parseInt(estimatedMinutes) : existingLesson.duration,
        order: order !== undefined ? order : existingLesson.order,
        updatedAt: new Date(),
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

    return NextResponse.json(updatedLesson);
  } catch (error) {
    console.error('レッスン更新エラー:', error);
    return NextResponse.json(
      { error: 'レッスン更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// DELETE /api/lessons/[id] - レッスン削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const lessonId = params.id;

    // 既存のレッスンを取得
    const existingLesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: {
          select: {
            creatorId: true,
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });

    if (!existingLesson) {
      return NextResponse.json(
        { error: 'レッスンが見つかりません' },
        { status: 404 }
      );
    }

    // コース作成者または管理者のみ削除可能
    if (
      existingLesson.course.creatorId !== session.user.id &&
      session.user.role !== UserRole.ADMIN
    ) {
      return NextResponse.json(
        { error: 'レッスン削除権限がありません' },
        { status: 403 }
      );
    }

    // トランザクションで関連データも削除
    await prisma.$transaction(async (tx) => {
      // 質問に関連する回答を削除
      await tx.answer.deleteMany({
        where: {
          question: {
            lessonId: lessonId,
          },
        },
      });

      // 質問を削除
      await tx.question.deleteMany({
        where: { lessonId: lessonId },
      });

      // レッスンを削除
      await tx.lesson.delete({
        where: { id: lessonId },
      });
    });

    return NextResponse.json({ message: 'レッスンが正常に削除されました' });
  } catch (error) {
    console.error('レッスン削除エラー:', error);
    return NextResponse.json(
      { error: 'レッスン削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
