import { NextResponse } from 'next/server';
import { assembleStatsData } from '../../lib/data-sources';
import { withRedisCache } from '../../lib/cache';

// 关闭 Next.js 路由的静态化优化：必须每个请求都跑 GET，
// 否则会在 build 期固化一次上游数据
export const dynamic = 'force-dynamic';

const CACHE_TTL_SEC = 20;
const CACHE_KEY = 'pearl:stats';

const clientHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function GET() {
  try {
    const { data, cached } = await withRedisCache(CACHE_KEY, CACHE_TTL_SEC, async () => {
      const result = await assembleStatsData();
      if (!result) throw new Error('assembleStatsData returned null');
      return result;
    });

    return NextResponse.json(cached ? { ...data, cached: true } : data, { headers: clientHeaders });
  } catch (error) {
    console.error('[stats] route error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data', lastSuccessfulFetchTime: null },
      { status: 502, headers: clientHeaders },
    );
  }
}
