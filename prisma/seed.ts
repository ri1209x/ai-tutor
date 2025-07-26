import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 シードデータを作成中...');

  // 管理者ユーザーを作成
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@smarttutor.com' },
    update: {},
    create: {
      email: 'admin@smarttutor.com',
      name: '管理者',
      role: 'ADMIN',
    },
  });

  // 教育者ユーザーを作成
  const educatorUser = await prisma.user.upsert({
    where: { email: 'teacher@smarttutor.com' },
    update: {},
    create: {
      email: 'teacher@smarttutor.com',
      name: '田中先生',
      role: 'EDUCATOR',
    },
  });

  // 保護者ユーザーを作成
  const parentUser = await prisma.user.upsert({
    where: { email: 'parent@smarttutor.com' },
    update: {},
    create: {
      email: 'parent@smarttutor.com',
      name: '佐藤保護者',
      role: 'PARENT',
    },
  });

  // 学習者ユーザーを作成
  const learnerUser = await prisma.user.upsert({
    where: { email: 'student@smarttutor.com' },
    update: {},
    create: {
      email: 'student@smarttutor.com',
      name: '佐藤太郎',
      role: 'LEARNER',
      grade: 5,
      learningStyle: 'VISUAL',
      parentId: parentUser.id,
      birthDate: new Date('2014-04-01'),
    },
  });

  // サンプルコースを作成
  const mathCourse = await prisma.course.create({
    data: {
      title: '小学5年生の算数',
      description: '分数と小数の基礎を学ぼう',
      subject: 'MATH',
      grade: 5,
      difficulty: 'MEDIUM',
      creatorId: educatorUser.id,
    },
  });

  const japaneseCourse = await prisma.course.create({
    data: {
      title: '小学5年生の国語',
      description: '読解力と文章力を向上させよう',
      subject: 'JAPANESE',
      grade: 5,
      difficulty: 'MEDIUM',
      creatorId: educatorUser.id,
    },
  });

  // 算数コースのレッスンを作成
  const fractionLesson = await prisma.lesson.create({
    data: {
      title: '分数の基礎',
      description: '分数の概念と基本的な計算方法を学びます',
      content: `# 分数の基礎

## 分数とは何か？
分数は、全体を等しく分けた時の一部分を表す数です。

## 分数の表し方
- 分子：分数の上の数
- 分母：分数の下の数

例：1/2（2分の1）は、全体を2つに分けた時の1つ分を表します。

## 練習問題
次の図を見て、分数で表してみましょう。`,
      order: 1,
      lessonType: 'LECTURE',
      duration: 30,
      courseId: mathCourse.id,
    },
  });

  const decimalLesson = await prisma.lesson.create({
    data: {
      title: '小数の基礎',
      description: '小数の概念と基本的な計算方法を学びます',
      content: `# 小数の基礎

## 小数とは何か？
小数は、1より小さい数を表す方法の一つです。

## 小数の表し方
- 小数点：数の整数部分と小数部分を分ける点
- 小数第一位、第二位...

例：0.5は「0.5」または「5/10」と同じ意味です。

## 練習問題
次の分数を小数で表してみましょう。`,
      order: 2,
      lessonType: 'LECTURE',
      duration: 25,
      courseId: mathCourse.id,
    },
  });

  // 国語コースのレッスンを作成
  const readingLesson = await prisma.lesson.create({
    data: {
      title: '物語文の読解',
      description: '物語文を読んで、登場人物の気持ちを理解しよう',
      content: `# 物語文の読解

## 物語文を読むコツ
1. 登場人物を整理する
2. 場面の変化に注目する
3. 登場人物の気持ちの変化を追う

## 練習
次の物語を読んで、主人公の気持ちを考えてみましょう。

「太郎は公園で一人でブランコに乗っていた。友達はみんな習い事で忙しく、遊んでくれる人がいなかった。」

この時の太郎の気持ちはどうでしょうか？`,
      order: 1,
      lessonType: 'LECTURE',
      duration: 40,
      courseId: japaneseCourse.id,
    },
  });

  // 問題を作成
  const fractionQuestion1 = await prisma.question.create({
    data: {
      content: '1/2 + 1/4 の答えはどれでしょうか？',
      questionType: 'MULTIPLE_CHOICE',
      options: ['1/6', '2/6', '3/4', '1/8'],
      correctAnswer: '3/4',
      explanation: '分母を4に揃えると、2/4 + 1/4 = 3/4 になります。',
      difficulty: 'MEDIUM',
      points: 2,
      lessonId: fractionLesson.id,
    },
  });

  const fractionQuestion2 = await prisma.question.create({
    data: {
      content: '3/5は小数で表すといくつでしょうか？',
      questionType: 'SHORT_ANSWER',
      options: [],
      correctAnswer: '0.6',
      explanation: '3÷5=0.6です。',
      difficulty: 'MEDIUM',
      points: 2,
      lessonId: fractionLesson.id,
    },
  });

  const readingQuestion1 = await prisma.question.create({
    data: {
      content: '物語文で、太郎の気持ちとして最も適切なものはどれでしょうか？',
      questionType: 'MULTIPLE_CHOICE',
      options: ['嬉しい', 'さびしい', '怒っている', 'びっくりしている'],
      correctAnswer: 'さびしい',
      explanation: '友達がいなくて一人でいる状況から、さびしい気持ちだと考えられます。',
      difficulty: 'EASY',
      points: 1,
      lessonId: readingLesson.id,
    },
  });

  // 学習進捗を作成
  await prisma.learningProgress.create({
    data: {
      userId: learnerUser.id,
      courseId: mathCourse.id,
      status: 'IN_PROGRESS',
      score: 75.0,
      timeSpent: 45,
    },
  });

  await prisma.learningProgress.create({
    data: {
      userId: learnerUser.id,
      lessonId: fractionLesson.id,
      status: 'COMPLETED',
      score: 80.0,
      timeSpent: 30,
      completedAt: new Date(),
    },
  });

  // 初回診断結果を作成
  await prisma.assessment.create({
    data: {
      userId: learnerUser.id,
      type: 'INITIAL',
      result: {
        mathScore: 75,
        japaneseScore: 80,
        englishScore: 70,
        overallScore: 75,
        details: {
          strengths: ['計算力', '読解力'],
          weaknesses: ['文章問題', '漢字'],
        },
      },
      score: 75.0,
      strengths: ['計算力', '読解力'],
      weaknesses: ['文章問題', '漢字'],
      recommendations: [
        '文章問題の練習を増やしましょう',
        '漢字の書き取り練習をしましょう',
        '図を使った問題解決を試してみましょう',
      ],
    },
  });

  console.log('✅ シードデータの作成が完了しました！');
  console.log(`👤 作成されたユーザー:`);
  console.log(`   - 管理者: ${adminUser.email}`);
  console.log(`   - 教育者: ${educatorUser.email}`);
  console.log(`   - 保護者: ${parentUser.email}`);
  console.log(`   - 学習者: ${learnerUser.email}`);
  console.log(`📚 作成されたコース:`);
  console.log(`   - ${mathCourse.title}`);
  console.log(`   - ${japaneseCourse.title}`);
}

main()
  .catch((e) => {
    console.error('❌ シードデータの作成中にエラーが発生しました:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
