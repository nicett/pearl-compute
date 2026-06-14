/**
 * K 线 API
 *
 * GET /api/chart?period=N
 *
 * - period 取值: 1, 5, 15, 60, 240, 1440, 10080（默认 15）
 * - 优先读 Redis（worker 60s 后台同步）；miss 时降级直拉 SafeTrade
 * - 不要求登录（首页计算器右栏 + 行情页都用）
 */
import { NextResponse } from 'next/server';

import { fetchSafeTradeKlines, KLINE_PERIODS } from '../../lib/data-sources';
import { getKlineCache } from '../../lib/market-cache';

export const dynamic = 'force-dynamic';

const VALID_PERIODS = new Set<number>(KLINE_PERIODS);

const clientHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const periodStr = url.searchParams.get('period') ?? '15';
  const period = parseInt(periodStr, 10);

  if (!Number.isFinite(period) || !VALID_PERIODS.has(period)) {
    return NextResponse.json(
      { error: `Invalid period. Allowed: ${[...VALID_PERIODS].join(',')}` },
      { status: 400, headers: clientHeaders },
    );
  }

  // 1. 优先读 Redis
  const cached = await getKlineCache(period);
  if (cached && cached.length > 0) {
    return NextResponse.json(
      { source: 'SafeTrade', period, data: cached, cached: true },
      { headers: clientHeaders },
    );
  }

  // 2. miss → 直拉上游（worker 还没跑 / Redis 挂）
  try {
    const klines = await fetchSafeTradeKlines(period);
    if (!klines || klines.length === 0) {
      return NextResponse.json(
        { error: 'No kline data from SafeTrade' },
        { status: 502, headers: clientHeaders },
      );
    }
    return NextResponse.json(
      { source: 'SafeTrade', period, data: klines },
      { headers: clientHeaders },
    );
  } catch (e) {
    console.error('[chart] route error:', e);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 502, headers: clientHeaders },
    );
  }
}
