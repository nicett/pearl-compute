import MinerCalculator from './MinerCalculator';
import { InitialData } from './types';

// Edge runtime: Cloudflare Pages 要求所有非静态路由必须配置
export const runtime = 'edge';

// 默认初始数据
const DEFAULT_DATA: InitialData = {
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

// 服务器端预取数据
async function getInitialData(): Promise<InitialData> {
  try {
    // 在 Cloudflare Pages 环境中，直接调用 API route 的逻辑
    // 而不是通过 fetch，因为 Edge Runtime 下 fetch 自身会有问题
    const { GET } = await import('./api/stats/route');
    const response = await GET();
    const data = await response.json();

    if (data.error) {
      console.error('Stats API error:', data.error);
      return DEFAULT_DATA;
    }

    const coinData = data.coins?.[0] || {};
    const networkStats = data.networkStats || DEFAULT_DATA.networkStats;

    return {
      hashrateYield: networkStats.hashrateYield > 0 ? networkStats.hashrateYield : DEFAULT_DATA.hashrateYield,
      coinPrice: coinData.price ?? DEFAULT_DATA.coinPrice,
      exchangeRate: data.exchangeRate ?? DEFAULT_DATA.exchangeRate,
      priceSource: data.priceSource ?? DEFAULT_DATA.priceSource,
      networkStats,
      priceHistory: data.priceHistory || DEFAULT_DATA.priceHistory,
    };
  } catch (error) {
    console.error('Failed to fetch initial data:', error);
    return DEFAULT_DATA;
  }
}

export default async function Home() {
  const initialData = await getInitialData();
  return <MinerCalculator initialData={initialData} />;
}
