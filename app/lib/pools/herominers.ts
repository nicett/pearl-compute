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

    // 裁剪 rawJson：丢掉 charts（时序数据，超大）和 payments（已有更聚合的 stats）
    const { charts: _c, payments: _p, ...trimmed } = body;
    const rawJson = {
      ...trimmed,
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
