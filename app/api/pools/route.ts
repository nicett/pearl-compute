import { NextResponse } from 'next/server';

// Edge runtime: Cloudflare Pages 生产环境使用
export const runtime = 'edge';

// 矿池数据类型
interface PoolItem {
  slug: string;
  name: string;
  fee_percent: number;
  reported_hashrate_hps?: number;
  reward_24h_grains: number;
  blocks_24h: number;
  pool_share_24h: number;
}

interface PoolsApiResponse {
  items: PoolItem[];
  updated_at: string;
}

// 内存缓存
let cachedPools: PoolItem[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 30 * 1000; // 30 秒

// 从 PRLScan API 获取矿池列表
async function fetchPools(): Promise<PoolItem[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      'https://api.prlscan.com/v1/pools',
      { signal: controller.signal, cache: 'no-store' }
    );

    if (!response.ok) return null;

    const data: PoolsApiResponse = await response.json();

    // 过滤有效矿池（24小时内有出块）
    const validPools = data.items.filter((p) => p.blocks_24h > 0);

    // 按 24h 出块数降序排序
    validPools.sort((a, b) => b.blocks_24h - a.blocks_24h);

    return validPools;
  } catch (error) {
    console.error('Failed to fetch pools:', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// 获取矿池数据（带缓存）
async function getPoolData() {
  const now = Date.now();

  if (cachedPools && now - lastFetchTime < CACHE_TTL) {
    return cachedPools;
  }

  const pools = await fetchPools();
  if (pools) {
    cachedPools = pools;
    lastFetchTime = now;
    return pools;
  }

  return cachedPools;
}

export async function GET(request: Request) {
  const clientHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store',
  };

  try {
    // 构造缓存 key（去掉前端 ?t= 时间戳）
    const cacheUrl = new URL(request.url);
    cacheUrl.search = '';
    const cacheKey = cacheUrl.toString();

    // ---- 1. 尝试从 Edge Cache 读取 ----
    let edgeCache: Cache | null = null;
    try {
      edgeCache = (caches as unknown as { default: Cache }).default;
      const cached = await edgeCache.match(cacheKey);
      if (cached) {
        const body = await cached.json();
        return NextResponse.json({ ...body, cached: true }, { headers: clientHeaders });
      }
    } catch {}

    // ---- 2. 缓存未命中 — 从 PRLScan API 获取 ----
    const pools = await getPoolData();

    if (!pools) {
      return NextResponse.json(
        { error: 'Failed to fetch pools data' },
        { status: 502, headers: clientHeaders }
      );
    }

    const responseData = { pools };

    // ---- 3. 写入 Edge Cache ----
    if (edgeCache) {
      try {
        const cacheResp = new Response(JSON.stringify(responseData), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `s-maxage=${CACHE_TTL / 1000}`,
          },
        });
        await edgeCache.put(cacheKey, cacheResp);
      } catch {}
    }

    return NextResponse.json(responseData, { headers: clientHeaders });
  } catch (error) {
    console.error('Pools API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
