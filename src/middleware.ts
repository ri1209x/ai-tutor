import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // 認証が必要なルートの定義
    const protectedRoutes = ['/dashboard', '/courses', '/lessons', '/assessments'];
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    if (isProtectedRoute && !token) {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    // ロールベースのアクセス制御
    if (token) {
      const userRole = token.role;

      // 学習者専用ルート
      if (pathname.startsWith('/dashboard/learner') && userRole !== 'LEARNER') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      // 保護者専用ルート
      if (pathname.startsWith('/dashboard/parent') && userRole !== 'PARENT') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      // 教育者専用ルート
      if (pathname.startsWith('/dashboard/educator') && userRole !== 'EDUCATOR') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      // 管理者専用ルート
      if (pathname.startsWith('/admin') && userRole !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/courses/:path*',
    '/lessons/:path*',
    '/assessments/:path*',
    '/admin/:path*',
  ],
};
