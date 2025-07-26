'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Container } from './Container';

interface NavigationItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  roles?: string[];
}

const navigationItems: NavigationItem[] = [
  {
    label: 'ダッシュボード',
    href: '/dashboard',
    roles: ['LEARNER', 'PARENT', 'EDUCATOR', 'ADMIN'],
  },
  {
    label: 'コース',
    href: '/courses',
    roles: ['LEARNER', 'EDUCATOR'],
  },
  {
    label: 'レッスン',
    href: '/lessons',
    roles: ['LEARNER', 'EDUCATOR'],
  },
  {
    label: '評価',
    href: '/assessments',
    roles: ['LEARNER', 'PARENT', 'EDUCATOR'],
  },
  {
    label: '管理',
    href: '/admin',
    roles: ['ADMIN'],
  },
];

export const Navigation: React.FC = () => {
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const filteredItems = navigationItems.filter(item => 
    !item.roles || item.roles.includes(session?.user?.role || '')
  );

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <nav className="bg-background-secondary shadow-sm border-b border-card-border">
      <Container>
        <div className="flex justify-between items-center h-16">
          {/* ロゴ */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ST</span>
              </div>
              <span className="text-xl font-bold text-text-primary">Smart Tutor</span>
            </Link>
          </div>

          {/* デスクトップナビゲーション */}
          <div className="hidden md:flex items-center space-x-8">
            {session && (
              <>
                {filteredItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-text-secondary hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </>
            )}
          </div>

          {/* ユーザーメニュー */}
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle variant="button" size="default" />
            {session ? (
              <div className="flex items-center space-x-4">
                <div className="text-sm">
                  <p className="text-text-primary font-medium">{session.user?.name}</p>
                  <p className="text-text-muted text-xs">{session.user?.role}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                >
                  ログアウト
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/auth/signin">
                  <Button variant="outline" size="sm">
                    ログイン
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">
                    新規登録
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* モバイルメニューボタン */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-text-secondary hover:text-text-primary focus:outline-none focus:text-text-primary"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* モバイルメニュー */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              {session && (
                <>
                  {filteredItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-text-secondary hover:text-primary-600 block px-3 py-2 rounded-md text-base font-medium"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="px-3 py-2">
                      <p className="text-text-primary font-medium">{session.user?.name}</p>
                      <p className="text-text-muted text-sm">{session.user?.role}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSignOut}
                      className="mx-3"
                    >
                      ログアウト
                    </Button>
                  </div>
                </>
              )}
              {!session && (
                <div className="space-y-2 px-3">
                  <Link href="/auth/signin" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">
                      ログイン
                    </Button>
                  </Link>
                  <Link href="/auth/signup" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button size="sm" className="w-full">
                      新規登録
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </Container>
    </nav>
  );
};
