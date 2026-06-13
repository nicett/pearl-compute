/**
 * HeroMiners 矿池平台适配器
 *
 * 所有 herominers 矿池（pearl / monero / raven 等）API 结构完全一致：
 *   GET https://{subdomain}.herominers.com/api/stats_address?address={wallet}
 *
 * 返回 JSON：
 *   { stats: {...}, workers: [...], payments: [...], unconfirmed: [...], charts: {...} }
 *
 * 关键字段（实测自 pearl.herominers.com）：
 *   stats.hashrate          当前算力 (H/s, number)
 *   stats.balance           未结算 (字符串数值，BigInt 安全)
 *   stats.payments_24h      24h 已派发 (number)
 *   workers[].name          矿机名
 *   workers[].hashrate      矿机当前算力 (0 = 离线)
 *
 * 公开 API，无鉴权，无 Cookie，无 CORS 限制（服务端 fetch 时无所谓）。
 */
import type { MinerFetcher, MinerSnapshotData, PoolInfo } from './types';

const REQUEST_TIMEOUT_MS = 10_000;

/** 将 string | number 安全转 BigInt，失败返回 null */
function toBigIntSafe(v: unknown): bigint | null {
  if (v == null) return null;
  try {
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) return null;
      return BigInt(Math.trunc(v));
    }
    if (typeof v === 'string') {
      // herominers 把大数值用字符串返回，例如 "5233659232"
      const trimmed = v.trim();
      if (!/^-?\d+$/.test(trimmed)) return null;
      return BigInt(trimmed);
    }
    return null;
  } catch {
    return null;
  }
}

/** 抽取 stats 子集，去除矿池层面的统计（roundScore 等） */
function trimStats(stats: Record<string, unknown>): Record<string, unknown> {
  return {
    hashrate: stats.hashrate ?? 0,
    hashrate_1h: stats.hashrate_1h ?? 0,
    hashrate_6h: stats.hashrate_6h ?? 0,
    hashrate_24h: stats.hashrate_24h ?? 0,
    balance: stats.balance ?? '0',
    paid: stats.paid ?? '0',
    payments_24h: stats.payments_24h ?? 0,
    payments_7d: stats.payments_7d ?? 0,
    shares_good: stats.shares_good ?? 0,
    shares_invalid: stats.shares_invalid ?? 0,
    shares_stale: stats.shares_stale ?? 0,
    networkHeight: stats.networkHeight ?? 0,
    lastShare: stats.lastShare ?? null,
  };
}

/** 抽取要存的 worker 子集，去冗余字段（agent / lastJobDifficulty 等） */
function trimWorkers(workers: unknown): unknown[] {
  if (!Array.isArray(workers)) return [];
  return workers.map((w: Record<string, unknown>) => ({
    name: w.name ?? null,
    hashrate: w.hashrate ?? 0,
    hashrate_1h: w.hashrate_1h ?? 0,
    hashrate_24h: w.hashrate_24h ?? 0,
    lastShare: w.lastShare ?? null,
    region: w.region ?? null,
    solo: !!w.solo,
  }));
}

export const herominersFetcher: MinerFetcher = {
  platform: 'herominers',

  async fetch(pool: PoolInfo, walletAddr: string): Promise<MinerSnapshotData> {
    const url = `https://${pool.subdomain}.herominers.com/api/stats_address?address=${encodeURIComponent(walletAddr)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let body: Record<string, unknown>;
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`upstream HTTP ${res.status}`);
      body = (await res.json()) as Record<string, unknown>;
    } finally {
      clearTimeout(timer);
    }

    const stats = (body.stats ?? {}) as Record<string, unknown>;
    const workers = Array.isArray(body.workers) ? body.workers : [];

    const onlineWorkerCount = workers.filter(
      (w: Record<string, unknown>) => typeof w.hashrate === 'number' && (w.hashrate as number) > 0,
    ).length;

    // rawJson 仅保留用户层面字段，丢掉矿池级 unconfirmed / unlocked / charts / payments 等
    // 目标单条 < 2KB（11.7KB → ~1KB）
    const rawJson = {
      stats: trimStats(stats),
      workers: trimWorkers(workers),
    };

    return {
      hashrateHps: toBigIntSafe(stats.hashrate),
      balanceGrains: toBigIntSafe(stats.balance),
      paid24hGrains: toBigIntSafe(stats.payments_24h),
      workerCount: onlineWorkerCount,
      rawJson,
    };
  },
};
