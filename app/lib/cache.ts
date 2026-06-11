/**
 * Redis 缓存工具 — 替代原 Cloudflare Workers `caches.default` 的角色
 *
 * 设计要点：
 * - 单例懒加载客户端：避免 dev server 热重载产生多连接
 * - Redis 不可达时降级到直接执行 fetcher，永不抛错给上层（可用性 > 命中率）
 * - 不可用状态下后续请求跳过 Redis，避免日志刷屏；连接恢复后自动重新启用
 * - TTL 用 `SET key value EX ttl` 一次性写入，避免两次往返
 */
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let client: Redis | null = null;
let unavailable = false;

function noteUnavailable(err: unknown): void {
  if (unavailable) return; // 已经报告过，重复 error 事件静默
  unavailable = true;
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[cache] Redis unavailable, falling back to no-cache mode: ${msg}`);
}

function getClient(): Redis | null {
  if (unavailable) return null;
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

    client.on('error', noteUnavailable);

    // Redis 后台重连成功后，恢复缓存模式
    client.on('ready', () => {
      if (unavailable) {
        unavailable = false;
        console.info('[cache] Redis reconnected, cache re-enabled');
      }
    });

    return client;
  } catch (e) {
    noteUnavailable(e);
    return null;
  }
}

/**
 * 缓存读取-未命中-写入的通用模板。
 * 返回 `{ data, cached }`，`cached: true` 表示来自 Redis。
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
    } catch {
      // 单次读失败静默吞掉；连接级失败会经 'error' 事件汇总到 noteUnavailable
    }
  }

  // ── 2. fetch ──
  const data = await fetcher();

  // ── 3. 写（失败静默） ──
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(data), 'EX', ttlSec);
    } catch {
      // 同上
    }
  }

  return { data, cached: false };
}
