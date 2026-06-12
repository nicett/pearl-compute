/**
 * miner-sync job
 *
 * 每次触发：扫所有 MinerBinding → 并发拉 herominers（限流 8）→ 写 MinerSnapshot
 * 单个 binding 失败不影响其他；只 console.warn，不抛错（防止 BullMQ 重试整个 job）
 */
import pLimit from 'p-limit';
import type { Job } from 'bullmq';

import { prisma } from '../../app/lib/db';
import { getFetcherForPool } from '../../app/lib/pools/registry';

const CONCURRENCY = 8;

/** 可选参数：传 bindingId 时只同步该 binding（注册时立即触发） */
export interface MinerSyncJobData {
  bindingId?: string;
}

export async function runMinerSync(job: Job<MinerSyncJobData>) {
  const onlyId = job.data?.bindingId;
  const bindings = onlyId
    ? await prisma.minerBinding.findMany({ where: { id: onlyId } })
    : await prisma.minerBinding.findMany();

  if (bindings.length === 0) {
    console.log('[miner-sync] no bindings');
    return { synced: 0, failed: 0 };
  }

  const limit = pLimit(CONCURRENCY);
  const now = new Date();
  let synced = 0;
  let failed = 0;

  await Promise.all(
    bindings.map((b) =>
      limit(async () => {
        const fetched = getFetcherForPool(b.poolSlug);
        if (!fetched) {
          // 已被白名单移除的 slug：跳过，不算失败也不算成功
          console.warn(`[miner-sync] ${b.id}: unknown poolSlug=${b.poolSlug}`);
          return;
        }

        try {
          const data = await fetched.fetcher.fetch(fetched.pool, b.walletAddr);
          await prisma.minerSnapshot.create({
            data: {
              bindingId: b.id,
              snapshotAt: now,
              hashrateHps: data.hashrateHps,
              balanceGrains: data.balanceGrains,
              paid24hGrains: data.paid24hGrains,
              workerCount: data.workerCount,
              rawJson: data.rawJson as object,
            },
          });
          synced++;
        } catch (e) {
          failed++;
          const msg = e instanceof Error ? e.message : String(e);
          // 地址脱敏：只显示前 8 后 4 位
          const addr = b.walletAddr.length > 12
            ? `${b.walletAddr.slice(0, 8)}***${b.walletAddr.slice(-4)}`
            : '***';
          console.warn(`[miner-sync] ${b.poolSlug}/${addr}: ${msg}`);
        }
      }),
    ),
  );

  console.log(`[miner-sync] done synced=${synced} failed=${failed} total=${bindings.length}`);
  return { synced, failed };
}
