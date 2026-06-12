/**
 * 通知列表
 *
 * GET: 当前用户的通知，按时间倒序，分页（page * pageSize）
 * 默认 limit=50，超大型分页请求会被截到 200
 */
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { bigintToString } from '@/app/lib/json';

export const runtime = 'nodejs';

const UNAUTHORIZED = NextResponse.json({ error: '未登录' }, { status: 401 });

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return UNAUTHORIZED;

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);
  const unreadOnly = url.searchParams.get('unread') === '1';

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.user.id,
      ...(unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: session.user.id, readAt: null },
  });

  return NextResponse.json(bigintToString({ notifications, unreadCount }));
}
