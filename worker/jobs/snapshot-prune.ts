/**
 * snapshot-prune job
 *
 * 每天跑一次，三步降采样：
 *   1. 删除 90 天前的 snapshot
 *   2. 7-90 天的：每个 binding × 每小时 只保留最早一条
 *   3. 最近 7 天的：保留全部 (5min 粒度)
 *
 * 用 prisma.$executeRawUnsafe 直接发 SQL（PARTITION BY 在 PG 高效）
 */
import type { Job } from 'bullmq';

import { prisma } from '../../app/lib/db';

export async function runSnapshotPrune(_job: Job) {
  const startedAt = Date.now();

  // step 1: 删除超过 90 天的
  const deletedOld = await prisma.$executeRawUnsafe<number>(`
    DELETE FROM "MinerSnapshot"
    WHERE "snapshotAt" < NOW() - INTERVAL '90 days'
  `);

  // step 2: 7-90 天的，按 (bindingId, 小时) 分组，每组只保留最早 1 条
  // ROW_NUMBER 给同组排号，rn > 1 的全删
  const downsampled = await prisma.$executeRawUnsafe<number>(`
    DELETE FROM "MinerSnapshot"
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY "bindingId", date_trunc('hour', "snapshotAt")
          ORDER BY "snapshotAt"
        ) AS rn
        FROM "MinerSnapshot"
        WHERE "snapshotAt" < NOW() - INTERVAL '7 days'
          AND "snapshotAt" >= NOW() - INTERVAL '90 days'
      ) t
      WHERE rn > 1
    )
  `);

  const elapsedMs = Date.now() - startedAt;
  console.log(
    `[snapshot-prune] deleted ${deletedOld} old (>90d), downsampled ${downsampled} (7-90d) in ${elapsedMs}ms`,
  );

  return { deletedOld, downsampled, elapsedMs };
}
