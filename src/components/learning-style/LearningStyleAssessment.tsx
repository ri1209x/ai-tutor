'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardContent, Button, Progress } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface LearningStyleQuestion {
  id: string;
  question: string;
  options: {
    id: string;
    text: string;
    style: 'VISUAL' | 'AUDITORY' | 'KINESTHETIC' | 'READING';
    weight: number;
  }[];
  category: string;
  scenario?: string;
}

export interface LearningStyleResult {
  id: string;
  userId: string;
  scores: {
    visual: number;
    auditory: number;
    kinesthetic: number;
    reading: number;
  };
  primaryStyle: 'VISUAL' | 'AUDITORY' | 'KINESTHETIC' | 'READING';
  secondaryStyle?: 'VISUAL' | 'AUDITORY' | 'KINESTHETIC' | 'READING';
  recommendations: string[];
  studyTips: string[];
  completedAt: Date;
}

export interface LearningStyleAssessmentProps {
  onComplete?: (result: LearningStyleResult) => void;
  onExit?: () => void;
}

const learningStyleQuestions: LearningStyleQuestion[] = [
  {
    id: 'q1',
    question: '新しい情報を学ぶとき、どの方法が最も効果的ですか？',
    category: '学習方法',
    options: [
      { id: 'a', text: '図表やグラフを見る', style: 'VISUAL', weight: 3 },
      { id: 'b', text: '説明を聞く', style: 'AUDITORY', weight: 3 },
      { id: 'c', text: '実際に手を動かして試す', style: 'KINESTHETIC', weight: 3 },
      { id: 'd', text: 'テキストを読む', style: 'READING', weight: 3 },
    ],
  },
  {
    id: 'q2',
    question: '授業中、最も集中できるのはどのような状況ですか？',
    category: '学習環境',
    options: [
      { id: 'a', text: 'カラフルな資料や映像がある', style: 'VISUAL', weight: 2 },
      { id: 'b', text: '先生の話し方が明瞭で聞きやすい', style: 'AUDITORY', weight: 2 },
      { id: 'c', text: '体を動かしたり、物に触れたりできる', style: 'KINESTHETIC', weight: 2 },
      { id: 'd', text: '静かで集中して読書できる', style: 'READING', weight: 2 },
    ],
  },
  {
    id: 'q3',
    question: '道順を覚えるとき、どの方法を使いますか？',
    category: '記憶方法',
    scenario: '初めて行く場所への道順を覚える場面を想像してください。',
    options: [
      { id: 'a', text: '地図を見て視覚的に覚える', style: 'VISUAL', weight: 3 },
      { id: 'b', text: '誰かに説明してもらう', style: 'AUDITORY', weight: 3 },
      { id: 'c', text: '実際に歩いて体で覚える', style: 'KINESTHETIC', weight: 3 },
      { id: 'd', text: '文字で書かれた案内を読む', style: 'READING', weight: 3 },
    ],
  },
  {
    id: 'q4',
    question: '問題を解くとき、どのようにアプローチしますか？',
    category: '問題解決',
    options: [
      { id: 'a', text: '図や絵を描いて整理する', style: 'VISUAL', weight: 2 },
      { id: 'b', text: '声に出して考える', style: 'AUDITORY', weight: 2 },
      { id: 'c', text: '実際に試行錯誤してみる', style: 'KINESTHETIC', weight: 2 },
      { id: 'd', text: 'ノートに文字で整理する', style: 'READING', weight: 2 },
    ],
  },
  {
    id: 'q5',
    question: '休憩時間に最もリラックスできる活動は？',
    category: 'リラックス方法',
    options: [
      { id: 'a', text: '景色を眺める、絵を見る', style: 'VISUAL', weight: 1 },
      { id: 'b', text: '音楽を聞く、友達と話す', style: 'AUDITORY', weight: 1 },
      { id: 'c', text: '散歩する、ストレッチする', style: 'KINESTHETIC', weight: 1 },
      { id: 'd', text: '本や雑誌を読む', style: 'READING', weight: 1 },
    ],
  },
  {
    id: 'q6',
    question: '新しい単語を覚えるとき、どの方法が効果的ですか？',
    category: '記憶方法',
    options: [
      { id: 'a', text: '単語カードや色分けして覚える', style: 'VISUAL', weight: 3 },
      { id: 'b', text: '声に出して読む、歌にする', style: 'AUDITORY', weight: 3 },
      { id: 'c', text: '身振り手振りで表現する', style: 'KINESTHETIC', weight: 3 },
      { id: 'd', text: '何度も書いて覚える', style: 'READING', weight: 3 },
    ],
  },
  {
    id: 'q7',
    question: 'グループ学習で最も貢献できる役割は？',
    category: 'グループ学習',
    options: [
      { id: 'a', text: '図表やプレゼン資料を作成する', style: 'VISUAL', weight: 2 },
      { id: 'b', text: '発表や説明を担当する', style: 'AUDITORY', weight: 2 },
      { id: 'c', text: '実験や実習をリードする', style: 'KINESTHETIC', weight: 2 },
      { id: 'd', text: '資料をまとめ、レポートを書く', style: 'READING', weight: 2 },
    ],
  },
  {
    id: 'q8',
    question: '集中力が最も高まる学習環境は？',
    category: '学習環境',
    options: [
      { id: 'a', text: '明るく、整理整頓された空間', style: 'VISUAL', weight: 2 },
      { id: 'b', text: '適度な雑音や音楽がある環境', style: 'AUDITORY', weight: 2 },
      { id: 'c', text: '自由に動き回れる空間', style: 'KINESTHETIC', weight: 2 },
      { id: 'd', text: '静かで落ち着いた図書館のような環境', style: 'READING', weight: 2 },
    ],
  },
];

