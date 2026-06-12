/**
 * BullMQ 连接配置
 *
 * 传配置对象（不传 Redis 实例）给 Queue/Worker，避免 ioredis 双版本类型冲突
 * （bullmq 自带的 ioredis 实例与项目根装的实例不同）。
 *
 * BullMQ 的 maxRetriesPerRequest:null 是它自己内部处理的，传 host/port 时会用其默认值。
 */

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

export const bullmqConnection = parseRedisUrl();
