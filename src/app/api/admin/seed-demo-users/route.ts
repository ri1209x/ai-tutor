import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

// POST /api/admin/seed-demo-users - デモユーザー作成
export async function POST(request: NextRequest) {
  try {
    console.log('🌱 デモユーザーの作成を開始します...');

    // デモユーザーの定義
    const demoUsers = [
      {
        email: 'student@smarttutor.com',
        name: '田中 太郎',
        role: UserRole.LEARNER,
        password: 'password',
      },
      {
        email: 'parent@smarttutor.com',
        name: '田中 花子',
        role: UserRole.PARENT,
        password: 'password',
      },
      {
        email: 'teacher@smarttutor.com',
        name: '佐藤 先生',
        role: UserRole.EDUCATOR,
        password: 'password',
      },
      {
        email: 'admin@smarttutor.com',
        name: '管理者',
        role: UserRole.ADMIN,
        password: 'password',
      },
    ];

    const results = [];

    for (const userData of demoUsers) {
      try {
        // 既存ユーザーをチェック
        const existingUser = await prisma.user.findUnique({
          where: { email: userData.email },
        });

        if (existingUser) {
          console.log(`✓ ${userData.email} は既に存在します`);
          results.push({
            email: userData.email,
            status: 'already_exists',
            message: '既に存在します',
          });
          continue;
        }

        // パスワードをハッシュ化
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        // ユーザーを作成
        const user = await prisma.user.create({
          data: {
            email: userData.email,
            name: userData.name,
            role: userData.role,
            password: hashedPassword,
          },
        });

        console.log(`✅ ${userData.email} (${userData.role}) を作成しました`);
        results.push({
          email: userData.email,
          status: 'created',
          message: '作成完了',
          role: userData.role,
        });

        // 学習者の場合、追加データを作成
        if (userData.role === UserRole.LEARNER) {
          try {
            await prisma.learningProgress.create({
              data: {
                userId: user.id,
                status: 'NOT_STARTED',
                timeSpent: 0,
              },
            });

            console.log(`  ↳ ${userData.email} の学習進捗データを作成しました`);
            results[results.length - 1].message += ' (学習進捗データ含む)';
          } catch (progressError) {
            console.warn(`学習進捗データ作成エラー (${userData.email}):`, progressError);
            results[results.length - 1].message += ' (学習進捗データ作成失敗)';
          }
        }

      } catch (userError) {
        console.error(`❌ ${userData.email} 作成エラー:`, userError);
        results.push({
          email: userData.email,
          status: 'error',
          message: userError instanceof Error ? userError.message : 'Unknown error',
        });
      }
    }

    console.log('🎉 デモユーザー作成処理が完了しました！');

    return NextResponse.json({
      success: true,
      message: 'デモユーザー作成処理が完了しました',
      results,
      demoAccounts: {
        student: 'student@smarttutor.com',
        parent: 'parent@smarttutor.com',
        teacher: 'teacher@smarttutor.com',
        admin: 'admin@smarttutor.com',
        password: 'password',
      },
    });

  } catch (error) {
    console.error('❌ デモユーザー作成エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'デモユーザー作成中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET /api/admin/seed-demo-users - デモユーザー状況確認
export async function GET(request: NextRequest) {
  try {
    const demoEmails = [
      'student@smarttutor.com',
      'parent@smarttutor.com',
      'teacher@smarttutor.com',
      'admin@smarttutor.com',
    ];

    const users = await prisma.user.findMany({
      where: {
        email: {
          in: demoEmails,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const userMap = users.reduce((acc, user) => {
      acc[user.email] = user;
      return acc;
    }, {} as Record<string, any>);

    const status = demoEmails.map(email => ({
      email,
      exists: !!userMap[email],
      user: userMap[email] || null,
    }));

    return NextResponse.json({
      success: true,
      demoUsers: status,
      totalExists: users.length,
      totalExpected: demoEmails.length,
      allExist: users.length === demoEmails.length,
    });

  } catch (error) {
    console.error('❌ デモユーザー状況確認エラー:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'デモユーザー状況確認中にエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
