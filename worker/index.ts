/**
 * Worker 进程入口
 *
 * 跑法：
 *   npm run worker          # dev：tsx
 *   npm run worker:build    # 编译到 worker/dist/
 *   npm run worker:start    # prod：node worker/dist/index.js（PM2 启动它）
 *
 * 当前注册的定时任务：
 * - miner-sync       每 5 分钟    拉所有矿工绑定的实时数据
 * - snapshot-prune   每 24 小时   降采样旧 snapshot（防数据库爆）
 */
import 'dotenv/config';
import { Queue, Worker } from 'bullmq';

import { bullmqConnection } from './lib/redis';
import { runMinerSync } from './jobs/miner-sync';
import { runSnapshotPrune } from './jobs/snapshot-prune';

const MINER_SYNC_INTERVAL_MS = 5 * 60_000;        // 5 分钟
const SNAPSHOT_PRUNE_INTERVAL_MS = 24 * 60 * 60_000; // 24 小时

/** 注册 / 重置一个 repeat job —— 清掉旧的，加新的 */
async function registerRepeatable(queue: Queue, jobName: string, every: number, jobId: string) {
  const existing = await queue.getRepeatableJobs();
  for (const r of existing) {
    if (r.name === jobName) {
      await queue.removeRepeatableByKey(r.key);
    }
  }
  await queue.add(jobName, {}, {
    repeat: { every },
    jobId,
    removeOnComplete: 100,
    removeOnFail: 100,
  });
}

async function main() {
  // ── miner-sync ──
  const minerSyncQueue = new Queue('miner-sync', { connection: bullmqConnection });
  await registerRepeatable(minerSyncQueue, 'tick', MINER_SYNC_INTERVAL_MS, 'miner-sync-repeat');

  const minerSyncWorker = new Worker('miner-sync', runMinerSync, {
    connection: bullmqConnection,
    concurrency: 1,
  });

  minerSyncWorker.on('failed', (job, err) => {
    console.error(`[worker:miner-sync] job ${job?.id} failed:`, err.message);
  });

  // 启动后立即跑一次 miner-sync
  await minerSyncQueue.add('boot', {}, { removeOnComplete: true });

  // ── snapshot-prune ──
  const pruneQueue = new Queue('snapshot-prune', { connection: bullmqConnection });
  await registerRepeatable(pruneQueue, 'tick', SNAPSHOT_PRUNE_INTERVAL_MS, 'snapshot-prune-repeat');

  const pruneWorker = new Worker('snapshot-prune', runSnapshotPrune, {
    connection: bullmqConnection,
    concurrency: 1,
  });

  pruneWorker.on('failed', (job, err) => {
    console.error(`[worker:snapshot-prune] job ${job?.id} failed:`, err.message);
  });

  // 启动后立即跑一次 prune
  await pruneQueue.add('boot', {}, { removeOnComplete: true });

  console.log(
    `[worker] up — miner-sync every ${MINER_SYNC_INTERVAL_MS / 1000}s, ` +
    `snapshot-prune every ${SNAPSHOT_PRUNE_INTERVAL_MS / 3600_000}h`,
  );

  // ── 优雅停机 ──
  const shutdown = async (signal: string) => {
    console.log(`[worker] received ${signal}, shutting down...`);
    await Promise.allSettled([
      minerSyncWorker.close(),
      pruneWorker.close(),
      minerSyncQueue.close(),
      pruneQueue.close(),
    ]);
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((e) => {
  console.error('[worker] startup failed:', e);
  process.exit(1);
});
