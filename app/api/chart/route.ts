import { NextResponse } from 'next/server';

export const runtime = 'edge';

const CACHE_TTL_SEC = 60; // 1分钟缓存

// 尝试从 SafeTrade 获取 K 线
async function fetchSafeTradeKlines(): Promise<any[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    // Peatio 标准 K 线接口，period=60分钟 (1H)，limit=100
    const res = await fetch('https://safe.trade/api/v2/trade/public/markets/prlusdt/k-line?period=60&limit=100', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    
    // Peatio K-line format: [timestamp(秒), open, high, low, close, volume]
    return data.map((k: any) => ({
      time: parseInt(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    })).sort((a, b) => a.time - b.time); // 确保按时间正序
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
      period: 60,
      data: klines
    }, { headers: clientHeaders });

  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
