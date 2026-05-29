import { NextResponse } from 'next/server';

export const runtime = 'edge';

// 内存缓存
let cachedData: any = null;
let lastFetchTime = 0;
let lastSuccessfulFetchTime = 0; // 最后一次成功获取数据的时间
const CACHE_TTL = 10 * 1000; // 10 秒

// 从 Pearl OTC API 获取 PRL 最新成交价
async function fetchPrlPrice() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      'https://api.pearl-otc.com/trades/public/all?limit=1&offset=0',
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    const trade = data.trades?.[0];

    if (trade?.price_per_prl_usdc) {
      const price = parseFloat(trade.price_per_prl_usdc);
      // 验证价格合理性
      if (isNaN(price) || price <= 0 || price > 1000) return null;

      return {
        price,
        source: 'Pearl OTC',
        tradeId: trade.id,
        tradeTime: trade.completed_at,
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch PRL price:', error);
    return null;
  }
}

// 获取 USD/CNY 实时汇率
async function fetchExchangeRate() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    const cnyRate = data.rates?.CNY;

    if (cnyRate) {
      const rate = parseFloat(cnyRate);
      // 验证汇率合理性（1 USD 应该在 5-10 CNY 之间）
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
  }
}

// 代理矿池 API 请求
async function fetchPoolStats() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://pearl.alphapool.tech/api/stats', {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();

    // 验证必要字段
    if (!data.coins?.[0]?.reward) {
      throw new Error('Invalid pool data: missing reward');
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch pool stats:', error);
    return null;
  }
}

// 获取最新数据（带缓存）
async function getFreshData() {
  const now = Date.now();

  // 缓存未过期，直接返回
  if (cachedData && now - lastFetchTime < CACHE_TTL) {
    return { ...cachedData, cached: true };
  }

  // 并行请求所有数据
  const [poolData, priceData, exchangeData] = await Promise.all([
    fetchPoolStats(),
    fetchPrlPrice(),
    fetchExchangeRate(),
  ]);

  // 如果矿池数据获取失败，返回旧缓存
  if (!poolData) {
    if (cachedData) {
      return { ...cachedData, cached: true, stale: true };
    }
    return null;
  }

  // 注入价格数据
  if (priceData && poolData.coins?.[0]) {
    poolData.coins[0].price = priceData.price;
    poolData.priceSource = priceData.source;
    poolData.tradeId = priceData.tradeId;
    poolData.tradeTime = priceData.tradeTime;
  } else if (cachedData?.coins?.[0]?.price) {
    // 保留旧的价格数据
    poolData.coins[0].price = cachedData.coins[0].price;
    poolData.priceSource = cachedData.priceSource;
    poolData.tradeId = cachedData.tradeId;
    poolData.tradeTime = cachedData.tradeTime;
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

  // 记录同步时间（Unix 时间戳，秒）
  lastSuccessfulFetchTime = now;
  poolData.lastSyncTime = Math.floor(now / 1000);

  // 更新缓存
  cachedData = poolData;
  lastFetchTime = now;

  return poolData;
}

export async function GET() {
  try {
    const data = await getFreshData();

    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'CDN-Cache-Control': 'no-store',
      'Cloudflare-CDN-Cache-Control': 'no-store',
    };

    if (!data) {
      return NextResponse.json(
        {
          error: 'Failed to fetch data',
          lastSuccessfulFetchTime: lastSuccessfulFetchTime
            ? Math.floor(lastSuccessfulFetchTime / 1000)
            : null,
        },
        { status: 502, headers }
      );
    }

    return NextResponse.json(data, { headers });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
