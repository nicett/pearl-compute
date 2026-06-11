import { NextResponse } from 'next/server';

// Edge runtime: Cloudflare Pages 使用
export const runtime = 'edge';

// Edge Cache TTL（秒）
const CACHE_TTL_SEC = 60;

interface PoolItem {
  slug: string;
  name: string;
  fee_percent?: number;
  reported_hashrate_hps?: number;
  reward_24h_grains?: number;
  blocks_24h?: number;
}

interface FetchPoolsResult {
  pools: Array<{
    slug: string;
    name: string;
    fee_percent: number;
    reported_hashrate_hps: number;
    reward_24h_grains: number;
    blocks_24h: number;
    pool_share_24h: number;
  }>;
  warning?: string;
}

/**
 * 从 PRLScan API 获取矿池列表
 * - 返回 { pools, warning? }：warning 用于上游降级时给前端提示
 * - 失败时 throw，由 caller 决定 502 还是 fallback
 */
async function fetchPools(): Promise<FetchPoolsResult> {
  const controller = new AbortController();
  // 上游返回 ~320KB JSON，给足解析时间
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch('https://api.prlscan.com/v1/pools', {
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`upstream HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!data?.items || !Array.isArray(data.items)) {
      throw new Error('unexpected response structure');
    }

    // 单次 pass：同时过滤、累计、收集，避免在 ~600 个 pool 上做多次遍历
    // (Cloudflare Workers Free Plan CPU 限制 10ms，必须省着用)
    let totalBlocks = 0;
    const active: PoolItem[] = [];
    for (const p of data.items as PoolItem[]) {
      const blocks = p.blocks_24h ?? 0;
      if (blocks > 0) {
        active.push(p);
        totalBlocks += blocks;
      }
    }

    // 按出块数降序（in-place sort）
    active.sort((a, b) => (b.blocks_24h ?? 0) - (a.blocks_24h ?? 0));

    // 只保留前端需要的字段，减小传输体积
    const pools = active.map((p) => {
      const blocks = p.blocks_24h ?? 0;
      return {
        slug: p.slug,
        name: p.name,
        fee_percent: p.fee_percent ?? 0,
        reported_hashrate_hps: p.reported_hashrate_hps ?? 0,
        reward_24h_grains: p.reward_24h_grains ?? 0,
        blocks_24h: blocks,
        pool_share_24h: totalBlocks > 0 ? (blocks / totalBlocks) * 100 : 0,
      };
    });

    return { pools };
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
      } catch {
        // 缓存读取失败不影响主流程
      }
    }

    // ── 2. 缓存未命中 — 从 PRLScan API 获取 ──
    let result: FetchPoolsResult;
    try {
      result = await fetchPools();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('[pools] fetch failed:', message);
      // 降级：返回空 pools 而非 502，前端可继续以全网模式工作
      // 同时附带 warning 字段给前端展示提示（可选）
      return NextResponse.json(
        { pools: [], warning: `Failed to fetch pools: ${message}`, stale: true },
        { headers: clientHeaders }
      );
    }

    // ── 3. 写入 Edge Cache（仅成功时） ──
    if (edgeCache && result.pools.length > 0) {
      try {
        const cacheResp = new Response(JSON.stringify(result), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `s-maxage=${CACHE_TTL_SEC}`,
          },
        });
        await edgeCache.put(cacheKey, cacheResp);
      } catch {
        // 缓存写入失败不影响响应返回
      }
    }

    return NextResponse.json(result, { headers: clientHeaders });
  } catch (error) {
    console.error('[pools] route error:', error);
    return NextResponse.json(
      { pools: [], error: 'Internal server error', stale: true },
      { headers: clientHeaders }
    );
  }
}
