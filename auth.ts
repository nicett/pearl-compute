/**
 * Auth.js v5 — Node runtime 完整版
 *
 * 在 authConfig 基础上追加 Credentials provider
 * （Credentials.authorize 用到 prisma / argon2，必须跑在 Node runtime）
 */
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { authConfig } from '@/auth.config';
import { prisma } from '@/app/lib/db';
import { verifyPassword } from '@/app/lib/password';
import { loginInputSchema } from '@/app/lib/validators/auth';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = loginInputSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { username },
          select: { id: true, username: true, email: true, passwordHash: true },
        });
        if (!user) return null;

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        // 异步更新 lastLoginAt，不阻塞登录
        prisma.user
          .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
          .catch((e) => console.warn('[auth] lastLoginAt update failed:', e));

        return {
          id: user.id,
          name: user.username,
          email: user.email ?? undefined,
        };
      },
    }),
  ],
});
