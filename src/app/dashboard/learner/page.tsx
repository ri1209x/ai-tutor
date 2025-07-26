'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, Button, Progress } from '@/components/ui';

export default function LearnerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [learningProgress, setLearningProgress] = useState(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user.role !== 'LEARNER') {
      router.push('/dashboard');
      return;
    }

    // 学習進捗データを取得（後で実装）
    // fetchLearningProgress();
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'LEARNER') {
    return null;
  }

  return (
    <DashboardLayout
      title="学習者ダッシュボード"
      description={`ようこそ、${session.user.name}さん`}
    >

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* 今日の学習 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="w-8 h-8 bg-primary-500 rounded-md flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              今日の学習
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text-primary mb-2">2時間30分</div>
            <Button size="sm" className="w-full">
              継続する
            </Button>
          </CardContent>
        </Card>

        {/* 進捗状況 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="w-8 h-8 bg-success-500 rounded-md flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              学習進捗
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text-primary mb-2">75%</div>
            <Progress value={75} className="mb-3" />
            <Button variant="outline" size="sm" className="w-full">
              詳細を見る
            </Button>
          </CardContent>
        </Card>

        {/* 次のレッスン */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="w-8 h-8 bg-warning-500 rounded-md flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              次のレッスン
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium text-text-primary mb-2">数学 - 二次関数</div>
            <Button variant="secondary" size="sm" className="w-full">
              開始する
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 最近の活動 */}
      <Card>
        <CardHeader>
          <CardTitle>最近の活動</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-text-primary">数学 - 一次関数のグラフ</h4>
                <div className="flex items-center space-x-4 mt-2 text-sm text-text-muted">
                  <span>• 30分</span>
                  <span>• 95%の精度</span>
                  <span>• 2時間前</span>
                </div>
              </div>
              <div className="px-3 py-1 bg-success-100 text-success-700 rounded-full text-sm font-medium">
                完了
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-text-primary">英語 - 現在完了形</h4>
                <div className="flex items-center space-x-4 mt-2 text-sm text-text-muted">
                  <span>• 15分 / 45分</span>
                  <span>• 33%進捗</span>
                  <span>• 1日前</span>
                </div>
              </div>
              <div className="px-3 py-1 bg-warning-100 text-warning-700 rounded-full text-sm font-medium">
                進行中
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
