import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import { JWT } from 'next-auth/jwt';
import { prisma } from './prisma';
import { User, UserRole } from '@prisma/client';

// JWT とセッションの型定義
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      image?: string;
    };
    accessToken?: string;
    error?: string;
  }

  interface User {
    role: UserRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
  }
}

// トークンの有効期間（秒）
const ACCESS_TOKEN_EXPIRES_IN = 60 * 60; // 1時間
const REFRESH_TOKEN_EXPIRES_IN = 60 * 60 * 24 * 7; // 7日

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
          scope: 'openid email profile',
        },
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'read:user user:email',
        },
      },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('メールアドレスとパスワードを入力してください');
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user.password) {
            throw new Error('メールアドレスまたはパスワードが正しくありません');
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error('メールアドレスまたはパスワードが正しくありません');
          }

          // パスワードを削除して返す
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword as User;
        } catch (error) {
          console.error('Authentication error:', error);
          throw new Error('認証中にエラーが発生しました');
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: REFRESH_TOKEN_EXPIRES_IN,
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: ACCESS_TOKEN_EXPIRES_IN,
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // OAuthプロバイダーからのサインイン処理
      if (account?.provider !== 'credentials') {
        try {
          // 既存ユーザーを確認
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          if (!existingUser) {
            // 新規ユーザー作成
            await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name || profile?.name || user.email!.split('@')[0],
                role: 'LEARNER', // デフォルトロール
                avatar: user.image || profile?.image || null,
              },
            });
          } else if (existingUser.avatar !== user.image) {
            // プロフィール画像が更新されている場合
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { 
                avatar: user.image || null,
                name: user.name || existingUser.name,
              },
            });
          }
        } catch (error) {
          console.error('Error in signIn callback:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // 初回サインイン時
      if (account && user) {
        // OAuthプロバイダーからのアクセストークンを保存
        if (account.access_token) {
          token.accessToken = account.access_token;
        }
        if (account.refresh_token) {
          token.refreshToken = account.refresh_token;
        }
        if (account.expires_at) {
          token.accessTokenExpires = account.expires_at * 1000;
        } else {
          token.accessTokenExpires = Date.now() + ACCESS_TOKEN_EXPIRES_IN * 1000;
        }

        // ユーザー情報をトークンに追加
        token.id = user.id;
        token.role = (user as any).role || 'LEARNER';
      }

      // アクセストークンの有効期限が切れている場合のリフレッシュ処理
      if (Date.now() < (token.accessTokenExpires || 0)) {
        return token;
      }

      // ここでトークンリフレッシュ処理を実装可能
      // 例: refreshAccessToken(token)

      return token;
    },
    async session({ session, token }) {
      // セッションにユーザー情報を追加
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.accessToken = token.accessToken;
        if (token.error) {
          session.error = token.error;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
};
