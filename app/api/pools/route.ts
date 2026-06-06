import { NextResponse } from 'next/server';

// Edge runtime: Cloudflare Pages 使用
export const runtime = 'edge';

// Edge Cache TTL（秒）
const CACHE_TTL_SEC = 30;

// 从 PRLScan API 获取矿池列表
async function fetchPools() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch('https://api.prlscan.com/v1/pools', {
      signal: controller.signal, cache: 'no-store',
    });
    if (!response.ok) return null;
    const data = await response.json();
    // 过滤24小时内有出块的矿池，按出块数降序
    const validPools = data.items
      .filter((p: { blocks_24h: number }) => p.blocks_24h > 0)
      .sort((a: { blocks_24h: number }, b: { blocks_24h: number }) => b.blocks_24h - a.blocks_24h);
    return validPools;
  } catch (e) {
    console.error('[fetchPools]', e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Edge Cache 工具函数 ──

function getEdgeCache(): Cache | null {
  try {
    return (caches as unknown as { default: Cache }).default;
  } catch {
    return null;
  }
}

function getCacheKey(request: Request): string {
  const url = new URL(request.url);
  url.search = '';
  return url.toString();
}

// ── GET Handler ──

export async function GET(request: Request) {
  const clientHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store',
  };

  try {
    const edgeCache = getEdgeCache();
    const cacheKey = getCacheKey(request);

    // ── 1. 优先读 Edge Cache ──
    if (edgeCache) {
      try {
        const cached = await edgeCache.match(cacheKey);
        if (cached) {
          const body = await cached.json();
          return NextResponse.json({ ...body, cached: true }, { headers: clientHeaders });
        }
      } catch {}
    }

    // ── 2. 缓存未命中 — 从 PRLScan API 获取 ──
    const pools = await fetchPools();

    if (!pools) {
      return NextResponse.json(
        { error: 'Failed to fetch pools data' },
        { status: 502, headers: clientHeaders }
      );
    }

    const responseData = { pools };

    // ── 3. 写入 Edge Cache ──
    if (edgeCache) {
      try {
        const cacheResp = new Response(JSON.stringify(responseData), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `s-maxage=${CACHE_TTL_SEC}`,
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
