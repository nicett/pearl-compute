import MinerCalculator from './MinerCalculator';
import { InitialData } from './types';

// Edge runtime: Cloudflare Pages 生产环境使用
export const runtime = 'edge';

// 服务器端预取数据
async function getInitialData(): Promise<InitialData> {
  try {
    const { GET } = await import('./api/stats/route');
    const response = await GET();
    const data = await response.json();

    const coinData = data.coins?.[0] || {};

    // 使用 API 路由中已计算的网络统计（基于 PRLScan 全网数据）
    const networkStats = data.networkStats || {
      networkHashrate: 'N/A',
      networkHashrateTH: 0,
      blockReward: 0,
      dailyGlobalOutput: 0,
      avgBlockTime: 'N/A',
      hashrateYield: 0,
    };

    return {
      hashrateYield: networkStats.hashrateYield > 0 ? networkStats.hashrateYield : 0.0023,
      coinPrice: coinData.price ?? 0.18,
      exchangeRate: data.exchangeRate ?? 6.80,
      priceSource: data.priceSource ?? 'unknown',
      networkStats,
      priceHistory: data.priceHistory || [],
    };
  } catch (error) {
    console.error('Failed to fetch initial data:', error);
    return {
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
  }
}

export default async function Home() {
  const initialData = await getInitialData();
  return <MinerCalculator initialData={initialData} />;
}
