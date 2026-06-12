/**
 * 批量标记所有通知已读
 */
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';

export const runtime = 'nodejs';

const UNAUTHORIZED = NextResponse.json({ error: '未登录' }, { status: 401 });

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return UNAUTHORIZED;

  const result = await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
