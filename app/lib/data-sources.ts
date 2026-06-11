/**
 * 共享数据获取层 — 被 API 路由和 server component 同时复用
 *
 * 所有 fetch 函数都是纯函数（不依赖 NextRequest / Response），
 * 可以在任何 Edge Runtime 上下文中运行（API 路由 / Server Component / Middleware）。
 *
 * 任何单个数据源失败都会返回 null 而不抛错，由调用方决定如何降级。
 */

// ── 类型定义 ──

export interface PriceData {
  price: number;
  source: string;
  volume?: number | null;
  high?: number | null;
  low?: number | null;
  priceChange?: string | number | null;
  tradeTime?: string;
}

export interface NetworkStatsRaw {
  avgBlockTimeSec: number;
  networkHashrateTH: number;
  blockReward: number;
  dailyGlobalOutput: number;
}

export interface ExchangeRateData {
  rate: number;
  updateTime?: string;
}

export interface KlinePoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AssembledStatsData {
  coins: Array<{ price?: number }>;
  prices: {
    pearlOtc?: PriceData;
    safetrade?: PriceData;
    okx?: PriceData;
  };
  priceSource?: string;
  exchangeRate?: number;
  exchangeRateUpdateTime?: string;
  networkStats: {
    networkHashrate: string;
    networkHashrateTH: number;
    blockReward: number;
    dailyGlobalOutput: number;
    avgBlockTime: string;
    hashrateYield: number;
  };
  lastSyncTime: number;
}

// ── 价格数据源 ──

