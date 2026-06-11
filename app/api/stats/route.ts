import { NextResponse } from 'next/server';
import { assembleStatsData } from '../../lib/data-sources';

// Edge runtime: Cloudflare Pages 使用
export const runtime = 'edge';

// Edge Cache TTL（秒）
const CACHE_TTL_SEC = 20;

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
  url.search = ''; // 去掉 ?t= 时间戳，确保命中同一条缓存
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
      } catch (e) {
        console.warn('[cache:read]', e);
      }
    }

    // ── 2. 缓存未命中 — 共享数据获取 ──
    const data = await assembleStatsData();

    if (!data) {
      return NextResponse.json(
        { error: 'Failed to fetch data', lastSuccessfulFetchTime: null },
        { status: 502, headers: clientHeaders }
      );
    }

    // ── 3. 写入 Edge Cache ──
    if (edgeCache) {
      try {
        const cacheResp = new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `s-maxage=${CACHE_TTL_SEC}`,
          },
        });
        await edgeCache.put(cacheKey, cacheResp);
      } catch (e) {
        console.warn('[cache:write]', e);
      }
    }

    return NextResponse.json(data, { headers: clientHeaders });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}