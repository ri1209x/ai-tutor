'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardLayout } from '@/components/layout';
import { LearningStyleAssessment, LearningStyleResults, LearningStyleResult } from '@/components/learning-style';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { useRouter } from 'next/navigation';

export default function LearningStylePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [currentView, setCurrentView] = useState<'intro' | 'assessment' | 'results'>('intro');
  const [assessmentResult, setAssessmentResult] = useState<LearningStyleResult | null>(null);
  const [previousResults, setPreviousResults] = useState<LearningStyleResult[]>([]);
  const [currentLearningStyle, setCurrentLearningStyle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      loadPreviousResults();
    }
  }, [session?.user?.id]);

  const loadPreviousResults = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/learning-style/history?userId=${session.user.id}`);
      if (response.ok) {
        const results = await response.json();
        setPreviousResults(results);
        // Set current learning style from most recent result
        if (results.length > 0) {
          setCurrentLearningStyle(results[0].primaryStyle);
        }
      }
    } catch (error) {
      console.error('Failed to load previous results:', error);
    }
  };

  const handleStartAssessment = () => {
    setCurrentView('assessment');
  };

  const handleAssessmentComplete = (result: LearningStyleResult) => {
    setAssessmentResult(result);
    setCurrentView('results');
    loadPreviousResults(); // Reload to include new result
  };

  const handleRetakeAssessment = () => {
    setAssessmentResult(null);
    setCurrentView('assessment');
  };

  const handleViewPreviousResult = (result: LearningStyleResult) => {
    setAssessmentResult(result);
    setCurrentView('results');
  };

  const handleExit = () => {
    setCurrentView('intro');
    setAssessmentResult(null);
  };

  const getStyleIcon = (style: string) => {
    switch (style) {
      case 'VISUAL': return '👁️';
      case 'AUDITORY': return '👂';
      case 'KINESTHETIC': return '🤲';
      case 'READING': return '📚';
      default: return '🎯';
    }
  };

  const getStyleName = (style: string) => {
    switch (style) {
      case 'VISUAL': return '視覚型';
      case 'AUDITORY': return '聴覚型';
      case 'KINESTHETIC': return '体験型';
      case 'READING': return '読書型';
      default: return style;
    }
  };

  const getStyleColor = (style: string) => {
    switch (style) {
      case 'VISUAL': return 'text-blue-600 bg-blue-100';
      case 'AUDITORY': return 'text-green-600 bg-green-100';
      case 'KINESTHETIC': return 'text-orange-600 bg-orange-100';
      case 'READING': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (currentView === 'assessment') {
    return (
      <DashboardLayout>
        <LearningStyleAssessment
          onComplete={handleAssessmentComplete}
          onExit={handleExit}
        />
      </DashboardLayout>
    );
  }

  if (currentView === 'results' && assessmentResult) {
    return (
      <DashboardLayout>
        <LearningStyleResults
          result={assessmentResult}
          onRetake={handleRetakeAssessment}
          onViewRecommendations={() => {
            router.push(`/dashboard/learner/recommendations?learningStyleId=${assessmentResult.id}`);
          }}
        />
      </DashboardLayout>
    );
  }

  // Intro view
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">学習スタイル診断</h1>
            <p className="text-text-muted mt-2">
              あなたに最適な学習方法を見つけましょう
            </p>
          </div>
          <Button
            onClick={() => router.push('/dashboard/learner')}
            variant="outline"
          >
            ダッシュボードに戻る
          </Button>
        </div>

        {/* Current Learning Style (if available) */}
        {currentLearningStyle && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="text-2xl">{getStyleIcon(currentLearningStyle)}</span>
                <span>現在の学習スタイル</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className={`px-4 py-2 rounded-full font-medium ${getStyleColor(currentLearningStyle)}`}>
                  {getStyleName(currentLearningStyle)}
                </div>
                <p className="text-text-muted">
                  最後の診断結果に基づく主要な学習スタイルです
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assessment Introduction */}
        <Card>
          <CardHeader>
            <CardTitle>学習スタイル診断について</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-text-muted">
              学習スタイル診断では、あなたがどのような方法で最も効果的に学習できるかを分析します。
              8つの質問に答えることで、4つの学習スタイルのうち、あなたに最も適したものを特定します。
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <div className="text-3xl mb-2">👁️</div>
                <h3 className="font-medium mb-1">視覚型</h3>
                <p className="text-sm text-text-muted">図表や映像で学習</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-3xl mb-2">👂</div>
                <h3 className="font-medium mb-1">聴覚型</h3>
                <p className="text-sm text-text-muted">音声や会話で学習</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-3xl mb-2">🤲</div>
                <h3 className="font-medium mb-1">体験型</h3>
                <p className="text-sm text-text-muted">実践や体験で学習</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-3xl mb-2">📚</div>
                <h3 className="font-medium mb-1">読書型</h3>
                <p className="text-sm text-text-muted">読み書きで学習</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">診断の特徴</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 所要時間：約5-10分</li>
                <li>• 8つの質問に答えるだけ</li>
                <li>• 個別の学習方法を推奨</li>
                <li>• 診断履歴を保存・追跡</li>
              </ul>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleStartAssessment}
                size="lg"
                className="px-8 py-3"
              >
                診断を開始する
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Previous Results */}
        {previousResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>過去の診断結果</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {previousResults.slice(0, 5).map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">
                        {getStyleIcon(result.primaryStyle)}
                      </div>
                      <div>
                        <div className="font-medium">
                          {getStyleName(result.primaryStyle)}
                        </div>
                        <div className="text-sm text-text-muted">
                          {new Date(result.completedAt).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleViewPreviousResult(result)}
                      variant="outline"
                      size="sm"
                    >
                      詳細を見る
                    </Button>
                  </div>
                ))}
                {previousResults.length > 5 && (
                  <div className="text-center pt-2">
                    <Button variant="outline" size="sm">
                      すべての履歴を見る ({previousResults.length}件)
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle>学習スタイル診断の効果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">学習効率の向上</h4>
                <ul className="text-sm text-text-muted space-y-2">
                  <li>• 自分に合った学習方法を発見</li>
                  <li>• 記憶定着率の向上</li>
                  <li>• 学習時間の短縮</li>
                  <li>• モチベーションの維持</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">個別最適化</h4>
                <ul className="text-sm text-text-muted space-y-2">
                  <li>• パーソナライズされた学習プラン</li>
                  <li>• 適切な学習ツールの提案</li>
                  <li>• 弱点克服のためのアドバイス</li>
                  <li>• 継続的な学習サポート</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
