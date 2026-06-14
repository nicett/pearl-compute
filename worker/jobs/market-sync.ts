/**
 * market-sync job
 *
 * 每 5 秒拉一次 safe.trade 三个端点（depth / trades / ticker），
 * 写入 Redis，前端从 /api/market/snapshot 读 Redis。
 *
 * 单失败不影响其他：每个 fetch 独立 catch；失败的字段不写入，
 * Redis 保留上次成功值（30s TTL 兜底）。
 */
import type { Job } from 'bullmq';

import {
  fetchSafetradeDepth,
  fetchSafetradeTrades,
  fetchSafetradePrice,
} from '../../app/lib/data-sources';
import { setMarketCache } from '../../app/lib/market-cache';

export async function runMarketSync(_job: Job) {
  const startedAt = Date.now();

  const [depth, trades, ticker] = await Promise.all([
    fetchSafetradeDepth().catch(() => null),
    fetchSafetradeTrades().catch(() => null),
    fetchSafetradePrice().catch(() => null),
  ]);

  await setMarketCache({ depth, trades, ticker });

  const elapsedMs = Date.now() - startedAt;
  // 仅在某项失败时打日志，正常路径静默
  if (!depth || !trades || !ticker) {
    console.warn(
      `[market-sync] partial failure: depth=${!!depth} trades=${!!trades} ticker=${!!ticker} (${elapsedMs}ms)`,
    );
  }

  return { depth: !!depth, trades: !!trades, ticker: !!ticker, elapsedMs };
}
