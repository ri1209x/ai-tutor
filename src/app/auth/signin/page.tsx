'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Icons } from '@/components';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('メールアドレスまたはパスワードが正しくありません');
      } else {
        const session = await getSession();
        if (session?.user?.role === 'LEARNER') {
          router.push('/dashboard/learner');
        } else if (session?.user?.role === 'PARENT') {
          router.push('/dashboard/parent');
        } else if (session?.user?.role === 'EDUCATOR') {
          router.push('/dashboard/educator');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (error) {
      setError('ログイン中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = (provider: string) => {
    signIn(provider);
  };

  return (
    <div className="container relative min-h-screen flex flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-primary-600" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Icons.logo className="h-8 w-8 mr-2" />
          スマートチューター
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              「個別最適化された学習体験で、
              <br />
              誰もが自分のペースで学べる環境を」
            </p>
            <footer className="text-sm">スマートチューターチーム</footer>
          </blockquote>
        </div>
      </div>
      
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">アカウントにログイン</CardTitle>
              <CardDescription className="text-center">
                メールアドレスとパスワードを入力するか、ソーシャルアカウントでログイン
              </CardDescription>
            </CardHeader>
            
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Icons.spinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icons.google className="h-4 w-4" />
                  )}
                  Google
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOAuthSignIn('github')}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Icons.spinner className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icons.gitHub className="h-4 w-4" />
                  )}
                  GitHub
                </Button>
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">または</span>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス
                  </label>
                  <Input
                    id="email"
                    placeholder="name@example.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={isLoading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      パスワード
                    </label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      パスワードを忘れた場合
                    </Link>
                  </div>
                  <Input
                    id="password"
                    placeholder="••••••••"
                    type="password"
                    autoComplete="current-password"
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                
                {error && (
                  <div className="text-sm text-red-500 text-center">
                    {error}
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading && (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  ログイン
                </Button>
              </form>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <p className="px-8 text-center text-sm text-muted-foreground">
                アカウントをお持ちでない方は{' '}
                <Link
                  href="/auth/signup"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  新規登録
                </Link>
              </p>
              <p className="px-8 text-center text-xs text-muted-foreground">
                アカウントを作成またはログインすることにより、
                <Link
                  href="/terms"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  利用規約
                </Link>{' '}
                および{' '}
                <Link
                  href="/privacy"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  プライバシーポリシー
                </Link>
                に同意するものとします。
              </p>
            </CardFooter>
          </Card>
          
          {/* デモ用アカウント情報 */}
          <div className="mt-8 p-4 bg-blue-50 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">デモアカウント</h3>
            <div className="text-xs text-blue-600 space-y-1">
              <p>学習者: student@smarttutor.com</p>
              <p>保護者: parent@smarttutor.com</p>
              <p>教育者: teacher@smarttutor.com</p>
              <p>パスワード: password</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
