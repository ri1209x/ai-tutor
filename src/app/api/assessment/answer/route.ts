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

    const { questionId, answer, userId, timeSpent } = await request.json();

    if (!questionId || !answer || !userId) {
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

    // Get the question to check the correct answer
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Determine if answer is correct
    let isCorrect = false;
    
    if (question.questionType === 'MULTIPLE_CHOICE') {
      // For multiple choice, check if selected option is correct
      // Parse options from JSON string array
      const options = question.options || [];
      const selectedIndex = parseInt(String(answer));
      
      // For now, assume first option is correct (this should be enhanced with proper option data)
      // In a real implementation, you'd store correct option index or have separate option records
      isCorrect = selectedIndex === 0; // Simplified logic
    } else {
      // For text input and math expressions, compare with correct answer
      // This is a simplified comparison - in production, you'd want more sophisticated matching
      const normalizedAnswer = String(answer).toLowerCase().trim();
      const normalizedCorrect = question.correctAnswer?.toLowerCase().trim() || '';
      isCorrect = normalizedAnswer === normalizedCorrect;
    }

    // Get current assessment session
    const assessmentSession = await prisma.assessmentSession.findFirst({
      where: {
        userId,
        status: 'IN_PROGRESS',
        currentQuestionId: questionId,
      },
    });

    if (!assessmentSession) {
      return NextResponse.json(
        { error: 'Assessment session not found' },
        { status: 404 }
      );
    }

    // Save the answer
    await prisma.answer.create({
      data: {
        userId,
        questionId,
        content: String(answer),
        isCorrect,
        timeSpent: timeSpent || 0,
        assessmentSessionId: assessmentSession.id,
      },
    });

    // Update assessment session statistics
    const newCorrectAnswers = assessmentSession.correctAnswers + (isCorrect ? 1 : 0);
    const newQuestionsAnswered = assessmentSession.questionsAnswered + 1;
    
    // Calculate new difficulty based on performance
    let newDifficulty = assessmentSession.currentDifficulty;
    const recentPerformance = newCorrectAnswers / newQuestionsAnswered;
    
    if (recentPerformance > 0.8 && newDifficulty < 10) {
      newDifficulty = Math.min(10, newDifficulty + 1);
    } else if (recentPerformance < 0.4 && newDifficulty > 1) {
      newDifficulty = Math.max(1, newDifficulty - 1);
    }

    await prisma.assessmentSession.update({
      where: { id: assessmentSession.id },
      data: {
        questionsAnswered: newQuestionsAnswered,
        correctAnswers: newCorrectAnswers,
        currentDifficulty: newDifficulty,
        lastAnsweredAt: new Date(),
      },
    });

    return NextResponse.json({
      isCorrect,
      explanation: question.explanation,
      newDifficulty,
      performance: recentPerformance,
    });

  } catch (error) {
    console.error('Assessment answer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
