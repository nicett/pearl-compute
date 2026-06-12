/**
 * 标记通知已读
 */
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';

export const runtime = 'nodejs';

const UNAUTHORIZED = NextResponse.json({ error: '未登录' }, { status: 401 });

export async function POST(_request: Request, context: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return UNAUTHORIZED;

  // BigInt id
  let id: bigint;
  try {
    id = BigInt(context.params.id);
  } catch {
    return NextResponse.json({ error: '非法 id' }, { status: 400 });
  }

  const result = await prisma.notification.updateMany({
    where: { id, userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
