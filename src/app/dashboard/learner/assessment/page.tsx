'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout';
import { AdaptiveAssessment, AssessmentConfig, AssessmentResult } from '@/components/assessment';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { useRouter } from 'next/navigation';

const assessmentConfigs: AssessmentConfig[] = [
  {
    id: 'math_basic',
    title: '数学基礎診断テスト',
    description: '基本的な数学の理解度を診断します。計算、分数、小数、図形などの基礎概念を評価します。',
    subjects: ['数学'],
    maxQuestions: 20,
    timeLimit: 30, // 30分
    difficultyRange: [1, 8],
    adaptiveThreshold: 0.8,
  },
  {
    id: 'comprehensive',
    title: '総合学力診断テスト',
    description: '数学、国語、理科、社会の総合的な学力を診断します。各科目の基礎から応用まで幅広く評価します。',
    subjects: ['数学', '国語', '理科', '社会'],
    maxQuestions: 40,
    timeLimit: 60, // 60分
    difficultyRange: [1, 10],
    adaptiveThreshold: 0.75,
  },
  {
    id: 'reading_comprehension',
    title: '読解力診断テスト',
    description: '文章読解力と国語の理解度を重点的に診断します。語彙力、文法、読解問題を中心に評価します。',
    subjects: ['国語'],
    maxQuestions: 25,
    timeLimit: 45, // 45分
    difficultyRange: [1, 9],
    adaptiveThreshold: 0.8,
  },
];

export default function AssessmentPage() {
  const [selectedConfig, setSelectedConfig] = useState<AssessmentConfig | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const router = useRouter();

  const handleSelectAssessment = (config: AssessmentConfig) => {
    setSelectedConfig(config);
    setIsStarted(true);
  };

  const handleAssessmentComplete = (result: AssessmentResult) => {
    // Navigate to results page or show results
    console.log('Assessment completed:', result);
    // You could navigate to a dedicated results page
    // router.push(`/dashboard/learner/assessment/results/${result.id}`);
  };

  const handleExit = () => {
    setSelectedConfig(null);
    setIsStarted(false);
  };

  const getDifficultyLabel = (range: [number, number]) => {
    const [min, max] = range;
    if (max <= 4) return '基礎レベル';
    if (max <= 7) return '標準レベル';
    return '応用レベル';
  };

  const getTimeLabel = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}時間${mins}分` : `${hours}時間`;
    }
    return `${minutes}分`;
  };

  if (isStarted && selectedConfig) {
    return (
      <DashboardLayout>
        <AdaptiveAssessment
          config={selectedConfig}
          onComplete={handleAssessmentComplete}
          onExit={handleExit}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">学習診断テスト</h1>
            <p className="text-text-muted mt-2">
              あなたの学習レベルを診断し、最適な学習プランを提案します
            </p>
          </div>
          <Button
            onClick={() => router.push('/dashboard/learner')}
            variant="outline"
          >
            ダッシュボードに戻る
          </Button>
        </div>

        {/* Assessment Options */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {assessmentConfigs.map((config) => (
            <Card key={config.id} className="h-full">
              <CardHeader>
                <CardTitle className="text-xl">{config.title}</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-text-muted text-sm leading-relaxed">
                  {config.description}
                </p>
                
                <div className="space-y-3">
                  {/* Subjects */}
                  <div>
                    <h4 className="font-medium text-sm text-text-secondary mb-2">対象科目</h4>
                    <div className="flex flex-wrap gap-2">
                      {config.subjects.map((subject) => (
                        <span
                          key={subject}
                          className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs"
                        >
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Test Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-text-muted">問題数:</span>
                      <span className="ml-2 font-medium">{config.maxQuestions}問</span>
                    </div>
                    <div>
                      <span className="text-text-muted">制限時間:</span>
                      <span className="ml-2 font-medium">
                        {config.timeLimit ? getTimeLabel(config.timeLimit) : '無制限'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-text-muted">難易度:</span>
                      <span className="ml-2 font-medium">
                        {getDifficultyLabel(config.difficultyRange)}
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="pt-2 border-t border-gray-200">
                    <ul className="text-xs text-text-muted space-y-1">
                      <li className="flex items-center space-x-2">
                        <svg className="w-3 h-3 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>適応的難易度調整</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <svg className="w-3 h-3 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>詳細な分析結果</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <svg className="w-3 h-3 text-success-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>個別学習プラン提案</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <Button
                  onClick={() => handleSelectAssessment(config)}
                  className="w-full mt-4"
                >
                  このテストを開始
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Information Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>診断テストについて</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">適応的診断システム</h4>
                <ul className="text-sm text-text-muted space-y-2">
                  <li>• あなたの回答に基づいて問題の難易度が自動調整されます</li>
                  <li>• 正答率が高い場合は、より難しい問題が出題されます</li>
                  <li>• 苦手分野を特定し、重点的に診断を行います</li>
                  <li>• 効率的に学習レベルを測定できます</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">診断結果の活用</h4>
                <ul className="text-sm text-text-muted space-y-2">
                  <li>• 科目別・分野別の詳細な分析結果を提供</li>
                  <li>• 得意分野と苦手分野を明確に識別</li>
                  <li>• 個別の学習プランと推奨事項を提案</li>
                  <li>• 定期的な再診断で学習進捗を追跡</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">診断テストのコツ</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 推測ではなく、確実に知っている知識で回答してください</li>
                <li>• 分からない問題は素直に「分からない」を選択してください</li>
                <li>• 時間に余裕を持って、落ち着いて取り組んでください</li>
                <li>• 途中で疲れた場合は、一時停止して休憩を取ることができます</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
