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

    const { userId, answers, configId, timeSpent } = await request.json();

    if (!userId || !answers || !configId) {
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

    // Calculate overall results
    const totalQuestions = answers.length;
    const correctAnswers = answers.filter((a: any) => a.isCorrect).length;
    const overallPercentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    // Analyze performance by subject
    const subjectAnalysis = analyzeSubjectPerformance(answers);
    
    // Generate recommendations based on performance
    const recommendations = generateRecommendations(subjectAnalysis, overallPercentage);
    
    // Identify strengths and weaknesses
    const { strengths, weaknesses } = identifyStrengthsAndWeaknesses(subjectAnalysis);
    
    // Generate next steps
    const nextSteps = generateNextSteps(subjectAnalysis, overallPercentage);

    // Create assessment result
    const assessmentResult = await prisma.assessmentResult.create({
      data: {
        userId,
        sessionId: assessmentSession.id,
        overallScore: correctAnswers,
        overallPercentage,
        totalQuestions,
        correctAnswers,
        timeSpent,
        subjects: JSON.stringify(subjectAnalysis),
        recommendations: JSON.stringify(recommendations),
        strengths: JSON.stringify(strengths),
        weaknesses: JSON.stringify(weaknesses),
        nextSteps: JSON.stringify(nextSteps),
        completedAt: new Date(),
      },
    });

    // Update assessment session status
    await prisma.assessmentSession.update({
      where: { id: assessmentSession.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        resultId: assessmentResult.id,
      },
    });

    // Format response
    const result = {
      id: assessmentResult.id,
      userId,
      overallScore: correctAnswers,
      overallPercentage,
      totalQuestions,
      correctAnswers,
      timeSpent,
      subjects: subjectAnalysis,
      recommendations,
      strengths,
      weaknesses,
      nextSteps,
      completedAt: assessmentResult.completedAt,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Assessment complete error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function analyzeSubjectPerformance(answers: any[]) {
  const subjectMap = new Map<string, {
    correct: number;
    total: number;
    topics: Map<string, { correct: number; total: number; }>;
    difficulties: number[];
  }>();

  // Group answers by subject
  answers.forEach((answer: any) => {
    // For this example, we'll extract subject from difficulty or use default
    // In production, you'd get this from the question data
    const subject = getSubjectFromAnswer(answer) || '数学';
    const topic = getTopicFromAnswer(answer) || '基本計算';
    
    if (!subjectMap.has(subject)) {
      subjectMap.set(subject, {
        correct: 0,
        total: 0,
        topics: new Map(),
        difficulties: [],
      });
    }

    const subjectData = subjectMap.get(subject)!;
    subjectData.total++;
    subjectData.difficulties.push(answer.difficulty);
    
    if (answer.isCorrect) {
      subjectData.correct++;
    }

    // Handle topics
    if (!subjectData.topics.has(topic)) {
      subjectData.topics.set(topic, { correct: 0, total: 0 });
    }
    
    const topicData = subjectData.topics.get(topic)!;
    topicData.total++;
    if (answer.isCorrect) {
      topicData.correct++;
    }
  });

  // Convert to result format
  const subjects = Array.from(subjectMap.entries()).map(([subject, data]) => {
    const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
    const avgDifficulty = data.difficulties.length > 0 
      ? data.difficulties.reduce((a, b) => a + b, 0) / data.difficulties.length 
      : 1;
    
    const level = percentage >= 80 ? 'advanced' : percentage >= 60 ? 'intermediate' : 'beginner';
    
    const topics = Array.from(data.topics.entries()).map(([topic, topicData]) => ({
      topic,
      score: topicData.correct,
      maxScore: topicData.total,
      percentage: topicData.total > 0 ? (topicData.correct / topicData.total) * 100 : 0,
      questionsAnswered: topicData.total,
      correctAnswers: topicData.correct,
    }));

    return {
      subject,
      score: data.correct,
      maxScore: data.total,
      percentage,
      level,
      topics,
    };
  });

  return subjects;
}

function generateRecommendations(subjects: any[], overallPercentage: number): string[] {
  const recommendations: string[] = [];

  if (overallPercentage >= 80) {
    recommendations.push('素晴らしい成績です！より高度な問題にチャレンジしてみましょう。');
  } else if (overallPercentage >= 60) {
    recommendations.push('良い成績です。苦手分野を重点的に学習することで更なる向上が期待できます。');
  } else {
    recommendations.push('基礎からしっかりと学習し直すことをお勧めします。');
  }

  // Subject-specific recommendations
  subjects.forEach(subject => {
    if (subject.percentage < 50) {
      recommendations.push(`${subject.subject}の基礎概念の復習が必要です。`);
    } else if (subject.percentage < 70) {
      recommendations.push(`${subject.subject}の応用問題に取り組んで理解を深めましょう。`);
    }
  });

  // Topic-specific recommendations
  subjects.forEach(subject => {
    const weakTopics = subject.topics.filter((t: any) => t.percentage < 60);
    if (weakTopics.length > 0) {
      recommendations.push(`${subject.subject}の「${weakTopics.map((t: any) => t.topic).join('、')}」の分野を重点的に学習しましょう。`);
    }
  });

  return recommendations;
}

function identifyStrengthsAndWeaknesses(subjects: any[]) {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  subjects.forEach(subject => {
    if (subject.percentage >= 80) {
      strengths.push(`${subject.subject}の理解度が高く、応用問題も解けています。`);
    } else if (subject.percentage < 50) {
      weaknesses.push(`${subject.subject}の基礎的な概念の理解が不足しています。`);
    }

    // Topic-level analysis
    subject.topics.forEach((topic: any) => {
      if (topic.percentage >= 90) {
        strengths.push(`${subject.subject}の「${topic.topic}」分野は非常に良く理解できています。`);
      } else if (topic.percentage < 40) {
        weaknesses.push(`${subject.subject}の「${topic.topic}」分野の理解が不十分です。`);
      }
    });
  });

  return { strengths, weaknesses };
}

function generateNextSteps(subjects: any[], overallPercentage: number): string[] {
  const nextSteps: string[] = [];

  if (overallPercentage < 60) {
    nextSteps.push('基礎問題集から始めて、確実に理解を積み重ねましょう。');
    nextSteps.push('分からない問題があれば、すぐに解説を確認する習慣をつけましょう。');
  } else {
    nextSteps.push('応用問題にチャレンジして、より深い理解を目指しましょう。');
  }

  // Find the weakest subject
  const weakestSubject = subjects.reduce((prev, current) => 
    prev.percentage < current.percentage ? prev : current
  );

  if (weakestSubject && weakestSubject.percentage < 70) {
    nextSteps.push(`${weakestSubject.subject}の学習時間を増やし、集中的に取り組みましょう。`);
  }

  nextSteps.push('定期的に診断テストを受けて、学習の進捗を確認しましょう。');
  nextSteps.push('間違えた問題は復習ノートにまとめて、定期的に見直しましょう。');

  return nextSteps;
}

function getSubjectFromAnswer(answer: any): string | null {
  // This would typically involve looking up the question
  // For now, return a default based on difficulty range
  if (answer.difficulty <= 3) return '数学';
  if (answer.difficulty <= 6) return '国語';
  if (answer.difficulty <= 8) return '理科';
  return '社会';
}

function getTopicFromAnswer(answer: any): string | null {
  // This would typically involve looking up the question
  // For now, return a default
  return '基本計算';
}
