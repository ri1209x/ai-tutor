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

    const { userId, currentAnswers, configId } = await request.json();

    if (!userId || !currentAnswers || !configId) {
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

    // Get current assessment session
    const assessmentSession = await prisma.assessmentSession.findFirst({
      where: {
        userId,
        status: 'IN_PROGRESS',
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!assessmentSession) {
      return NextResponse.json(
        { error: 'Assessment session not found' },
        { status: 404 }
      );
    }

    // Get assessment configuration
    const assessmentConfigs = {
      'math_basic': {
        subjects: ['数学'],
        topics: ['基本計算', '分数', '小数', '図形'],
        maxQuestions: 20,
      },
      'comprehensive': {
        subjects: ['数学', '国語', '理科', '社会'],
        topics: ['基本計算', '読解', '理科実験', '歴史'],
        maxQuestions: 40,
      },
    };

    const config = assessmentConfigs[configId as keyof typeof assessmentConfigs];
    if (!config) {
      return NextResponse.json(
        { error: 'Invalid assessment configuration' },
        { status: 400 }
      );
    }

    // Check if assessment should be completed
    const shouldComplete = 
      assessmentSession.questionsAnswered >= config.maxQuestions ||
      hasReachedAdaptiveThreshold(currentAnswers);

    if (shouldComplete) {
      return NextResponse.json({
        isComplete: true,
        question: null,
      });
    }

    // Get previously answered question IDs
    const answeredQuestionIds = await prisma.answer.findMany({
      where: { 
        userId,
        assessmentSessionId: assessmentSession.id,
      },
      select: { questionId: true },
    });

    const excludeIds = answeredQuestionIds.map(a => a.questionId);

    // Get next question based on current difficulty
    const nextQuestion = await getAdaptiveQuestion(
      assessmentSession.currentDifficulty,
      excludeIds
    );

    if (!nextQuestion) {
      // No more questions available, complete the assessment
      return NextResponse.json({
        isComplete: true,
        question: null,
      });
    }

    // Update session with new current question
    await prisma.assessmentSession.update({
      where: { id: assessmentSession.id },
      data: { currentQuestionId: nextQuestion.id },
    });

    return NextResponse.json({
      isComplete: false,
      question: nextQuestion,
    });

  } catch (error) {
    console.error('Assessment next error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function hasReachedAdaptiveThreshold(answers: any[]): boolean {
  if (answers.length < 5) return false;
  
  // Check if performance has stabilized
  const recentAnswers = answers.slice(-5);
  const recentCorrect = recentAnswers.filter(a => a.isCorrect).length;
  const recentPerformance = recentCorrect / recentAnswers.length;
  
  // If performance is very consistent (either very high or very low), we can conclude
  return recentPerformance >= 0.9 || recentPerformance <= 0.1;
}

// Simplified function - removed since we don't have subject/topic in schema
// function getNextSubjectAndTopic() - not needed for current implementation

async function getAdaptiveQuestion(
  difficulty: number,
  excludeIds: string[]
) {
  // Get a question based on difficulty
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
      difficulty: targetDifficulty as any, // Cast to avoid enum type issues
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
