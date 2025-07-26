import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { Navigation } from '@/components/layout/Navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Smart Tutor - AI学習システム',
  description: 'パーソナライズされたAI学習システム',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <div className="min-h-screen bg-background-primary text-text-primary">
            <Navigation />
            <main className="flex-1 bg-background-secondary">
              {children}
            </main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
