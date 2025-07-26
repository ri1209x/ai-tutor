'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // ロールに応じて適切なダッシュボードにリダイレクト
    const userRole = session.user.role;
    if (userRole === 'LEARNER') {
      router.push('/dashboard/learner');
    } else if (userRole === 'PARENT') {
      router.push('/dashboard/parent');
    } else if (userRole === 'EDUCATOR') {
      router.push('/dashboard/educator');
    } else if (userRole === 'ADMIN') {
      router.push('/dashboard/admin');
    }
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

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                ダッシュボード
              </h1>
              <p className="text-gray-600 mb-6">
                ようこそ、{session.user.name}さん
              </p>
              <p className="text-sm text-gray-500 mb-8">
                ロール: {session.user.role}
              </p>
              <button
                onClick={() => signOut()}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
