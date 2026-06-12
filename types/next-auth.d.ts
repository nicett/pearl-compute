/**
 * Auth.js v5 — 让 `session.user.id` 在 TypeScript 里可见
 * 必须用 module augmentation，路径名固定为 'next-auth'
 */
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
  }
}