/** Pearl OTC 结算 API — PRL 最新成交价 */
export async function fetchPrlPrice(): Promise<PriceData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      'https://pearl-otc.com/api/stats/settlements?limit=1',
      { signal: controller.signal }
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
    if (process.env.NODE_ENV !== 'production') console.error('[fetchPrlPrice]', e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** SafeTrade — PRL/USDT 最新价 */
export async function fetchSafetradePrice(): Promise<PriceData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(
      'https://safe.trade/api/v2/trade/public/tickers/prlusdt',
      {
        signal: controller.signal,
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
    if (process.env.NODE_ENV !== 'production') console.error('[fetchSafetradePrice]', e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** OKX Web3 — WPRL 价格（HTML 抓取） */
export async function fetchOkxPrice(): Promise<PriceData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(
      'https://web3.ouyishozyk.com/zh-hans/token/ethereum/0x07696dcab55e62cfef953666b29fe1970518cb00',
      {
        signal: controller.signal,
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
    if (process.env.NODE_ENV !== 'production') console.error('[fetchOkxPrice]', e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** USD/CNY 实时汇率 */
export async function fetchExchangeRate(): Promise<ExchangeRateData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal });
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
    if (process.env.NODE_ENV !== 'production') console.error('[fetchExchangeRate]', e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** PRLScan API — 全网统计 */
export async function fetchNetworkStats(): Promise<NetworkStatsRaw | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      `https://api.prlscan.com/v1/analytics/summary?window_blocks=50&_t=${Date.now()}`,
      { signal: controller.signal }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const avgBlockTimeSec = data.avg_block_time_seconds;
    const networkHashrateHps = data.estimated_hashrate_hps;
    if (typeof avgBlockTimeSec !== 'number' || typeof networkHashrateHps !== 'number') return null;
    const networkHashrateTH = networkHashrateHps / 1e12;
    const dailyGlobalOutput = Math.round((data.reward_24h_grains || 0) / 1e8);
    const blocksPerDay = avgBlockTimeSec > 0 ? 86400 / avgBlockTimeSec : 0;
    const blockReward = blocksPerDay > 0 ? dailyGlobalOutput / blocksPerDay : 0;
    return { avgBlockTimeSec, networkHashrateTH, blockReward, dailyGlobalOutput };
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.error('[fetchNetworkStats]', e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ── 数据组装（任何单个 API 失败不影响整体） ──

/**
 * 并行抓取所有数据源并拼装为统一返回结构
 * 至少需要一个数据源成功才返回；全部失败返回 null
 */
export async function assembleStatsData(): Promise<AssembledStatsData | null> {
  const [priceData, safetradeData, okxData, exchangeData, networkStatsData] = await Promise.all([
    fetchPrlPrice(),
    fetchSafetradePrice(),
    fetchOkxPrice(),
    fetchExchangeRate(),
    fetchNetworkStats(),
  ]);

  if (!priceData && !safetradeData && !okxData && !networkStatsData) {
    if (process.env.NODE_ENV !== 'production') console.error('[assembleStatsData] ALL data sources failed');
    return null;
  }

  const result: AssembledStatsData = {
    coins: [{}],
    prices: {},
    networkStats: {
      networkHashrate: 'N/A', networkHashrateTH: 0,
      blockReward: 0, dailyGlobalOutput: 0,
      avgBlockTime: 'N/A', hashrateYield: 0,
    },
    lastSyncTime: Math.floor(Date.now() / 1000),
  };

  // ── 注入价格数据 ──
  if (priceData) result.prices.pearlOtc = priceData;
  if (safetradeData) result.prices.safetrade = safetradeData;
  if (okxData) result.prices.okx = okxData;

  const defaultPrice = priceData?.price || safetradeData?.price || okxData?.price || null;
  if (defaultPrice && result.coins[0]) {
    result.coins[0].price = defaultPrice;
    result.priceSource = priceData ? 'Pearl OTC' : safetradeData ? 'SafeTrade' : 'OKX Web3';
  }

  // ── 注入汇率 ──
  if (exchangeData) {
    result.exchangeRate = parseFloat(exchangeData.rate.toFixed(2));
    result.exchangeRateUpdateTime = exchangeData.updateTime;
  }

  // ── 注入网络统计 ──
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
  }

  return result;
}

// ── K 线数据 ──

/** SafeTrade K 线 + 前向填充 */
export async function fetchSafeTradeKlines(): Promise<KlinePoint[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const timeTo = Math.floor(Date.now() / 1000);
    const timeFrom = timeTo - 86400; // 24小时前

    const url = `https://safe.trade/api/v2/trade/public/markets/prlusdt/k-line?period=15&limit=500&time_from=${timeFrom}&time_to=${timeTo}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    if (data.length === 0) return [];

    // Peatio K-line: [ts(秒), open, high, low, close, volume]
    const fetchedKlines: KlinePoint[] = data.map((k: unknown[]) => ({
      time: parseInt(k[0] as string),
      open: parseFloat(k[1] as string),
      high: parseFloat(k[2] as string),
      low: parseFloat(k[3] as string),
      close: parseFloat(k[4] as string),
      volume: parseFloat(k[5] as string),
    })).sort((a, b) => a.time - b.time);

    if (fetchedKlines.length === 0) return [];

    return forwardFillKlines(fetchedKlines, timeFrom, timeTo, 15 * 60);
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.warn('[fetchSafeTradeKlines]', e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 将稀疏 K 线对齐到固定周期网格，缺失的时间槽用上一个收盘价 forward-fill
 * - 输出的 time 严格按 periodSec 步长递增
 * - 缺失槽位的 open/high/low/close 都填 lastKnownPrice，volume = 0
 */
export function forwardFillKlines(
  klines: KlinePoint[],
  timeFrom: number,
  timeTo: number,
  periodSec: number
): KlinePoint[] {
  if (klines.length === 0) return [];

  const alignedTimeFrom = Math.floor(timeFrom / periodSec) * periodSec;
  const alignedTimeTo = Math.floor(timeTo / periodSec) * periodSec;
  const filled: KlinePoint[] = [];
  let dataIdx = 0;
  let lastKnownPrice = klines[0].open;

  for (let t = alignedTimeFrom; t <= alignedTimeTo; t += periodSec) {
    // 把 idx 推进到 t 或之后，沿途记录最新收盘价
    while (dataIdx < klines.length && klines[dataIdx].time < t) {
      lastKnownPrice = klines[dataIdx].close;
      dataIdx++;
    }
    if (dataIdx < klines.length && klines[dataIdx].time === t) {
      const current = klines[dataIdx];
      lastKnownPrice = current.close;
      filled.push(current);
      dataIdx++;
    } else {
      filled.push({
        time: t,
        open: lastKnownPrice, high: lastKnownPrice, low: lastKnownPrice, close: lastKnownPrice,
        volume: 0,
      });
    }
  }
  return filled;
}
