import { NextResponse } from 'next/server';

export const runtime = 'edge';

const CACHE_TTL_SEC = 60; // 1分钟缓存

// 尝试从 SafeTrade 获取 K 线
async function fetchSafeTradeKlines(): Promise<any[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const timeTo = Math.floor(Date.now() / 1000);
    const timeFrom = timeTo - 86400; // 24小时前

    // 按照官方规范，添加 time_from 和 time_to，并设置充足的 limit
    const url = `https://safe.trade/api/v2/trade/public/markets/prlusdt/k-line?period=15&limit=500&time_from=${timeFrom}&time_to=${timeTo}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;

    if (data.length === 0) return [];
    
    // Peatio K-line format: [timestamp(秒), open, high, low, close, volume]
    const fetchedKlines = data.map((k: any) => ({
      time: parseInt(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    })).sort((a, b) => a.time - b.time); // 确保按时间正序

    if (fetchedKlines.length === 0) return [];

    // 时间轴重建与前向填充 (Forward Fill)
    const periodSec = 15 * 60; // 900 秒
    const alignedTimeFrom = Math.floor(timeFrom / periodSec) * periodSec;
    const alignedTimeTo = Math.floor(timeTo / periodSec) * periodSec;
    
    const filledKlines = [];
    let dataIdx = 0;
    let lastKnownPrice = fetchedKlines[0].open; // 如果起始没有数据，默认用拿到的第一个数据

    for (let t = alignedTimeFrom; t <= alignedTimeTo; t += periodSec) {
      // 寻找当前时间点是否有真实数据
      // 注意：API 返回的时间戳不一定完美对齐 900 的倍数，所以允许一定误差或找最近的
      let currentData = null;
      while (dataIdx < fetchedKlines.length && fetchedKlines[dataIdx].time < t) {
        lastKnownPrice = fetchedKlines[dataIdx].close; // 更新 lastKnownPrice 为最新见过的收盘价
        dataIdx++;
      }
      
      if (dataIdx < fetchedKlines.length && fetchedKlines[dataIdx].time === t) {
        currentData = fetchedKlines[dataIdx];
        lastKnownPrice = currentData.close;
        filledKlines.push(currentData);
        dataIdx++;
      } else {
        // 缺失数据，进行 Forward Fill
        filledKlines.push({
          time: t,
          open: lastKnownPrice,
          high: lastKnownPrice,
          low: lastKnownPrice,
          close: lastKnownPrice,
          volume: 0
        });
      }
    }

    return filledKlines;
  } catch (e) {
    console.warn('[SafeTrade K-line]', e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const clientHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store',
  };

  try {
    const klines = await fetchSafeTradeKlines();

    if (!klines || klines.length === 0) {
      return NextResponse.json({ error: 'Failed to fetch chart data from SafeTrade' }, { status: 502, headers: clientHeaders });
    }

    return NextResponse.json({
      source: 'SafeTrade',
      period: 15,
      data: klines
    }, { headers: clientHeaders });

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