export const LearningStyleAssessment: React.FC<LearningStyleAssessmentProps> = ({
  onComplete,
  onExit,
}) => {
  const { data: session } = useSession();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LearningStyleResult | null>(null);

  const currentQuestion = learningStyleQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === learningStyleQuestions.length - 1;
  const progress = ((currentQuestionIndex + 1) / learningStyleQuestions.length) * 100;

  const handleAnswer = (optionId: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionId,
    }));
  };

  const handleNext = () => {
    if (isLastQuestion) {
      handleComplete();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);

    try {
      // Calculate scores
      const scores = calculateLearningStyleScores(answers);
      
      // Send to API
      const response = await fetch('/api/learning-style/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          answers,
          scores,
        }),
      });

      if (!response.ok) {
        throw new Error('診断結果の保存に失敗しました');
      }

      const assessmentResult = await response.json();
      setResult(assessmentResult);
      
      if (onComplete) {
        onComplete(assessmentResult);
      }
    } catch (error) {
      console.error('Learning style assessment error:', error);
      // Handle error - for now, show local result
      const localResult = generateLocalResult(answers);
      setResult(localResult);
      if (onComplete) {
        onComplete(localResult);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const calculateLearningStyleScores = (answers: Record<string, string>) => {
    const scores = {
      visual: 0,
      auditory: 0,
      kinesthetic: 0,
      reading: 0,
    };

    Object.entries(answers).forEach(([questionId, optionId]) => {
      const question = learningStyleQuestions.find(q => q.id === questionId);
      const option = question?.options.find(o => o.id === optionId);
      
      if (option) {
        const styleKey = option.style.toLowerCase() as keyof typeof scores;
        scores[styleKey] += option.weight;
      }
    });

    return scores;
  };

  const generateLocalResult = (answers: Record<string, string>): LearningStyleResult => {
    const scores = calculateLearningStyleScores(answers);
    const maxScore = Math.max(...Object.values(scores));
    const primaryStyle = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0].toUpperCase() as LearningStyleResult['primaryStyle'];
    
    return {
      id: 'local-' + Date.now(),
      userId: session?.user?.id || '',
      scores,
      primaryStyle,
      recommendations: [],
      studyTips: [],
      completedAt: new Date(),
    };
  };

  const getStyleIcon = (style: string) => {
    switch (style) {
      case 'VISUAL':
        return '👁️';
      case 'AUDITORY':
        return '👂';
      case 'KINESTHETIC':
        return '🤲';
      case 'READING':
        return '📚';
      default:
        return '🎯';
    }
  };

  const getStyleColor = (style: string) => {
    switch (style) {
      case 'VISUAL':
        return 'text-blue-600 bg-blue-100';
      case 'AUDITORY':
        return 'text-green-600 bg-green-100';
      case 'KINESTHETIC':
        return 'text-orange-600 bg-orange-100';
      case 'READING':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (result) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">学習スタイル診断結果</CardTitle>
            <p className="text-text-muted">あなたの学習スタイルが判明しました！</p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Primary Style */}
            <div className="text-center">
              <div className="text-6xl mb-4">
                {getStyleIcon(result.primaryStyle)}
              </div>
              <h3 className="text-2xl font-bold mb-2">
                あなたの主な学習スタイル
              </h3>
              <div className={cn(
                'inline-block px-4 py-2 rounded-full text-lg font-medium',
                getStyleColor(result.primaryStyle)
              )}>
                {result.primaryStyle === 'VISUAL' && '視覚型学習者'}
                {result.primaryStyle === 'AUDITORY' && '聴覚型学習者'}
                {result.primaryStyle === 'KINESTHETIC' && '体験型学習者'}
                {result.primaryStyle === 'READING' && '読書型学習者'}
              </div>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(result.scores).map(([style, score]) => (
                <div key={style} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl mb-2">
                    {getStyleIcon(style.toUpperCase())}
                  </div>
                  <div className="font-medium text-sm text-text-muted mb-1">
                    {style === 'visual' && '視覚型'}
                    {style === 'auditory' && '聴覚型'}
                    {style === 'kinesthetic' && '体験型'}
                    {style === 'reading' && '読書型'}
                  </div>
                  <div className="text-xl font-bold">{score}点</div>
                </div>
              ))}
            </div>

            <div className="flex justify-center space-x-4">
              <Button onClick={() => setResult(null)}>
                もう一度診断する
              </Button>
              {onExit && (
                <Button onClick={onExit} variant="outline">
                  完了
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-text-muted">
          <span>質問 {currentQuestionIndex + 1} / {learningStyleQuestions.length}</span>
          <span>{Math.round(progress)}% 完了</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="text-sm text-text-muted mb-2">
            {currentQuestion.category}
          </div>
          <CardTitle className="text-xl">
            {currentQuestion.question}
          </CardTitle>
          {currentQuestion.scenario && (
            <p className="text-text-muted text-sm mt-2">
              {currentQuestion.scenario}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleAnswer(option.id)}
                className={cn(
                  'w-full p-4 text-left border rounded-lg transition-all',
                  'hover:border-primary-300 hover:bg-primary-50',
                  answers[currentQuestion.id] === option.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-white'
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium',
                    answers[currentQuestion.id] === option.id
                      ? 'border-primary-500 bg-primary-500 text-white'
                      : 'border-gray-300'
                  )}>
                    {String.fromCharCode(97 + currentQuestion.options.indexOf(option))}
                  </div>
                  <span className="flex-1">{option.text}</span>
                  <div className={cn(
                    'text-xs px-2 py-1 rounded',
                    getStyleColor(option.style)
                  )}>
                    {getStyleIcon(option.style)}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <Button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              variant="outline"
            >
              前の質問
            </Button>
            
            <Button
              onClick={handleNext}
              disabled={!answers[currentQuestion.id] || isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>処理中...</span>
                </div>
              ) : isLastQuestion ? (
                '診断完了'
              ) : (
                '次の質問'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Exit Button */}
      {onExit && (
        <div className="text-center">
          <Button onClick={onExit} variant="outline" size="sm">
            診断を中止
          </Button>
        </div>
      )}
    </div>
  );
};
