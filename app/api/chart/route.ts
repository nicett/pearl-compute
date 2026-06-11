import { NextResponse } from 'next/server';
import { fetchSafeTradeKlines } from '../../lib/data-sources';
import { withRedisCache } from '../../lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_TTL_SEC = 20;
const CACHE_KEY = 'pearl:chart';

const clientHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function GET() {
  try {
    const { data, cached } = await withRedisCache(CACHE_KEY, CACHE_TTL_SEC, async () => {
      const klines = await fetchSafeTradeKlines();
      if (!klines || klines.length === 0) {
        throw new Error('SafeTrade returned no klines');
      }
      return {
        source: 'SafeTrade',
        period: 15,
        data: klines,
      };
    });

    return NextResponse.json(cached ? { ...data, cached: true } : data, { headers: clientHeaders });
  } catch (error) {
    console.error('[chart] route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data from SafeTrade' },
      { status: 502, headers: clientHeaders },
    );
  }
}
