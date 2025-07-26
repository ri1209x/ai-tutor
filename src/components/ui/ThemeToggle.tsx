'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
  className?: string;
  variant?: 'button' | 'switch' | 'dropdown';
  size?: 'sm' | 'default' | 'lg';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  variant = 'button',
  size = 'default',
}) => {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  if (!mounted) {
    return null;
  }

  const toggleTheme = () => {
    setTheme(current => {
      if (current === 'light') return 'dark';
      if (current === 'dark') return 'system';
      return 'light';
    });
  };

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        );
      case 'dark':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        );
      case 'system':
        return (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        );
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return 'ライトモード';
      case 'dark':
        return 'ダークモード';
      case 'system':
        return 'システム設定';
    }
  };

  if (variant === 'button') {
    return (
      <Button
        variant="ghost"
        size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'icon'}
        onClick={toggleTheme}
        className={cn('relative', className)}
        title={`現在: ${getLabel()}`}
      >
        {getIcon()}
        <span className="sr-only">テーマ切替: {getLabel()}</span>
      </Button>
    );
  }

  if (variant === 'switch') {
    return (
      <div className={cn('flex items-center space-x-3', className)}>
        <span className="text-sm text-text-secondary">{getLabel()}</span>
        <button
          onClick={toggleTheme}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            theme === 'dark' ? 'bg-primary-600' : 'bg-gray-200'
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      </div>
    );
  }

  if (variant === 'dropdown') {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className={cn('relative', className)}>
        <Button
          variant="ghost"
          size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'icon'}
          onClick={() => setIsOpen(!isOpen)}
          className="relative"
        >
          {getIcon()}
          <span className="sr-only">テーマ選択</span>
        </Button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 z-20 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
              {(['light', 'dark', 'system'] as Theme[]).map((themeOption) => (
                <button
                  key={themeOption}
                  onClick={() => {
                    setTheme(themeOption);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center px-4 py-2 text-sm text-left hover:bg-gray-100',
                    theme === themeOption && 'bg-primary-50 text-primary-600'
                  )}
                >
                  <span className="mr-3">
                    {themeOption === 'light' && (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    )}
                    {themeOption === 'dark' && (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )}
                    {themeOption === 'system' && (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                  </span>
                  {themeOption === 'light' && 'ライトモード'}
                  {themeOption === 'dark' && 'ダークモード'}
                  {themeOption === 'system' && 'システム設定'}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
};
