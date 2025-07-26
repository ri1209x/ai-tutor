import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { configId, userId } = await request.json();

    if (!configId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user authorization
    if (session.user.id !== userId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get assessment configuration (this would be from a config table or hardcoded)
    const assessmentConfigs = {
      'math_basic': {
        subjects: ['数学'],
        topics: ['基本計算', '分数', '小数', '図形'],
        initialDifficulty: 3,
      },
      'comprehensive': {
        subjects: ['数学', '国語', '理科', '社会'],
        topics: ['基本計算', '読解', '理科実験', '歴史'],
        initialDifficulty: 4,
      },
    };

    const config = assessmentConfigs[configId as keyof typeof assessmentConfigs];
    if (!config) {
      return NextResponse.json(
        { error: 'Invalid assessment configuration' },
        { status: 400 }
      );
    }

    // Create assessment session
    const assessmentSession = await prisma.assessmentSession.create({
      data: {
        userId,
        configId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        currentDifficulty: config.initialDifficulty,
        questionsAnswered: 0,
        correctAnswers: 0,
      },
    });

    // Get first question based on initial difficulty
    const firstQuestion = await getAdaptiveQuestion(
      config.initialDifficulty,
      []
    );

    if (!firstQuestion) {
      return NextResponse.json(
        { error: 'No questions available' },
        { status: 500 }
      );
    }

    // Update session with current question
    await prisma.assessmentSession.update({
      where: { id: assessmentSession.id },
      data: { currentQuestionId: firstQuestion.id },
    });

    return NextResponse.json({
      sessionId: assessmentSession.id,
      question: firstQuestion,
    });

  } catch (error) {
    console.error('Assessment start error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getAdaptiveQuestion(
  difficulty: number,
  excludeIds: string[]
) {
  // Get a question based on difficulty
  // Exclude previously answered questions
  const difficultyMap: { [key: number]: string } = {
    1: 'EASY',
    2: 'EASY', 
    3: 'EASY',
    4: 'MEDIUM',
    5: 'MEDIUM',
    6: 'MEDIUM',
    7: 'HARD',
    8: 'HARD',
    9: 'HARD',
    10: 'HARD'
  };
  
  const targetDifficulty = difficultyMap[Math.min(10, Math.max(1, difficulty))] || 'MEDIUM';
  
  const question = await prisma.question.findFirst({
    where: {
      difficulty: targetDifficulty as 'EASY' | 'MEDIUM' | 'HARD',
      id: {
        notIn: excludeIds,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!question) {
    return null;
  }

  // Transform to frontend format
  return {
    id: question.id,
    type: question.questionType,
    subject: 'General', // Default subject since not in schema
    topic: 'Basic', // Default topic since not in schema
    difficulty: getDifficultyNumber(question.difficulty),
    content: question.content,
    options: question.options?.map((option, index) => ({
      id: index.toString(),
      text: option,
      isCorrect: index === 0, // Simplified: assume first option is correct
    })),
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    timeLimit: 300, // Default 5 minutes
  };
}

function getDifficultyNumber(difficulty: string): number {
  switch (difficulty) {
    case 'EASY': return 3;
    case 'MEDIUM': return 6;
    case 'HARD': return 9;
    default: return 5;
  }
}
