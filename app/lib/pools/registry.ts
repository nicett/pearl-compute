/**
 * 矿池注册表
 *
 * v1 写死的白名单。slug 是我们项目内的稳定标识，
 * 不要与 PRLScan 的 slug 混淆（PRLScan 用的是矿池公开的 slug，我们这里是自己的）。
 *
 * 后续扩展：
 * - 同一个 herominers 平台再加新币种，只需新增一行（subdomain 改一下）
 * - 新平台（nodejs-pool / open-ethereum-pool 等）写一个新的 fetcher 并在 FETCHERS 注册
 */
import type { MinerFetcher, PoolInfo } from './types';
import { herominersFetcher } from './herominers';

const POOLS: Record<string, PoolInfo> = {
  'pearl-herominers': {
    slug: 'pearl-herominers',
    platform: 'herominers',
    subdomain: 'pearl',
    displayName: 'HeroMiners (PRL)',
    // PRL 地址：bech32 格式，pearl 前缀 + 长度 ~62
    addressRegex: /^prl1[a-z0-9]{50,80}$/,
  },
  // 未来加：
  // 'pearl-fortune': { ..., platform: 'nodejs-pool', ... },
};

const FETCHERS: Record<PoolInfo['platform'], MinerFetcher> = {
  herominers: herominersFetcher,
};

/** 列出所有矿池（用于前端下拉） */
export function listPools(): PoolInfo[] {
  return Object.values(POOLS);
}

/** 按 slug 取矿池信息 */
export function getPoolBySlug(slug: string): PoolInfo | null {
  return POOLS[slug] ?? null;
}

/** 按 slug 取 fetcher（slug 不在白名单 / 平台缺失 fetcher → null） */
export function getFetcherForPool(slug: string): { pool: PoolInfo; fetcher: MinerFetcher } | null {
  const pool = POOLS[slug];
  if (!pool) return null;
  const fetcher = FETCHERS[pool.platform];
  if (!fetcher) return null;
  return { pool, fetcher };
}
