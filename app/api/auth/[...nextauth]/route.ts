// Auth.js v5 catch-all route — signin/signout/callback/session/csrf
import { handlers } from '@/auth';

export const { GET, POST } = handlers;

// Auth.js handler 必须跑在 Node runtime（用到 argon2 / prisma）
export const runtime = 'nodejs';
