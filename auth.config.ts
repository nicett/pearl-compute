/**
 * Auth.js v5 配置 — Edge-safe 部分（仅 JWT 校验需要的，不含 Credentials）
 *
 * middleware.ts 跑在 Edge runtime，不能 import prisma / argon2，
 * 所以这里只放纯配置；Credentials provider 在 auth.ts 里追加。
 */
import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 天
  },
  providers: [], // 真正的 providers 在 auth.ts 里追加
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) {
        session.user.id = token.uid as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
