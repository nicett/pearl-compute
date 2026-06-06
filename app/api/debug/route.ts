import { NextResponse } from 'next/server';

export const runtime = 'edge';

// 诊断端点：测试从 Cloudflare Edge 访问各上游 API 的连通性
export async function GET() {
  const targets = [
    { name: 'pearl-otc', url: 'https://pearl-otc.com/api/stats/settlements?limit=1' },
    { name: 'prlscan-stats', url: 'https://api.prlscan.com/v1/analytics/summary?window_blocks=50' },
    { name: 'prlscan-pools', url: 'https://api.prlscan.com/v1/pools' },
    { name: 'exchange-rate', url: 'https://open.er-api.com/v6/latest/USD' },
    { name: 'safetrade', url: 'https://safe.trade/api/v2/trade/public/tickers/prlusdt' },
  ];

  const results: Record<string, unknown>[] = [];

  for (const t of targets) {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(t.url, {
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      clearTimeout(timeout);
      const bodyText = await resp.text();
      results.push({
        name: t.name,
        status: resp.status,
        ms: Date.now() - start,
        bodyLength: bodyText.length,
        bodyPreview: bodyText.substring(0, 200),
      });
    } catch (e) {
      results.push({
        name: t.name,
        error: e instanceof Error ? e.message : String(e),
        ms: Date.now() - start,
      });
    }
  }

  return NextResponse.json({
    ts: new Date().toISOString(),
    cfRay: 'edge',
    results,
  });
}
