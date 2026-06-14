/**
 * 行情缓存层
 *
 * 三类数据走 Redis：depth / trades / ticker
 * - worker 每 5s 拉 safe.trade 后写入（setMarketCache）
 * - Next.js /api/market/snapshot 读取（getMarketSnapshot）
 *
 * TTL 30s 兜底：worker 正常 5s 覆盖；worker 挂掉时 30s 内仍能返陈旧数据，
 * 30s 后客户端拿到 null，前端显示「数据陈旧」。
 *
 * Redis 不可用时静默降级（同 lib/cache.ts）。
 */
import Redis from 'ioredis';

import type { DepthData, KlinePoint, PriceData, TradeRow } from './data-sources';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const TTL_SEC = 30;
/** K 线缓存 TTL：所有周期都给 10 分钟，足够 worker 60s 节奏覆盖 */
const KLINE_TTL_SEC = 600;

const KEY_DEPTH = 'pearl:market:depth';
const KEY_TRADES = 'pearl:market:trades';
const KEY_TICKER = 'pearl:market:ticker';
const klineKey = (period: number) => `pearl:kline:${period}`;

let client: Redis | null = null;
let unavailable = false;

function noteUnavailable(err: unknown): void {
  if (unavailable) return;
  unavailable = true;
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[market-cache] Redis unavailable: ${msg}`);
}

function getClient(): Redis | null {
  if (unavailable) return null;
  if (client) return client;

  try {
    client = new Redis(REDIS_URL, {
      connectTimeout: 2000,
      commandTimeout: 2000,
      maxRetriesPerRequest: 2,
      // Worker 长连，启动竞态时把命令缓冲到 ready 后再发；上游 5s 间隔不会堆积
      enableOfflineQueue: true,
      lazyConnect: false,
    });
    client.on('error', noteUnavailable);
    client.on('ready', () => {
      if (unavailable) {
        unavailable = false;
        console.info('[market-cache] Redis reconnected');
      }
    });
    return client;
  } catch (e) {
    noteUnavailable(e);
    return null;
  }
}

export interface MarketSnapshot {
  depth: DepthData | null;
  trades: TradeRow[] | null;
  ticker: PriceData | null;
  /** 任意一个数据源最新一次同步时间；可用于前端检测 stale */
  syncedAt: number | null;
}

/** worker 调用：写三类数据到 Redis */
export async function setMarketCache(data: {
  depth: DepthData | null;
  trades: TradeRow[] | null;
  ticker: PriceData | null;
}): Promise<void> {
  const redis = getClient();
  if (!redis) return;

  // 失败的字段不覆盖（保留上次成功值，避免一次 worker 失败把全部清空）
  const ops: Promise<unknown>[] = [];
  const now = Date.now();
  if (data.depth) {
    ops.push(redis.set(KEY_DEPTH, JSON.stringify(data.depth), 'EX', TTL_SEC));
  }
  if (data.trades) {
    ops.push(redis.set(KEY_TRADES, JSON.stringify(data.trades), 'EX', TTL_SEC));
  }
  if (data.ticker) {
    // ticker 加上 syncedAt 字段供前端用
    const wrapped = { ...data.ticker, syncedAt: now };
    ops.push(redis.set(KEY_TICKER, JSON.stringify(wrapped), 'EX', TTL_SEC));
  }
  try {
    await Promise.all(ops);
  } catch (e) {
    console.warn('[market-cache:set] write failed:', e instanceof Error ? e.message : e);
  }
}

/** Next.js route 调用：读三类数据合并 */
export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const redis = getClient();
  if (!redis) {
    return { depth: null, trades: null, ticker: null, syncedAt: null };
  }

  try {
    const [depthRaw, tradesRaw, tickerRaw] = await redis.mget(KEY_DEPTH, KEY_TRADES, KEY_TICKER);
    const depth = depthRaw ? (JSON.parse(depthRaw) as DepthData) : null;
    const trades = tradesRaw ? (JSON.parse(tradesRaw) as TradeRow[]) : null;
    let ticker: (PriceData & { syncedAt?: number }) | null = null;
    if (tickerRaw) {
      ticker = JSON.parse(tickerRaw);
    }
    const syncedAt = ticker?.syncedAt ?? null;
    if (ticker) delete (ticker as { syncedAt?: number }).syncedAt;

    return { depth, trades, ticker, syncedAt };
  } catch (e) {
    console.warn('[market-cache:get] read failed:', e instanceof Error ? e.message : e);
    return { depth: null, trades: null, ticker: null, syncedAt: null };
  }
}

// ── K 线缓存 ──

/** worker 调用：写指定周期的 K 线到 Redis */
export async function setKlineCache(period: number, klines: KlinePoint[]): Promise<void> {
  const redis = getClient();
  if (!redis) return;
  try {
    await redis.set(klineKey(period), JSON.stringify(klines), 'EX', KLINE_TTL_SEC);
  } catch (e) {
    console.warn(
      `[market-cache:setKline] period=${period} failed:`,
      e instanceof Error ? e.message : e,
    );
  }
}

/** Next.js route 调用：读指定周期的 K 线；不存在返回 null */
export async function getKlineCache(period: number): Promise<KlinePoint[] | null> {
  const redis = getClient();
  if (!redis) return null;
  try {
    const raw = await redis.get(klineKey(period));
    if (!raw) return null;
    const data = JSON.parse(raw) as KlinePoint[];
    return Array.isArray(data) ? data : null;
  } catch (e) {
    console.warn(
      `[market-cache:getKline] period=${period} failed:`,
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}
