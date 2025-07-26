import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
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

    // Get learning style assessment history
    const learningStyleResults = await prisma.learningStyleResult.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      take: 20, // Limit to last 20 results
    });

    // Format results for frontend
    const formattedResults = learningStyleResults.map(result => ({
      id: result.id,
      userId: result.userId,
      scores: {
        visual: result.visualScore,
        auditory: result.auditoryScore,
        kinesthetic: result.kinestheticScore,
        reading: result.readingScore,
      },
      primaryStyle: result.primaryStyle,
      secondaryStyle: result.secondaryStyle,
      recommendations: JSON.parse(result.recommendations),
      studyTips: JSON.parse(result.studyTips),
      completedAt: result.completedAt,
    }));

    return NextResponse.json(formattedResults);

  } catch (error) {
    console.error('Learning style history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
