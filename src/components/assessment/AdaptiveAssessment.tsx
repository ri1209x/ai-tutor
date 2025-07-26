'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardContent, Button, Progress } from '@/components/ui';
import { QuestionDisplay, Question } from './QuestionDisplay';
import { AssessmentResults, AssessmentResult } from './AssessmentResults';
import { cn } from '@/lib/utils';

export interface AssessmentConfig {
  id: string;
  title: string;
  description: string;
  subjects: string[];
  maxQuestions: number;
  timeLimit?: number; // minutes
  difficultyRange: [number, number]; // [min, max]
  adaptiveThreshold: number; // 0-1, when to adjust difficulty
}

export interface AssessmentState {
  status: 'not_started' | 'in_progress' | 'completed' | 'error';
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  answers: Array<{
    questionId: string;
    answer: string | string[];
    isCorrect: boolean;
    timeSpent: number;
    difficulty: number;
  }>;
  startTime: Date | null;
  timeRemaining?: number;
  showExplanation: boolean;
}

export interface AdaptiveAssessmentProps {
  config: AssessmentConfig;
  onComplete?: (result: AssessmentResult) => void;
  onExit?: () => void;
}

export const AdaptiveAssessment: React.FC<AdaptiveAssessmentProps> = ({
  config,
  onComplete,
  onExit,
}) => {
  const { data: session } = useSession();
  const [state, setState] = useState<AssessmentState>({
    status: 'not_started',
    currentQuestion: null,
    currentQuestionIndex: 0,
    totalQuestions: config.maxQuestions,
    answers: [],
    startTime: null,
    showExplanation: false,
  });
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timer effect
  useEffect(() => {
    if (state.status === 'in_progress' && config.timeLimit && state.startTime) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - state.startTime!.getTime()) / 1000);
        const remaining = (config.timeLimit! * 60) - elapsed;
        
        if (remaining <= 0) {
          handleTimeUp();
        } else {
          setState(prev => ({ ...prev, timeRemaining: remaining }));
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [state.status, state.startTime, config.timeLimit]);

  const startAssessment = async () => {
    if (!session?.user?.id) {
      setError('ログインが必要です');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/assessment/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configId: config.id,
          userId: session.user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('診断テストの開始に失敗しました');
      }

      const { question } = await response.json();
      
      setState(prev => ({
        ...prev,
        status: 'in_progress',
        currentQuestion: question,
        currentQuestionIndex: 1,
        startTime: new Date(),
        timeRemaining: config.timeLimit ? config.timeLimit * 60 : undefined,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      setState(prev => ({ ...prev, status: 'error' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = useCallback(async (answer: string | string[]) => {
    if (!state.currentQuestion || !session?.user?.id) return;

    setIsLoading(true);
    const answerStartTime = Date.now();

    try {
      const response = await fetch('/api/assessment/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: state.currentQuestion.id,
          answer,
          userId: session.user.id,
          timeSpent: Math.floor((answerStartTime - (state.startTime?.getTime() || 0)) / 1000),
        }),
      });

      if (!response.ok) {
        throw new Error('回答の送信に失敗しました');
      }

      const { isCorrect, explanation } = await response.json();
      
      const newAnswer = {
        questionId: state.currentQuestion.id,
        answer,
        isCorrect,
        timeSpent: Math.floor((Date.now() - answerStartTime) / 1000),
        difficulty: state.currentQuestion.difficulty,
      };

      setState(prev => ({
        ...prev,
        answers: [...prev.answers, newAnswer],
        showExplanation: !!explanation,
        currentQuestion: explanation ? { ...prev.currentQuestion!, explanation } : prev.currentQuestion,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '回答の処理に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [state.currentQuestion, state.startTime, session?.user?.id]);

  const handleNext = useCallback(async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);

    try {
      // Check if assessment is complete
      if (state.currentQuestionIndex >= state.totalQuestions) {
        await completeAssessment();
        return;
      }

      // Get next question
      const response = await fetch('/api/assessment/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          currentAnswers: state.answers,
          configId: config.id,
        }),
      });

      if (!response.ok) {
        throw new Error('次の問題の取得に失敗しました');
      }

      const { question, isComplete } = await response.json();

      if (isComplete) {
        await completeAssessment();
      } else {
        setState(prev => ({
          ...prev,
          currentQuestion: question,
          currentQuestionIndex: prev.currentQuestionIndex + 1,
          showExplanation: false,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '次の問題の処理に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [state.currentQuestionIndex, state.totalQuestions, state.answers, session?.user?.id, config.id]);

  const completeAssessment = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/assessment/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          answers: state.answers,
          configId: config.id,
          timeSpent: state.startTime ? Math.floor((Date.now() - state.startTime.getTime()) / 1000) : 0,
        }),
      });

      if (!response.ok) {
        throw new Error('診断結果の生成に失敗しました');
      }

      const assessmentResult = await response.json();
      setResult(assessmentResult);
      setState(prev => ({ ...prev, status: 'completed' }));
      
      if (onComplete) {
        onComplete(assessmentResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '診断結果の処理に失敗しました');
      setState(prev => ({ ...prev, status: 'error' }));
    }
  };

  const handleTimeUp = () => {
    setState(prev => ({ ...prev, timeRemaining: 0 }));
    completeAssessment();
  };

  const handleRetake = () => {
    setState({
      status: 'not_started',
      currentQuestion: null,
      currentQuestionIndex: 0,
      totalQuestions: config.maxQuestions,
      answers: [],
      startTime: null,
      showExplanation: false,
    });
    setResult(null);
    setError(null);
  };

  // Render different states
  if (state.status === 'completed' && result) {
    return (
      <AssessmentResults
        result={result}
        onRetakeTest={handleRetake}
        onViewRecommendations={() => {
          // Navigate to recommendations page
          window.location.href = `/dashboard/learner/recommendations?assessmentId=${result.id}`;
        }}
      />
    );
  }

  if (state.status === 'error') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-error-600">エラーが発生しました</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-text-muted">{error}</p>
          <div className="flex space-x-4">
            <Button onClick={handleRetake} variant="outline">
              最初からやり直す
            </Button>
            {onExit && (
              <Button onClick={onExit} variant="outline">
                終了
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.status === 'in_progress' && state.currentQuestion) {
    return (
      <div className="space-y-4">
        {/* Exit Button */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{config.title}</h1>
          {onExit && (
            <Button onClick={onExit} variant="outline" size="sm">
              終了
            </Button>
          )}
        </div>

        <QuestionDisplay
          question={state.currentQuestion}
          currentQuestionNumber={state.currentQuestionIndex}
          totalQuestions={state.totalQuestions}
          timeRemaining={state.timeRemaining}
          onAnswer={handleAnswer}
          onNext={handleNext}
          isLoading={isLoading}
          showExplanation={state.showExplanation}
        />
      </div>
    );
  }

  // Initial state - not started
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">{config.title}</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <p className="text-text-muted">{config.description}</p>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">診断科目</h3>
              <div className="flex flex-wrap gap-2">
                {config.subjects.map((subject) => (
                  <span
                    key={subject}
                    className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">テスト詳細</h3>
              <ul className="text-sm text-text-muted space-y-1">
                <li>問題数: 最大 {config.maxQuestions} 問</li>
                {config.timeLimit && (
                  <li>制限時間: {config.timeLimit} 分</li>
                )}
                <li>難易度: 適応的調整</li>
              </ul>
            </div>
          </div>
          
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">診断テストについて</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• あなたの回答に基づいて問題の難易度が調整されます</li>
              <li>• 正確な診断のため、推測ではなく知識に基づいて回答してください</li>
              <li>• 途中で終了することも可能です</li>
              <li>• 結果に基づいて個別の学習プランを提案します</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={startAssessment}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>準備中...</span>
              </div>
            ) : (
              '診断テストを開始'
            )}
          </Button>
          
          {onExit && (
            <Button onClick={onExit} variant="outline">
              キャンセル
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
