import { NextResponse } from 'next/server';
import { parseNetworkHashrate } from '../../utils';

export const runtime = 'edge';

// 从 Pearl OTC 获取价格
async function fetchPrlPrice() {
  try {
    const response = await fetch('https://pearl-otc.com/api/stats/settlements?limit=1', { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    const trade = data.settlements?.[0];
    if (trade?.price) {
      const price = parseFloat(trade.price);
      if (isNaN(price) || price <= 0 || price > 1000) return null;
      return { price, source: 'Pearl OTC', volume: trade.prl ?? null, tradeTime: trade.time };
    }
    return null;
  } catch { return null; }
}

// 从 SafeTrade 获取价格
async function fetchSafetradePrice() {
  try {
    const response = await fetch('https://safe.trade/api/v2/trade/public/tickers/prlusdt', { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    const price = parseFloat(data.last);
    if (isNaN(price) || price <= 0 || price > 1000) return null;
    return { price, source: 'SafeTrade', high: parseFloat(data.high) || null, low: parseFloat(data.low) || null, volume: parseFloat(data.volume) || null, priceChange: data.price_change_percent ?? null };
  } catch { return null; }
}

// 从 PRLScan 获取网络统计
async function fetchNetworkStats() {
  try {
    const response = await fetch('https://api.prlscan.com/v1/analytics/summary?window_blocks=50', { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    const networkHashrateTH = data.estimated_hashrate_hps / 1e12;
    const dailyGlobalOutput = Math.round(data.reward_24h_grains / 1e8);
    const blocksPerDay = 86400 / data.avg_block_time_seconds;
    return { networkHashrateTH, blockReward: blocksPerDay > 0 ? dailyGlobalOutput / blocksPerDay : 0, dailyGlobalOutput, avgBlockTimeSec: data.avg_block_time_seconds };
  } catch { return null; }
}

// 从矿池获取数据
async function fetchPoolStats() {
  try {
    const response = await fetch('https://pearl.alphapool.tech/api/stats', { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.coins?.[0]?.reward) return null;
    return data;
  } catch { return null; }
}

// 获取汇率
async function fetchExchangeRate() {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    const rate = parseFloat(data.rates?.CNY);
    if (isNaN(rate) || rate < 5 || rate > 10) return null;
    return { rate, updateTime: data.time_last_update_utc };
  } catch { return null; }
}

export async function GET() {
  try {
    const [poolData, priceData, safetradeData, exchangeData, networkStatsData] = await Promise.all([
      fetchPoolStats(),
      fetchPrlPrice(),
      fetchSafetradePrice(),
      fetchExchangeRate(),
      fetchNetworkStats(),
    ]);

    if (!poolData) {
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 502 });
    }

    // 注入价格
    const prices: Record<string, unknown> = {};
    if (priceData) prices.pearlOtc = priceData;
    if (safetradeData) prices.safetrade = safetradeData;
    poolData.prices = prices;

    const defaultPrice = priceData?.price || safetradeData?.price || null;
    if (defaultPrice && poolData.coins?.[0]) {
      poolData.coins[0].price = defaultPrice;
      poolData.priceSource = priceData ? 'Pearl OTC' : 'SafeTrade';
    }

    // 注入汇率
    if (exchangeData) {
      poolData.exchangeRate = parseFloat(exchangeData.rate.toFixed(2));
    }

    // 注入网络统计
    if (networkStatsData) {
      const hashrateTH = networkStatsData.networkHashrateTH;
      const avgSec = networkStatsData.avgBlockTimeSec;
      poolData.networkStats = {
        networkHashrate: hashrateTH >= 1000000 ? `${(hashrateTH / 1000000).toFixed(2)} EH/s` : hashrateTH >= 1000 ? `${(hashrateTH / 1000).toFixed(2)} PH/s` : `${hashrateTH.toFixed(2)} TH/s`,
        networkHashrateTH: hashrateTH,
        blockReward: networkStatsData.blockReward,
        dailyGlobalOutput: networkStatsData.dailyGlobalOutput,
        avgBlockTime: avgSec >= 60 ? `${(avgSec / 60).toFixed(1)}m` : `${Math.round(avgSec)}s`,
        hashrateYield: hashrateTH > 0 ? networkStatsData.dailyGlobalOutput / 24 / hashrateTH : 0,
      };
    } else {
      const coinData = poolData.coins?.[0] || {};
      const networkHashrateTH = parseNetworkHashrate(coinData.network_hash || '');
      const blocksPerDay = 86400 / 124.77;
      const dailyGlobalOutput = Math.round(blocksPerDay * (parseFloat(coinData.reward) || 2681.69));
      poolData.networkStats = {
        networkHashrate: coinData.network_hash || 'N/A',
        networkHashrateTH,
        blockReward: parseFloat(coinData.reward) || 2681.69,
        dailyGlobalOutput,
        avgBlockTime: coinData.ttfLabel || 'N/A',
        hashrateYield: networkHashrateTH > 0 ? dailyGlobalOutput / 24 / networkHashrateTH : 0,
      };
    }

    poolData.lastSyncTime = Math.floor(Date.now() / 1000);
    poolData.priceHistory = [];

    return NextResponse.json(poolData, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
