import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, ProgressStatus } from '@prisma/client';

// GET /api/answers - 回答一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('questionId');
    const userId = searchParams.get('userId');
    const lessonId = searchParams.get('lessonId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const skip = (page - 1) * limit;

    // フィルター条件を構築
    const where: any = {};

    // 学習者は自分の回答のみ取得可能
    if (session.user.role === UserRole.LEARNER) {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (questionId) {
      where.questionId = questionId;
    }

    if (lessonId) {
      where.question = {
        lessonId: lessonId,
      };
    }

    const [answers, total] = await Promise.all([
      prisma.answer.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          question: {
            select: {
              id: true,
              questionType: true,
              content: true,
              correctAnswer: true,
              points: true,
              lesson: {
                select: {
                  id: true,
                  title: true,
                  course: {
                    select: {
                      id: true,
                      title: true,
                      subject: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.answer.count({ where }),
    ]);

    return NextResponse.json({
      answers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('回答取得エラー:', error);
    return NextResponse.json(
      { error: '回答取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// POST /api/answers - 新しい回答作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const {
      questionId,
      answer,
      timeSpent,
    } = body;

    // バリデーション
    if (!questionId || answer === undefined) {
      return NextResponse.json(
        { error: '質問IDと回答が必要です' },
        { status: 400 }
      );
    }

    // 質問の存在確認
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        lesson: {
          select: {
            id: true,
            courseId: true,
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: '質問が見つかりません' },
        { status: 404 }
      );
    }

    // 既存の回答をチェック（重複回答の防止）
    const existingAnswer = await prisma.answer.findFirst({
      where: {
        userId: session.user.id,
        questionId: questionId,
      },
    });

    if (existingAnswer) {
      return NextResponse.json(
        { error: 'この質問には既に回答済みです' },
        { status: 400 }
      );
    }

    // 正解判定
    const isCorrect = question.correctAnswer 
      ? answer.toString().toLowerCase() === question.correctAnswer.toLowerCase()
      : false;

    // 回答を作成
    const newAnswer = await prisma.answer.create({
      data: {
        userId: session.user.id,
        questionId,
        content: answer.toString(),
        isCorrect,
        timeSpent: timeSpent || 0,
      },
      include: {
        question: {
          select: {
            id: true,
            questionType: true,
            content: true,
            correctAnswer: true,
            explanation: true,
            points: true,
            lesson: {
              select: {
                id: true,
                title: true,
                courseId: true,
              },
            },
          },
        },
      },
    });

    // 学習進捗を更新
    if (question.lesson) {
      await updateLearningProgress(session.user.id, question.lesson.courseId, isCorrect, timeSpent || 0);
    }

    // 回答結果を返す（正解・解説を含む）
    return NextResponse.json({
      ...newAnswer,
      feedback: {
        isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        pointsEarned: isCorrect ? question.points : 0,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('回答作成エラー:', error);
    return NextResponse.json(
      { error: '回答作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 学習進捗更新のヘルパー関数
async function updateLearningProgress(
  userId: string,
  courseId: string,
  isCorrect: boolean,
  timeSpent: number
) {
  try {
    // 現在の進捗を取得
    const currentProgress = await prisma.learningProgress.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!currentProgress) {
      // 進捗が存在しない場合は作成
      await prisma.learningProgress.create({
        data: {
          userId,
          courseId,
          status: ProgressStatus.IN_PROGRESS,
          timeSpent: timeSpent,
          score: isCorrect ? 100 : 0,
        },
      });
    } else {
      // 既存の進捗を更新
      // Note: currentStreak and bestStreak fields don't exist in schema, removing streak logic
      
      // 全回答数を取得して平均スコアを計算
      const totalAnswers = await prisma.answer.count({
        where: {
          userId,
          question: {
            lesson: {
              courseId,
            },
          },
        },
      });

      const correctAnswers = await prisma.answer.count({
        where: {
          userId,
          isCorrect: true,
          question: {
            lesson: {
              courseId,
            },
          },
        },
      });

      const newAverageScore = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

      await prisma.learningProgress.update({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
        data: {
          status: ProgressStatus.IN_PROGRESS,
          timeSpent: (currentProgress.timeSpent || 0) + timeSpent,
          score: newAverageScore,
          updatedAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error('学習進捗更新エラー:', error);
    // 進捗更新エラーは回答作成を阻害しないようにログのみ
  }
}
