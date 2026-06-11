import MinerCalculator from './MinerCalculator';
import { InitialData, PriceHistoryPoint } from './types';
import { assembleStatsData, fetchSafeTradeKlines } from './lib/data-sources';

// Edge Runtime — 与 API 路由保持一致，确保可以在 Cloudflare Pages 部署
export const runtime = 'edge';

// 与轮询周期一致，避免 SSR 拿到过期数据
export const revalidate = 20;

// 数据源全部失败时的兜底默认值
const FALLBACK_DATA: InitialData = {
  hashrateYield: 0.0023,
  coinPrice: 0.18,
  exchangeRate: 6.80,
  priceSource: 'unknown',
  networkStats: {
    networkHashrate: 'N/A',
    networkHashrateTH: 0,
    blockReward: 0,
    dailyGlobalOutput: 0,
    avgBlockTime: 'N/A',
    hashrateYield: 0,
  },
  priceHistory: [],
};

export default async function Home() {
  // 服务端并行预取 stats + 图表，消除首屏数据闪烁
  // 任何分支失败都不会让页面挂掉 —— 客户端 useRealtimeSync 会立刻发起 fetch 补齐
  const [statsResult, klinesResult] = await Promise.allSettled([
    assembleStatsData(),
    fetchSafeTradeKlines(),
  ]);

  const stats = statsResult.status === 'fulfilled' ? statsResult.value : null;
  const klines = klinesResult.status === 'fulfilled' ? klinesResult.value : null;

  const priceHistory: PriceHistoryPoint[] = (klines ?? []).map((k) => ({
    ts: k.time,
    price: k.close,
    open: k.open,
    high: k.high,
    low: k.low,
    close: k.close,
    volume: k.volume,
  }));

  const initialData: InitialData = stats
    ? {
        hashrateYield: stats.networkStats.hashrateYield || FALLBACK_DATA.hashrateYield,
        coinPrice: stats.coins[0]?.price ?? FALLBACK_DATA.coinPrice,
        exchangeRate: stats.exchangeRate ?? FALLBACK_DATA.exchangeRate,
        priceSource: stats.priceSource ?? FALLBACK_DATA.priceSource,
        networkStats: stats.networkStats,
        priceHistory,
      }
    : { ...FALLBACK_DATA, priceHistory };

  return <MinerCalculator initialData={initialData} />;
}