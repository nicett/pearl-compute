/**
 * Next.js middleware — Edge runtime 路由鉴权
 *
 * 只用 authConfig（不含 Credentials），JWT 校验在 Edge 上跑得动。
 * 未登录访问受保护路径 → 跳 /login？from=...
 * 已登录访问 /login or /register → 跳 /dashboard
 */
import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/auth.config';

const { auth } = NextAuth(authConfig);

const PROTECTED_PREFIXES = ['/dashboard', '/miners', '/market', '/alerts', '/settings'];

export default auth((req) => {
  const { pathname, search } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );

  if (isProtected && !req.auth) {
    const url = new URL('/login', req.url);
    url.searchParams.set('from', pathname + search);
    return NextResponse.redirect(url);
  }

  if (req.auth && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
