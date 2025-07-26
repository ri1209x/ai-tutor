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

    const { userId, answers, scores } = await request.json();

    if (!userId || !answers || !scores) {
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

    // Determine primary and secondary learning styles
    const sortedStyles = Object.entries(scores)
      .map(([style, score]) => ({ style, score: score as number }))
      .sort((a, b) => b.score - a.score);

    const primaryStyle = sortedStyles[0].style.toUpperCase() as 'VISUAL' | 'AUDITORY' | 'KINESTHETIC' | 'READING';
    const secondaryStyle = sortedStyles[1]?.score > 0 
      ? sortedStyles[1].style.toUpperCase() as 'VISUAL' | 'AUDITORY' | 'KINESTHETIC' | 'READING'
      : undefined;

    // Generate recommendations based on learning style
    const recommendations = generateRecommendations(primaryStyle, secondaryStyle, scores);
    const studyTips = generateStudyTips(primaryStyle);

    // Save learning style assessment result
    const learningStyleResult = await prisma.learningStyleResult.create({
      data: {
        userId,
        visualScore: scores.visual,
        auditoryScore: scores.auditory,
        kinestheticScore: scores.kinesthetic,
        readingScore: scores.reading,
        primaryStyle,
        secondaryStyle,
        answers: JSON.stringify(answers),
        recommendations: JSON.stringify(recommendations),
        studyTips: JSON.stringify(studyTips),
        completedAt: new Date(),
      },
    });

    // Update user's learning style if this is their first assessment or scores are significantly different
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { learningStyle: true },
    });

    if (!existingUser?.learningStyle) {
      await prisma.user.update({
        where: { id: userId },
        data: { learningStyle: primaryStyle },
      });
    }

    // Format response
    const result = {
      id: learningStyleResult.id,
      userId,
      scores: {
        visual: scores.visual,
        auditory: scores.auditory,
        kinesthetic: scores.kinesthetic,
        reading: scores.reading,
      },
      primaryStyle,
      secondaryStyle,
      recommendations,
      studyTips,
      completedAt: learningStyleResult.completedAt,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Learning style assessment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateRecommendations(
  primaryStyle: string,
  secondaryStyle?: string,
  scores?: any
): string[] {
  const recommendations: string[] = [];

  switch (primaryStyle) {
    case 'VISUAL':
      recommendations.push('図表やマインドマップを積極的に活用した学習を心がけましょう。');
      recommendations.push('カラーペンやマーカーを使って重要な部分を色分けして覚えましょう。');
      recommendations.push('動画や映像教材を活用して視覚的に理解を深めましょう。');
      break;
    
    case 'AUDITORY':
      recommendations.push('音読や復唱を取り入れて、声に出して学習しましょう。');
      recommendations.push('録音機能を活用して、重要な内容を繰り返し聞きましょう。');
      recommendations.push('グループディスカッションや説明練習を積極的に行いましょう。');
      break;
    
    case 'KINESTHETIC':
      recommendations.push('実際に手を動かして書いたり、作ったりしながら学習しましょう。');
      recommendations.push('歩きながらや体を動かしながらの学習を取り入れましょう。');
      recommendations.push('実験や実習など、体験型の学習機会を積極的に活用しましょう。');
      break;
    
    case 'READING':
      recommendations.push('詳細なノート作成と要約を習慣にしましょう。');
      recommendations.push('静かで集中できる環境での学習時間を確保しましょう。');
      recommendations.push('参考書や専門書を活用した深い学習を心がけましょう。');
      break;
  }

  // Add secondary style recommendations
  if (secondaryStyle && secondaryStyle !== primaryStyle) {
    recommendations.push(`副次的な学習スタイル（${getStyleName(secondaryStyle)}）の方法も組み合わせることで、より効果的な学習が期待できます。`);
  }

  // Add balanced approach recommendation
  if (scores) {
    const maxScore = Math.max(...Object.values(scores) as number[]);
    const minScore = Math.min(...Object.values(scores) as number[]);
    if (maxScore - minScore < 3) {
      recommendations.push('複数の学習スタイルがバランス良く発達しているため、様々な学習方法を組み合わせることをお勧めします。');
    }
  }

  return recommendations;
}

function generateStudyTips(primaryStyle: string): string[] {
  const tips: string[] = [];

  switch (primaryStyle) {
    case 'VISUAL':
      tips.push('学習内容を図解やフローチャートで整理する');
      tips.push('重要なポイントを色分けして視覚的に区別する');
      tips.push('イメージや絵と関連付けて記憶する');
      tips.push('プレゼンテーション形式で学習内容をまとめる');
      break;
    
    case 'AUDITORY':
      tips.push('学習内容を音読して耳で確認する');
      tips.push('重要な部分を録音して繰り返し聞く');
      tips.push('リズムや歌に合わせて暗記する');
      tips.push('他人に説明することで理解を深める');
      break;
    
    case 'KINESTHETIC':
      tips.push('手を動かしてノートを取りながら学習する');
      tips.push('立ち上がったり歩いたりしながら復習する');
      tips.push('実物や模型を使って理解を深める');
      tips.push('身振り手振りを使って覚える');
      break;
    
    case 'READING':
      tips.push('重要な内容を文章でまとめて整理する');
      tips.push('静かな環境で集中して読書する');
      tips.push('論理的な構造を意識して学習する');
      tips.push('詳細なメモや要約を作成する');
      break;
  }

  return tips;
}

function getStyleName(style: string): string {
  switch (style) {
    case 'VISUAL': return '視覚型';
    case 'AUDITORY': return '聴覚型';
    case 'KINESTHETIC': return '体験型';
    case 'READING': return '読書型';
    default: return style;
  }
}
