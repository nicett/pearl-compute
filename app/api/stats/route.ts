import { NextResponse } from 'next/server';
import { parseNetworkHashrate } from '../../utils';

// Edge runtime: Cloudflare Pages 生产环境使用，本地 dev 用 Node.js 避免热更新失败
export const runtime = 'edge';

// API 响应类型
interface PriceData {
  price: number;
  source: string;
  tradeId?: number;
  tradeTime?: string;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
  priceChange?: string | null;
}



interface PoolData {
  coins?: Array<{
    reward: string;
    price?: number;
    network_hash?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

interface CachedData extends PoolData {
  prices: Record<string, PriceData>;
  priceSource?: string;
  exchangeRate?: number;
  exchangeRateUpdateTime?: string;
  lastSyncTime?: number;
  cached?: boolean;
  stale?: boolean;
  // Phase 1 扩展
  networkStats: {
    networkHashrate: string;
    networkHashrateTH: number;
    blockReward: number;
    dailyGlobalOutput: number;
  };
}

// 内存缓存
let cachedData: CachedData | null = null;
let lastFetchTime = 0;
let lastSuccessfulFetchTime = 0; // 最后一次成功获取数据的时间
const CACHE_TTL = 20 * 1000; // 20 秒



// 从 Pearl OTC 结算 API 获取 PRL 最新成交价
async function fetchPrlPrice() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      'https://pearl-otc.com/api/stats/settlements?limit=1',
      { signal: controller.signal, cache: 'no-store' }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const trade = data.settlements?.[0];

    if (trade?.price) {
      const price = parseFloat(trade.price);
      if (isNaN(price) || price <= 0 || price > 1000) return null;

      return {
        price,
        source: 'Pearl OTC',
        volume: trade.prl ?? null,
        tradeTime: trade.time,
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch PRL price:', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// 从 SafeTrade API 获取 PRL/USDT 最新价格
async function fetchSafetradePrice() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(
      'https://safe.trade/api/v2/trade/public/tickers/prlusdt',
      {
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const price = parseFloat(data.last);

    if (isNaN(price) || price <= 0 || price > 1000) return null;

    const high = parseFloat(data.high);
    const low = parseFloat(data.low);
    const volume = parseFloat(data.volume);

    return {
      price,
      source: 'SafeTrade',
      high: isNaN(high) ? null : high,
      low: isNaN(low) ? null : low,
      volume: isNaN(volume) ? null : volume,
      priceChange: data.price_change_percent ?? null,
    };
  } catch (error) {
    console.error('Failed to fetch SafeTrade price:', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// 从 OKX Web3 页面抓取 WPRL 价格（链上聚合数据）
async function fetchOkxPrice() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(
      'https://web3.ouyishozyk.com/zh-hans/token/ethereum/0x07696dcab55e62cfef953666b29fe1970518cb00',
      {
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'text/html',
        },
      }
    );

    if (!response.ok) return null;

    const html = await response.text();

    const priceMatch = html.match(/"price":"([0-9.]+)"/);
    if (!priceMatch) return null;

    const price = parseFloat(priceMatch[1]);
    if (isNaN(price) || price <= 0 || price > 1000) return null;

    const volumeMatch = html.match(/"volume":"([0-9.]+)"/);
    const priceChangeMatch = html.match(/"priceChange24H":"(-?[0-9.]+)"/);

    const volume = volumeMatch ? parseFloat(volumeMatch[1]) : NaN;

    return {
      price,
      source: 'OKX Web3',
      high: null,
      low: null,
      volume: isNaN(volume) ? null : volume,
      priceChange: priceChangeMatch ? priceChangeMatch[1] : null,
    };
  } catch (error) {
    console.error('Failed to fetch OKX price:', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// 获取 USD/CNY 实时汇率
async function fetchExchangeRate() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = await response.json();
    const cnyRate = data.rates?.CNY;

    if (cnyRate) {
      const rate = parseFloat(cnyRate);
      if (isNaN(rate) || rate < 5 || rate > 10) return null;

      return {
        rate,
        updateTime: data.time_last_update_utc,
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// 从 PRLScan API 获取全网统计数据
interface PrlScanData {
  avgBlockTimeSec: number;
  difficulty: number;
  networkHashrateHps: number;
  networkHashrateTH: number;
  blockReward: number;
  dailyGlobalOutput: number;
  latestHeight: number;
}

async function fetchNetworkStats(): Promise<PrlScanData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      `https://api.prlscan.com/v1/analytics/summary?window_blocks=50&_t=${Date.now()}`,
      { signal: controller.signal, cache: 'no-store' }
    );

    if (!response.ok) return null;

    const data = await response.json();

    const avgBlockTimeSec = data.avg_block_time_seconds;
    const networkHashrateHps = data.estimated_hashrate_hps;
    const reward24hGrains = data.reward_24h_grains;

    // H/s → TH/s (1 TH = 10^12 H)
    const networkHashrateTH = networkHashrateHps / 1e12;

    // grains → PRL (1 PRL = 10^8 grains)
    const dailyGlobalOutput = Math.round(reward24hGrains / 1e8);

    // 反推单块奖励：日产出 / 每日出块数
    const blocksPerDay = 86400 / avgBlockTimeSec;
    const blockReward = blocksPerDay > 0 ? dailyGlobalOutput / blocksPerDay : 0;

    return {
      avgBlockTimeSec,
      difficulty: data.current_difficulty,
      networkHashrateHps,
      networkHashrateTH,
      blockReward,
      dailyGlobalOutput,
      latestHeight: data.latest_height,
    };
  } catch (error) {
    console.error('Failed to fetch PRLScan network stats:', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// 代理矿池 API 请求
async function fetchPoolStats() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('https://pearl.alphapool.tech/api/stats', {
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();

    if (!data.coins?.[0]?.reward) {
      throw new Error('Invalid pool data: missing reward');
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch pool stats:', error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// 获取最新数据（带内存缓存，Edge Runtime 下为尽力缓存）
async function getFreshData() {
  const now = Date.now();

  // 缓存未过期，直接返回（同一 isolate 内有效）
  if (cachedData && now - lastFetchTime < CACHE_TTL) {
    return { ...cachedData, cached: true };
  }

  // 发起新请求
  return await doFetchAndCache(now);
}

// 实际的 fetch + 缓存逻辑（从 getFreshData 中拆出）
async function doFetchAndCache(now: number): Promise<CachedData | null> {
  // 并行请求所有数据
  const [poolData, priceData, safetradeData, okxData, exchangeData, networkStatsData] = await Promise.all([
    fetchPoolStats(),
    fetchPrlPrice(),
    fetchSafetradePrice(),
    fetchOkxPrice(),
    fetchExchangeRate(),
    fetchNetworkStats(),
  ]);

  // 如果矿池数据获取失败，返回旧缓存
  if (!poolData) {
    if (cachedData) {
      return { ...cachedData, cached: true, stale: true };
    }
    return null;
  }

  // 如果所有价格源都失败且有旧缓存，延长旧缓存有效期（避免空价格覆盖好数据）
  if (!priceData && !safetradeData && !okxData && cachedData?.coins?.[0]?.price) {
    return { ...cachedData, cached: true, stale: true };
  }

  // 注入价格数据（多来源）
  const prices: Record<string, PriceData> = {};

  if (priceData) {
    prices.pearlOtc = priceData;
  } else if (cachedData?.prices?.pearlOtc) {
    prices.pearlOtc = cachedData.prices.pearlOtc;
  }

  if (safetradeData) {
    prices.safetrade = safetradeData;
  } else if (cachedData?.prices?.safetrade) {
    prices.safetrade = cachedData.prices.safetrade;
  }

  if (okxData) {
    prices.okx = okxData;
  } else if (cachedData?.prices?.okx) {
    prices.okx = cachedData.prices.okx;
  }

  poolData.prices = prices;

  // 默认价格优先级：Pearl OTC > SafeTrade > OKX Web3
  const defaultPrice = prices.pearlOtc?.price || prices.safetrade?.price || prices.okx?.price || null;
  if (defaultPrice && poolData.coins?.[0]) {
    poolData.coins[0].price = defaultPrice;
    poolData.priceSource = prices.pearlOtc ? 'Pearl OTC' : prices.safetrade ? 'SafeTrade' : 'OKX Web3';
  } else if (cachedData?.coins?.[0]?.price) {
    poolData.coins[0].price = cachedData.coins[0].price;
    poolData.priceSource = cachedData.priceSource;
  }

  // 注入汇率数据（保留两位小数）
  if (exchangeData) {
    poolData.exchangeRate = parseFloat(exchangeData.rate.toFixed(2));
    poolData.exchangeRateUpdateTime = exchangeData.updateTime;
  } else if (cachedData?.exchangeRate) {
    // 保留旧的汇率数据
    poolData.exchangeRate = cachedData.exchangeRate;
    poolData.exchangeRateUpdateTime = cachedData.exchangeRateUpdateTime;
  }



  // ---- 网络统计（优先使用 PRLScan 全网数据，降级到矿池数据） ----
  if (networkStatsData) {
    // 格式化算力显示
    const hashrateTH = networkStatsData.networkHashrateTH;
    let networkHashrateStr: string;
    if (hashrateTH >= 1000000) {
      networkHashrateStr = `${(hashrateTH / 1000000).toFixed(2)} EH/s`;
    } else if (hashrateTH >= 1000) {
      networkHashrateStr = `${(hashrateTH / 1000).toFixed(2)} PH/s`;
    } else {
      networkHashrateStr = `${hashrateTH.toFixed(2)} TH/s`;
    }

    // 格式化出块时间
    const avgSec = networkStatsData.avgBlockTimeSec;
    const avgBlockTime = avgSec >= 60
      ? `${(avgSec / 60).toFixed(1)}m`
      : `${Math.round(avgSec)}s`;

    poolData.networkStats = {
      networkHashrate: networkHashrateStr,
      networkHashrateTH: hashrateTH,
      blockReward: networkStatsData.blockReward,
      dailyGlobalOutput: networkStatsData.dailyGlobalOutput,
      avgBlockTime,
      hashrateYield: networkStatsData.dailyGlobalOutput / 24 / hashrateTH,
    };
  } else {
    // 降级：使用矿池数据
    const coinData = poolData.coins?.[0] || {};
    const blockReward = parseFloat(coinData.reward) || 2681.69;
    const networkHashStr = coinData.network_hash || '';
    const networkHashrateTH = parseNetworkHashrate(networkHashStr);

    const BLOCK_TIME_SEC = 124.77;
    const blocksPerDay = (24 * 3600) / BLOCK_TIME_SEC;
    const dailyGlobalOutput = blocksPerDay * blockReward;

    poolData.networkStats = {
      networkHashrate: networkHashStr || 'N/A',
      networkHashrateTH,
      blockReward,
      dailyGlobalOutput: Math.round(dailyGlobalOutput),
      avgBlockTime: coinData.ttfLabel || 'N/A',
      hashrateYield: networkHashrateTH > 0 ? dailyGlobalOutput / 24 / networkHashrateTH : 0,
    };
  }



  // 记录同步时间（Unix 时间戳，秒）
  lastSuccessfulFetchTime = now;
  poolData.lastSyncTime = Math.floor(now / 1000);

  // 更新缓存
  cachedData = poolData;
  lastFetchTime = now;

  return poolData;
}

export async function GET(request: Request) {
  const clientHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store',
  };

  try {
    // 构造缓存 key（去掉前端 ?t= 时间戳，确保命中同一条缓存）
    const cacheUrl = new URL(request.url);
    cacheUrl.search = '';
    const cacheKey = cacheUrl.toString();

    // ---- 1. 尝试从 Edge Cache 读取（前端请求不触发任何外部 API 调用） ----
    let edgeCache: Cache | null = null;
    try {
      edgeCache = (caches as unknown as { default: Cache }).default;
      const cached = await edgeCache.match(cacheKey);
      if (cached) {
        const body = await cached.json();
        return NextResponse.json({ ...body, cached: true }, { headers: clientHeaders });
      }
    } catch {
      // Edge Cache 不可用（本地 dev 等），降级到直接获取
    }

    // ---- 2. 缓存未命中 — 从外部 API 获取数据 ----
    const data = await getFreshData();

    if (!data) {
      return NextResponse.json(
        {
          error: 'Failed to fetch data',
          lastSuccessfulFetchTime: lastSuccessfulFetchTime
            ? Math.floor(lastSuccessfulFetchTime / 1000)
            : null,
        },
        { status: 502, headers: clientHeaders }
      );
    }

    // ---- 3. 写入 Edge Cache（后续前端请求将直接命中，不再调用外部 API） ----
    if (edgeCache) {
      try {
        const cacheResp = new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `s-maxage=${CACHE_TTL / 1000}`,
          },
        });
        await edgeCache.put(cacheKey, cacheResp);
      } catch {}
    }

    return NextResponse.json(data, { headers: clientHeaders });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
