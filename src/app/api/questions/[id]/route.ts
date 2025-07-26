import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, QuestionType, Difficulty } from '@prisma/client';

// GET /api/questions/[id] - 個別問題取得
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

    const question = await prisma.question.findUnique({
      where: { 
        id,
        isActive: true, // アクティブな問題のみ
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            course: {
              select: {
                id: true,
                title: true,
                subject: true,
                creatorId: true,
              },
            },
          },
        },
        questionTags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                description: true,
              },
            },
          },
        },
        questionCategories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                level: true,
              },
            },
          },
        },
        answers: session.user.role === UserRole.LEARNER ? {
          where: {
            userId: session.user.id,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        } : undefined,
        _count: {
          select: {
            answers: true,
            questionTags: true,
            questionCategories: true,
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: '問題が見つかりません' },
        { status: 404 }
      );
    }

    // 権限チェック：プライベート問題の場合
    if (!question.isPublic) {
      const hasAccess = 
        session.user.role === UserRole.ADMIN ||
        question.createdBy === session.user.id ||
        (question.lesson?.course?.creatorId === session.user.id);

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'この問題にアクセスする権限がありません' },
          { status: 403 }
        );
      }
    }

    // 学習者の場合、正解と解説を条件付きで非表示
    let processedQuestion = question;
    if (session.user.role === UserRole.LEARNER) {
      // 既に回答済みの場合は正解と解説を表示
      const hasAnswered = question.answers && question.answers.length > 0;
      
      if (!hasAnswered) {
        processedQuestion = {
          ...question,
          correctAnswer: '',
          explanation: null,
        };
      }
    }

    return NextResponse.json(processedQuestion);
  } catch (error) {
    console.error('問題取得エラー:', error);
    return NextResponse.json(
      { error: '問題取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// PUT /api/questions/[id] - 問題更新
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
        { error: '問題更新権限がありません' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const {
      title,
      content,
      questionType,
      difficulty,
      options,
      correctAnswer,
      explanation,
      hints,
      points,
      estimatedTime,
      subject,
      topic,
      keywords,
      isPublic,
      isActive,
      tags,
      categories,
    } = body;

    // 既存問題の確認と権限チェック
    const existingQuestion = await prisma.question.findUnique({
      where: { id },
      include: {
        lesson: {
          include: {
            course: {
              select: {
                creatorId: true,
              },
            },
          },
        },
      },
    });

    if (!existingQuestion) {
      return NextResponse.json(
        { error: '問題が見つかりません' },
        { status: 404 }
      );
    }

    // 権限チェック
    const hasPermission = 
      session.user.role === UserRole.ADMIN ||
      existingQuestion.createdBy === session.user.id ||
      (existingQuestion.lesson?.course?.creatorId === session.user.id);

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'この問題を更新する権限がありません' },
        { status: 403 }
      );
    }

    // 問題更新をトランザクションで実行
    const updatedQuestion = await prisma.$transaction(async (tx) => {
      // 問題を更新
      const question = await tx.question.update({
        where: { id },
        data: {
          title: title !== undefined ? title : existingQuestion.title,
          content: content !== undefined ? content : existingQuestion.content,
          questionType: questionType !== undefined ? questionType as QuestionType : existingQuestion.questionType,
          difficulty: difficulty !== undefined ? difficulty as Difficulty : existingQuestion.difficulty,
          options: options !== undefined ? options : existingQuestion.options,
          correctAnswer: correctAnswer !== undefined ? correctAnswer : existingQuestion.correctAnswer,
          explanation: explanation !== undefined ? explanation : existingQuestion.explanation,
          hints: hints !== undefined ? hints : existingQuestion.hints,
          points: points !== undefined ? points : existingQuestion.points,
          estimatedTime: estimatedTime !== undefined ? estimatedTime : existingQuestion.estimatedTime,
          subject: subject !== undefined ? subject : existingQuestion.subject,
          topic: topic !== undefined ? topic : existingQuestion.topic,
          keywords: keywords !== undefined ? keywords : existingQuestion.keywords,
          isPublic: isPublic !== undefined ? isPublic : existingQuestion.isPublic,
          isActive: isActive !== undefined ? isActive : existingQuestion.isActive,
        },
      });

      // タグの更新
      if (tags !== undefined) {
        // 既存のタグ関連を削除
        await tx.questionTag.deleteMany({
          where: { questionId: id },
        });

        // 新しいタグを作成・関連付け
        if (tags.length > 0) {
          for (const tagName of tags) {
            const tag = await tx.tag.upsert({
              where: { name: tagName },
              update: {},
              create: { name: tagName },
            });

            await tx.questionTag.create({
              data: {
                questionId: id,
                tagId: tag.id,
              },
            });
          }
        }
      }

      // カテゴリの更新
      if (categories !== undefined) {
        // 既存のカテゴリ関連を削除
        await tx.questionCategory.deleteMany({
          where: { questionId: id },
        });

        // 新しいカテゴリを関連付け
        if (categories.length > 0) {
          for (const categoryId of categories) {
            await tx.questionCategory.create({
              data: {
                questionId: id,
                categoryId,
              },
            });
          }
        }
      }

      return question;
    });

    // 更新された問題を詳細情報付きで取得
    const questionWithDetails = await prisma.question.findUnique({
      where: { id },
      include: {
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
        questionTags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
        questionCategories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: {
            answers: true,
            questionTags: true,
            questionCategories: true,
          },
        },
      },
    });

    return NextResponse.json(questionWithDetails);
  } catch (error) {
    console.error('問題更新エラー:', error);
    return NextResponse.json(
      { error: '問題更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// DELETE /api/questions/[id] - 問題削除
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
        { error: '問題削除権限がありません' },
        { status: 403 }
      );
    }

    const { id } = params;

    // 既存問題の確認と権限チェック
    const existingQuestion = await prisma.question.findUnique({
      where: { id },
      include: {
        lesson: {
          include: {
            course: {
              select: {
                creatorId: true,
              },
            },
          },
        },
        _count: {
          select: {
            answers: true,
          },
        },
      },
    });

    if (!existingQuestion) {
      return NextResponse.json(
        { error: '問題が見つかりません' },
        { status: 404 }
      );
    }

    // 権限チェック
    const hasPermission = 
      session.user.role === UserRole.ADMIN ||
      existingQuestion.createdBy === session.user.id ||
      (existingQuestion.lesson?.course?.creatorId === session.user.id);

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'この問題を削除する権限がありません' },
        { status: 403 }
      );
    }

    // 回答が存在する場合は論理削除、そうでなければ物理削除
    if (existingQuestion._count.answers > 0) {
      // 論理削除（isActiveをfalseに設定）
      await prisma.question.update({
        where: { id },
        data: {
          isActive: false,
        },
      });

      return NextResponse.json({
        message: '問題が論理削除されました（回答データが存在するため）',
        deleted: false,
      });
    } else {
      // 物理削除（関連データも含めて削除）
      await prisma.$transaction(async (tx) => {
        // タグ関連を削除
        await tx.questionTag.deleteMany({
          where: { questionId: id },
        });

        // カテゴリ関連を削除
        await tx.questionCategory.deleteMany({
          where: { questionId: id },
        });

        // 問題を削除
        await tx.question.delete({
          where: { id },
        });
      });

      return NextResponse.json({
        message: '問題が完全に削除されました',
        deleted: true,
      });
    }
  } catch (error) {
    console.error('問題削除エラー:', error);
    return NextResponse.json(
      { error: '問題削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
