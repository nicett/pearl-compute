/**
 * Web 进程入队 client
 *
 * web 进程在用户新增 binding 时调用 enqueueImmediateSync，
 * 让 worker 立即跑一次同步，而不是等下一个 5min tick。
 *
 * 传连接配置对象（非 Redis 实例），避免与 bullmq 自带 ioredis 类型冲突。
 * Redis 不可达时静默失败：用户首次绑定也能等下一个 tick，不阻塞 API 响应。
 */
import { Queue } from 'bullmq';

function parseRedisUrl(): { host: string; port: number; password?: string; db?: number } {
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  try {
    const u = new URL(url);
    return {
      host: u.hostname || '127.0.0.1',
      port: u.port ? Number(u.port) : 6379,
      password: u.password ? decodeURIComponent(u.password) : undefined,
      db: u.pathname && u.pathname.length > 1 ? Number(u.pathname.slice(1)) : undefined,
    };
  } catch {
    return { host: '127.0.0.1', port: 6379 };
  }
}

let queue: Queue | null = null;

function getQueue(): Queue {
  if (queue) return queue;
  queue = new Queue('miner-sync', { connection: parseRedisUrl() });
  // 不打 error 日志的监听器太重，BullMQ 自己有重试机制
  return queue;
}

export async function enqueueImmediateSync(bindingId: string): Promise<void> {
  try {
    const q = getQueue();
    await q.add(
      'immediate',
      { bindingId },
      { removeOnComplete: true, removeOnFail: true },
    );
  } catch (e) {
    // Redis 不可达：静默吞掉，binding 会被下个 5min tick 拉到
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[queue] enqueue failed (will retry next tick): ${msg}`);
  }
}
