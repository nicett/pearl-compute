/**
 * 行情快照 — 仅读 Redis（worker 5s 同步），不打 safe.trade
 *
 * 鉴权：必须登录（与 /miners 一致）
 * 频率：前端可任意频率轮询，对上游零影响
 */
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { getMarketSnapshot } from '@/app/lib/market-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const snapshot = await getMarketSnapshot();

  return NextResponse.json(snapshot, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
