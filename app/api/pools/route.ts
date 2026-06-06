import { NextResponse } from 'next/server';

export const runtime = 'edge';

// 从 PRLScan API 获取矿池列表
async function fetchPools() {
  try {
    const response = await fetch('https://api.prlscan.com/v1/pools', { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    // 过滤24小时内有出块的矿池
    const validPools = data.items.filter((p: { blocks_24h: number }) => p.blocks_24h > 0);
    validPools.sort((a: { blocks_24h: number }, b: { blocks_24h: number }) => b.blocks_24h - a.blocks_24h);
    return validPools;
  } catch { return null; }
}

export async function GET() {
  try {
    const pools = await fetchPools();
    if (!pools) {
      return NextResponse.json({ error: 'Failed to fetch pools data' }, { status: 502 });
    }
    return NextResponse.json({ pools }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    console.error('Pools API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
