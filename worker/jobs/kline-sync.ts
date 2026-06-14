/**
 * kline-sync job
 *
 * 每 60s 拉所有周期 K 线，写 Redis。
 *
 * 上游频率：7 个周期 × 60s ≈ 0.12 RPS（可接受）
 *
 * 注：严格说 1d / 1w 这种长周期不需要 60s 同步（数据基本不变），
 * 但简单实现先这样；上游负担微不足道。后续可改为分级频率。
 */
import type { Job } from 'bullmq';

import { fetchSafeTradeKlines, KLINE_PERIODS } from '../../app/lib/data-sources';
import { setKlineCache } from '../../app/lib/market-cache';

export async function runKlineSync(_job: Job) {
  const startedAt = Date.now();

  const results = await Promise.all(
    KLINE_PERIODS.map(async (period) => {
      try {
        const klines = await fetchSafeTradeKlines(period);
        if (klines && klines.length > 0) {
          await setKlineCache(period, klines);
          return { period, ok: true, count: klines.length };
        }
        return { period, ok: false, count: 0 };
      } catch (e) {
        return { period, ok: false, count: 0, error: e instanceof Error ? e.message : String(e) };
      }
    }),
  );

  const elapsedMs = Date.now() - startedAt;
  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.warn(
      `[kline-sync] ${failed.length}/${results.length} periods failed in ${elapsedMs}ms:`,
      failed.map((f) => f.period).join(','),
    );
  }
  return { synced: results.length - failed.length, failed: failed.length, elapsedMs };
}
