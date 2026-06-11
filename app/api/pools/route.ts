import { NextResponse } from 'next/server';
import { withRedisCache } from '../../lib/cache';

export const dynamic = 'force-dynamic';

const CACHE_TTL_SEC = 60;
const CACHE_KEY = 'pearl:pools';

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

const clientHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
};

export async function GET() {
  try {
    const { data, cached } = await withRedisCache(CACHE_KEY, CACHE_TTL_SEC, fetchPools);
    return NextResponse.json(cached ? { ...data, cached: true } : data, { headers: clientHeaders });
  } catch (e) {
    // 上游 PRLScan 不可用：降级返回空列表 + warning，前端切回全网模式
    const message = e instanceof Error ? e.message : String(e);
    console.error('[pools] fetch failed:', message);
    return NextResponse.json(
      { pools: [], warning: `Failed to fetch pools: ${message}`, stale: true },
      { headers: clientHeaders },
    );
  }
}
