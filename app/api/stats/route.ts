import { NextResponse } from 'next/server';
import { parseNetworkHashrate } from '../../utils';

// Edge runtime: Cloudflare Pages 使用
export const runtime = 'edge';

// Edge Cache TTL（秒）
const CACHE_TTL_SEC = 20;

// ── 数据获取函数（各自独立，互不影响） ──

/** 从 Pearl OTC 结算 API 获取 PRL 最新成交价 */
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
      return { price, source: 'Pearl OTC', volume: trade.prl ?? null, tradeTime: trade.time };
    }
    return null;
  } catch (e) {
    console.error('[fetchPrlPrice]', e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** 从 SafeTrade API 获取 PRL/USDT 最新价格 */
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
      price, source: 'SafeTrade',
      high: isNaN(high) ? null : high,
      low: isNaN(low) ? null : low,
      volume: isNaN(volume) ? null : volume,
      priceChange: data.price_change_percent ?? null,
    };
  } catch (e) {
    console.error('[fetchSafetradePrice]', e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** 从 OKX Web3 页面抓取 WPRL 价格 */
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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
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
      price, source: 'OKX Web3',
      high: null, low: null,
      volume: isNaN(volume) ? null : volume,
      priceChange: priceChangeMatch ? priceChangeMatch[1] : null,
    };
  } catch (e) {
    console.error('[fetchOkxPrice]', e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** 获取 USD/CNY 实时汇率 */
async function fetchExchangeRate() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal, cache: 'no-store',
    });
    if (!response.ok) return null;
    const data = await response.json();
    const cnyRate = data.rates?.CNY;
    if (cnyRate) {
      const rate = parseFloat(cnyRate);
      if (isNaN(rate) || rate < 5 || rate > 10) return null;
      return { rate, updateTime: data.time_last_update_utc };
    }
    return null;
  } catch (e) {
    console.error('[fetchExchangeRate]', e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** 从 PRLScan API 获取全网统计数据 */
async function fetchNetworkStats() {
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
    const networkHashrateTH = networkHashrateHps / 1e12;
    const dailyGlobalOutput = Math.round(data.reward_24h_grains / 1e8);
    const blocksPerDay = 86400 / avgBlockTimeSec;
    const blockReward = blocksPerDay > 0 ? dailyGlobalOutput / blocksPerDay : 0;
    return { avgBlockTimeSec, networkHashrateTH, blockReward, dailyGlobalOutput };
  } catch (e) {
    console.error('[fetchNetworkStats]', e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** 代理矿池 API 请求 */
async function fetchPoolStats() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('https://pearl.alphapool.tech/api/stats', {
      signal: controller.signal, cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.coins?.[0]?.reward) throw new Error('Invalid pool data');
    return data;
  } catch (e) {
    console.error('[fetchPoolStats]', e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ── 数据组装（任何单个 API 失败不影响整体） ──

async function assembleData(): Promise<Record<string, unknown> | null> {
  // 并行请求所有数据源
  const [poolData, priceData, safetradeData, okxData, exchangeData, networkStatsData] = await Promise.all([
    fetchPoolStats(),
    fetchPrlPrice(),
    fetchSafetradePrice(),
    fetchOkxPrice(),
    fetchExchangeRate(),
    fetchNetworkStats(),
  ]);

  // 调试日志
  console.log('[sync] results:', {
    pool: !!poolData, pearl: !!priceData, safe: !!safetradeData,
    okx: !!okxData, rate: !!exchangeData, net: !!networkStatsData,
  });

  // 至少需要一个数据源成功
  if (!poolData && !priceData && !safetradeData && !okxData && !networkStatsData) {
    console.error('[sync] ALL data sources failed');
    return null;
  }

  // 基础数据对象（矿池数据作为 base，失败则用空壳）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = poolData || { coins: [{}] };

  // ── 注入价格数据（多来源） ──
  const prices: Record<string, unknown> = {};
  if (priceData) prices.pearlOtc = priceData;
  if (safetradeData) prices.safetrade = safetradeData;
  if (okxData) prices.okx = okxData;
  result.prices = prices;

  // 默认价格优先级：Pearl OTC > SafeTrade > OKX Web3
  const defaultPrice = priceData?.price || safetradeData?.price || okxData?.price || null;
  if (defaultPrice && result.coins?.[0]) {
    result.coins[0].price = defaultPrice;
    result.priceSource = priceData ? 'Pearl OTC' : safetradeData ? 'SafeTrade' : 'OKX Web3';
  }

  // ── 注入汇率 ──
  if (exchangeData) {
    result.exchangeRate = parseFloat(exchangeData.rate.toFixed(2));
    result.exchangeRateUpdateTime = exchangeData.updateTime;
  }

  // ── 注入网络统计（优先 PRLScan，降级矿池数据） ──
  if (networkStatsData) {
    const hashrateTH = networkStatsData.networkHashrateTH;
    let networkHashrateStr: string;
    if (hashrateTH >= 1000000) {
      networkHashrateStr = `${(hashrateTH / 1000000).toFixed(2)} EH/s`;
    } else if (hashrateTH >= 1000) {
      networkHashrateStr = `${(hashrateTH / 1000).toFixed(2)} PH/s`;
    } else {
      networkHashrateStr = `${hashrateTH.toFixed(2)} TH/s`;
    }
    const avgSec = networkStatsData.avgBlockTimeSec;
    const avgBlockTime = avgSec >= 60 ? `${(avgSec / 60).toFixed(1)}m` : `${Math.round(avgSec)}s`;
    result.networkStats = {
      networkHashrate: networkHashrateStr,
      networkHashrateTH: hashrateTH,
      blockReward: networkStatsData.blockReward,
      dailyGlobalOutput: networkStatsData.dailyGlobalOutput,
      avgBlockTime,
      hashrateYield: hashrateTH > 0 ? networkStatsData.dailyGlobalOutput / 24 / hashrateTH : 0,
    };
  } else if (poolData) {
    // 降级：使用矿池数据
    const coinData = poolData.coins?.[0] || {};
    const blockReward = parseFloat(coinData.reward) || 2681.69;
    const networkHashStr = coinData.network_hash || '';
    const networkHashrateTH = parseNetworkHashrate(networkHashStr);
    const blocksPerDay = 86400 / 124.77;
    const dailyGlobalOutput = Math.round(blocksPerDay * blockReward);
    result.networkStats = {
      networkHashrate: networkHashStr || 'N/A',
      networkHashrateTH,
      blockReward,
      dailyGlobalOutput,
      avgBlockTime: coinData.ttfLabel || 'N/A',
      hashrateYield: networkHashrateTH > 0 ? dailyGlobalOutput / 24 / networkHashrateTH : 0,
    };
  } else {
    result.networkStats = {
      networkHashrate: 'N/A', networkHashrateTH: 0,
      blockReward: 0, dailyGlobalOutput: 0,
      avgBlockTime: 'N/A', hashrateYield: 0,
    };
  }

  result.lastSyncTime = Math.floor(Date.now() / 1000);
  return result;
}

// ── Edge Cache 工具函数 ──

function getEdgeCache(): Cache | null {
  try {
    return (caches as unknown as { default: Cache }).default;
  } catch {
    return null;
  }
}

function getCacheKey(request: Request): string {
  const url = new URL(request.url);
  url.search = ''; // 去掉 ?t= 时间戳，确保命中同一条缓存
  return url.toString();
}

// ── GET Handler ──

export async function GET(request: Request) {
  const clientHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store',
  };

  try {
    const edgeCache = getEdgeCache();
    const cacheKey = getCacheKey(request);

    // ── 1. 优先读 Edge Cache（前端请求不触发任何外部 API 调用） ──
    if (edgeCache) {
      try {
        const cached = await edgeCache.match(cacheKey);
        if (cached) {
          const body = await cached.json();
          return NextResponse.json({ ...body, cached: true }, { headers: clientHeaders });
        }
      } catch (e) {
        console.warn('[cache:read]', e);
      }
    }

    // ── 2. 缓存未命中 — 从外部 API 获取并组装数据 ──
    const data = await assembleData();

    if (!data) {
      return NextResponse.json(
        { error: 'Failed to fetch data', lastSuccessfulFetchTime: null },
        { status: 502, headers: clientHeaders }
      );
    }

    // ── 3. 写入 Edge Cache（后续请求直接命中，不再调用外部 API） ──
    if (edgeCache) {
      try {
        const cacheResp = new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `s-maxage=${CACHE_TTL_SEC}`,
          },
        });
        await edgeCache.put(cacheKey, cacheResp);
      } catch (e) {
        console.warn('[cache:write]', e);
      }
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
