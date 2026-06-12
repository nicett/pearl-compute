/**
 * 单个 MinerBinding 操作 — 目前仅 DELETE
 */
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';

export const runtime = 'nodejs';

const UNAUTHORIZED = NextResponse.json({ error: '未登录' }, { status: 401 });

export async function DELETE(
  _request: Request,
  context: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user?.id) return UNAUTHORIZED;

  const { id } = context.params;

  // deleteMany 在 where 里同时校验 userId，越权时返回 count: 0 而不是抛错
  const result = await prisma.minerBinding.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: '不存在或无权删除' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
