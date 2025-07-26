'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui';
import { ThemeToggle } from '@/components/ui';

interface HeaderProps {
  title?: string;
  description?: string;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  description,
  onMenuClick,
  showMenuButton = false,
  actions,
}) => {
  const { data: session } = useSession();

  return (
    <header className="bg-white dark:bg-background-dark-secondary shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-4">
          {showMenuButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="lg:hidden"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="sr-only">メニューを開く</span>
            </Button>
          )}
          
          {title && (
            <div>
              <h1 className="text-xl font-semibold text-text-primary dark:text-text-inverse">
                {title}
              </h1>
              {description && (
                <p className="text-sm text-text-muted dark:text-text-inverse-secondary">
                  {description}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* Custom actions */}
          {actions}

          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon"
            title="通知"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM10.5 3.5A6.5 6.5 0 0117 10v4a1 1 0 001 1h1a1 1 0 011 1v1a1 1 0 01-1 1H5a1 1 0 01-1-1v-1a1 1 0 011-1h1a1 1 0 001-1v-4a6.5 6.5 0 016.5-6.5z" />
            </svg>
            <span className="sr-only">通知</span>
          </Button>

          {/* Theme toggle */}
          <ThemeToggle variant="button" size="default" />

          {/* User menu (mobile) */}
          {session && (
            <div className="flex items-center space-x-2 lg:hidden">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {session.user?.name?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
