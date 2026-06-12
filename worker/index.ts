/**
 * Worker 进程入口
 *
 * 跑法：
 *   npm run worker          # dev：tsx
 *   npm run worker:build    # 编译到 worker/dist/
 *   npm run worker:start    # prod：node worker/dist/index.js（PM2 启动它）
 *
 * 职责：
 * - 注册定时任务（miner-sync 每 5 分钟）
 * - 启动 Worker 消费队列
 * - 处理优雅停机（SIGTERM）
 */
import 'dotenv/config';
import { Queue, Worker } from 'bullmq';

import { bullmqConnection } from './lib/redis';
import { runMinerSync } from './jobs/miner-sync';

const SYNC_INTERVAL_MS = 5 * 60_000; // 5 分钟

async function main() {
  // ── miner-sync 队列 ──
  const minerSyncQueue = new Queue('miner-sync', { connection: bullmqConnection });
  // 先清掉旧的 repeatable jobs（防 every 改了之后留下幽灵）
  const existingRepeats = await minerSyncQueue.getRepeatableJobs();
  for (const r of existingRepeats) {
    await minerSyncQueue.removeRepeatableByKey(r.key);
  }
  // 注册定时
  await minerSyncQueue.add(
    'tick',
    {},
    {
      repeat: { every: SYNC_INTERVAL_MS },
      jobId: 'miner-sync-repeat',
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  );

  // ── miner-sync 消费者 ──
  const minerSyncWorker = new Worker('miner-sync', runMinerSync, {
    connection: bullmqConnection,
    concurrency: 1, // 一次只跑一轮，避免重复
  });

  minerSyncWorker.on('failed', (job, err) => {
    console.error(`[worker] job ${job?.id} failed:`, err.message);
  });

  // 启动后立即跑一次（不等 5 分钟）
  await minerSyncQueue.add('boot', {}, { removeOnComplete: true });

  console.log(`[worker] up — miner-sync every ${SYNC_INTERVAL_MS / 1000}s`);

  // ── 优雅停机 ──
  const shutdown = async (signal: string) => {
    console.log(`[worker] received ${signal}, shutting down...`);
    await minerSyncWorker.close();
    await minerSyncQueue.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((e) => {
  console.error('[worker] startup failed:', e);
  process.exit(1);
});
