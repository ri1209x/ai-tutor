'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Progress, Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface SubjectScore {
  subject: string;
  score: number;
  maxScore: number;
  percentage: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  topics: TopicScore[];
}

export interface TopicScore {
  topic: string;
  score: number;
  maxScore: number;
  percentage: number;
  questionsAnswered: number;
  correctAnswers: number;
}

export interface AssessmentResult {
  id: string;
  userId: string;
  overallScore: number;
  overallPercentage: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // seconds
  subjects: SubjectScore[];
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
  nextSteps: string[];
  completedAt: Date;
}

export interface AssessmentResultsProps {
  result: AssessmentResult;
  onRetakeTest?: () => void;
  onViewRecommendations?: () => void;
}

export const AssessmentResults: React.FC<AssessmentResultsProps> = ({
  result,
  onRetakeTest,
  onViewRecommendations,
}) => {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-blue-100 text-blue-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'beginner':
        return '基礎';
      case 'intermediate':
        return '標準';
      case 'advanced':
        return '応用';
      default:
        return '未評価';
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-success-600';
    if (percentage >= 60) return 'text-warning-600';
    return 'text-error-600';
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}時間${minutes}分${secs}秒`;
    }
    if (minutes > 0) {
      return `${minutes}分${secs}秒`;
    }
    return `${secs}秒`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Overall Results Header */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">診断テスト結果</CardTitle>
          <p className="text-text-muted">
            {new Date(result.completedAt).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })} に完了
          </p>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Overall Score */}
            <div className="text-center">
              <div className={cn(
                'text-4xl font-bold mb-2',
                getScoreColor(result.overallPercentage)
              )}>
                {result.overallPercentage.toFixed(1)}%
              </div>
              <p className="text-sm text-text-muted">総合スコア</p>
              <p className="text-xs text-text-muted">
                {result.correctAnswers} / {result.totalQuestions} 問正解
              </p>
            </div>

            {/* Time Spent */}
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary mb-2">
                {formatTime(result.timeSpent)}
              </div>
              <p className="text-sm text-text-muted">所要時間</p>
              <p className="text-xs text-text-muted">
                平均 {Math.round(result.timeSpent / result.totalQuestions)}秒/問
              </p>
            </div>

            {/* Subjects Count */}
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary mb-2">
                {result.subjects.length}
              </div>
              <p className="text-sm text-text-muted">診断科目数</p>
              <p className="text-xs text-text-muted">
                {result.subjects.filter(s => s.percentage >= 70).length} 科目で良好
              </p>
            </div>

            {/* Recommendations */}
            <div className="text-center">
              <div className="text-2xl font-bold text-text-primary mb-2">
                {result.recommendations.length}
              </div>
              <p className="text-sm text-text-muted">推奨事項</p>
              <p className="text-xs text-text-muted">
                個別学習プラン
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>科目別結果</CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-6">
            {result.subjects.map((subject) => (
              <div key={subject.subject} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-medium text-lg">{subject.subject}</h3>
                    <Badge className={getLevelColor(subject.level)}>
                      {getLevelLabel(subject.level)}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      'text-xl font-bold',
                      getScoreColor(subject.percentage)
                    )}>
                      {subject.percentage.toFixed(1)}%
                    </div>
                    <div className="text-sm text-text-muted">
                      {subject.score} / {subject.maxScore} 点
                    </div>
                  </div>
                </div>
                
                <Progress 
                  value={subject.percentage} 
                  className="h-3"
                />
                
                {/* Topic Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                  {subject.topics.map((topic) => (
                    <div key={topic.topic} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm">{topic.topic}</h4>
                        <span className={cn(
                          'text-sm font-medium',
                          getScoreColor(topic.percentage)
                        )}>
                          {topic.percentage.toFixed(0)}%
                        </span>
                      </div>
                      <Progress 
                        value={topic.percentage} 
                        className="h-2 mb-2"
                      />
                      <p className="text-xs text-text-muted">
                        {topic.correctAnswers} / {topic.questionsAnswered} 問正解
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strengths and Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strengths */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>得意分野</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.strengths.map((strength, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-success-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Weaknesses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-warning-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>改善点</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.weaknesses.map((weakness, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-warning-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm">{weakness}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations and Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>学習推奨事項</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {result.recommendations.map((recommendation, index) => (
              <div key={index} className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                <p className="text-sm">{recommendation}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-6">
            <h4 className="font-medium mb-3">次のステップ</h4>
            <ol className="space-y-2">
              {result.nextSteps.map((step, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="text-sm">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {onViewRecommendations && (
          <button
            onClick={onViewRecommendations}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            個別学習プランを見る
          </button>
        )}
        {onRetakeTest && (
          <button
            onClick={onRetakeTest}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            診断テストを再受験
          </button>
        )}
      </div>
    </div>
  );
};
