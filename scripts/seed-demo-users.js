const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedDemoUsers() {
  try {
    console.log('🌱 デモユーザーの作成を開始します...');

    // デモユーザーの定義
    const demoUsers = [
      {
        email: 'student@smarttutor.com',
        name: '田中 太郎',
        role: 'LEARNER',
        password: 'password',
      },
      {
        email: 'parent@smarttutor.com',
        name: '田中 花子',
        role: 'PARENT',
        password: 'password',
      },
      {
        email: 'teacher@smarttutor.com',
        name: '佐藤 先生',
        role: 'EDUCATOR',
        password: 'password',
      },
      {
        email: 'admin@smarttutor.com',
        name: '管理者',
        role: 'ADMIN',
        password: 'password',
      },
    ];

    for (const userData of demoUsers) {
      // 既存ユーザーをチェック
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`✓ ${userData.email} は既に存在します`);
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
          emailVerified: new Date(), // デモ用なので即座に認証済みに
        },
      });

      console.log(`✅ ${userData.email} (${userData.role}) を作成しました`);

      // 学習者の場合、追加データを作成
      if (userData.role === 'LEARNER') {
        // 学習進捗の初期データを作成
        await prisma.learningProgress.create({
          data: {
            userId: user.id,
            totalStudyTime: 0,
            currentStreak: 0,
            bestStreak: 0,
            completedLessons: 0,
            totalPoints: 0,
            level: 1,
            experience: 0,
          },
        });

        console.log(`  ↳ ${userData.email} の学習進捗データを作成しました`);
      }
    }

    console.log('🎉 デモユーザーの作成が完了しました！');
    console.log('\n📝 デモアカウント情報:');
    console.log('学習者: student@smarttutor.com');
    console.log('保護者: parent@smarttutor.com');
    console.log('教育者: teacher@smarttutor.com');
    console.log('管理者: admin@smarttutor.com');
    console.log('パスワード: password');

  } catch (error) {
    console.error('❌ デモユーザー作成エラー:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプトを直接実行した場合
if (require.main === module) {
  seedDemoUsers()
    .then(() => {
      console.log('✅ スクリプト実行完了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ スクリプト実行エラー:', error);
      process.exit(1);
    });
}

module.exports = { seedDemoUsers };
