/**
 * Redis 缓存工具 — 替代原 Cloudflare Workers `caches.default` 的角色
 *
 * 设计要点：
 * - 单例懒加载客户端：避免 dev server 热重载产生多连接
 * - Redis 不可达时降级到直接执行 fetcher，永不抛错给上层（可用性 > 命中率）
 * - TTL 用 `SET key value EX ttl` 一次性写入，避免两次往返
 */
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let client: Redis | null = null;
let connectionFailed = false;

function getClient(): Redis | null {
  if (connectionFailed) return null;
  if (client) return client;

  try {
    client = new Redis(REDIS_URL, {
      // 失败快速：单次连接尝试 1s，命令超时 800ms
      // 上游业务接口本身就要 fetch 外网，缓存层不能再拖
      connectTimeout: 1000,
      commandTimeout: 800,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: false,
    });

    client.on('error', (err) => {
      // 只在第一次报错时打印，避免日志刷屏
      if (!connectionFailed) {
        console.warn('[cache] Redis error, falling back to no-cache mode:', err.message);
        connectionFailed = true;
      }
    });

    return client;
  } catch (e) {
    console.warn('[cache] Redis init failed:', e);
    connectionFailed = true;
    return null;
  }
}

/**
 * 缓存读取-未命中-写入的通用模板。
 * 返回 `{ data, cached }`，`cached: true` 表示来自 Redis（前端可用于打标识）。
 * Redis 任何异常都不影响主流程：直接执行 fetcher 返回 `cached: false`。
 */
export async function withRedisCache<T>(
  key: string,
  ttlSec: number,
  fetcher: () => Promise<T>,
): Promise<{ data: T; cached: boolean }> {
  const redis = getClient();

  // ── 1. 读 ──
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        return { data: JSON.parse(cached) as T, cached: true };
      }
    } catch (e) {
      // 单次读失败不影响后续 fetch，也不污染连接状态
      console.warn(`[cache:read] ${key}`, e instanceof Error ? e.message : e);
    }
  }

  // ── 2. fetch ──
  const data = await fetcher();

  // ── 3. 写（失败静默） ──
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(data), 'EX', ttlSec);
    } catch (e) {
      console.warn(`[cache:write] ${key}`, e instanceof Error ? e.message : e);
    }
  }

  return { data, cached: false };
}
