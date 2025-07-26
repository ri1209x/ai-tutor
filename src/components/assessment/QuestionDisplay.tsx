'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Progress } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface Question {
  id: string;
  type: 'multiple_choice' | 'text_input' | 'math_expression';
  subject: string;
  topic: string;
  difficulty: number; // 1-10
  content: string;
  options?: QuestionOption[];
  correctAnswer?: string;
  explanation?: string;
  timeLimit?: number; // seconds
}

export interface QuestionDisplayProps {
  question: Question;
  currentQuestionNumber: number;
  totalQuestions: number;
  timeRemaining?: number;
  onAnswer: (answer: string | string[]) => void;
  onNext: () => void;
  isLoading?: boolean;
  showExplanation?: boolean;
}

export const QuestionDisplay: React.FC<QuestionDisplayProps> = ({
  question,
  currentQuestionNumber,
  totalQuestions,
  timeRemaining,
  onAnswer,
  onNext,
  isLoading = false,
  showExplanation = false,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[]>('');
  const [textInput, setTextInput] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);

  useEffect(() => {
    // Reset state when question changes
    setSelectedAnswer('');
    setTextInput('');
    setHasAnswered(false);
  }, [question.id]);

  const handleMultipleChoice = (optionId: string) => {
    if (hasAnswered) return;
    
    setSelectedAnswer(optionId);
    setHasAnswered(true);
    onAnswer(optionId);
  };

  const handleTextInput = () => {
    if (hasAnswered || !textInput.trim()) return;
    
    setSelectedAnswer(textInput);
    setHasAnswered(true);
    onAnswer(textInput);
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 3) return 'text-success-600 bg-success-100';
    if (difficulty <= 6) return 'text-warning-600 bg-warning-100';
    return 'text-error-600 bg-error-100';
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 3) return '基礎';
    if (difficulty <= 6) return '標準';
    return '応用';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress and Info Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-text-muted">
            問題 {currentQuestionNumber} / {totalQuestions}
          </span>
          <div className={cn(
            'px-2 py-1 rounded-full text-xs font-medium',
            getDifficultyColor(question.difficulty)
          )}>
            {getDifficultyLabel(question.difficulty)}
          </div>
          <span className="text-sm text-text-muted">
            {question.subject} - {question.topic}
          </span>
        </div>
        
        {timeRemaining !== undefined && (
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={cn(
              'text-sm font-medium',
              timeRemaining <= 30 ? 'text-error-600' : 'text-text-secondary'
            )}>
              {formatTime(timeRemaining)}
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <Progress 
        value={(currentQuestionNumber / totalQuestions) * 100} 
        className="h-2"
      />

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {question.content}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Multiple Choice */}
          {question.type === 'multiple_choice' && question.options && (
            <div className="space-y-3">
              {question.options.map((option, index) => (
                <button
                  key={option.id}
                  onClick={() => handleMultipleChoice(option.id)}
                  disabled={hasAnswered || isLoading}
                  className={cn(
                    'w-full p-4 text-left border rounded-lg transition-all',
                    'hover:border-primary-300 hover:bg-primary-50',
                    'disabled:cursor-not-allowed',
                    selectedAnswer === option.id
                      ? showExplanation
                        ? option.isCorrect
                          ? 'border-success-500 bg-success-50'
                          : 'border-error-500 bg-error-50'
                        : 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 bg-white',
                    showExplanation && option.isCorrect && 'border-success-500 bg-success-50'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      'w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium',
                      selectedAnswer === option.id
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : 'border-gray-300'
                    )}>
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="flex-1">{option.text}</span>
                    {showExplanation && option.isCorrect && (
                      <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Text Input */}
          {question.type === 'text_input' && (
            <div className="space-y-3">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={hasAnswered || isLoading}
                placeholder="こちらに回答を入力してください..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-vertical min-h-[100px]"
              />
              <Button
                onClick={handleTextInput}
                disabled={hasAnswered || isLoading || !textInput.trim()}
                className="w-full sm:w-auto"
              >
                回答を送信
              </Button>
            </div>
          )}

          {/* Math Expression */}
          {question.type === 'math_expression' && (
            <div className="space-y-3">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={hasAnswered || isLoading}
                placeholder="数式や数値を入力してください（例: 2x + 3 = 7）"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
              />
              <div className="text-sm text-text-muted">
                ヒント: 数式は通常の数学記号を使用してください（+, -, *, /, ^, =）
              </div>
              <Button
                onClick={handleTextInput}
                disabled={hasAnswered || isLoading || !textInput.trim()}
                className="w-full sm:w-auto"
              >
                回答を送信
              </Button>
            </div>
          )}

          {/* Explanation */}
          {showExplanation && question.explanation && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">解説</h4>
              <p className="text-blue-800">{question.explanation}</p>
            </div>
          )}

          {/* Next Button */}
          {hasAnswered && (
            <div className="flex justify-end pt-4">
              <Button
                onClick={onNext}
                disabled={isLoading}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>処理中...</span>
                  </div>
                ) : (
                  '次の問題'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
