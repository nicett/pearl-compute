import MinerCalculator from './MinerCalculator';
import { InitialData } from './types';

// 默认初始数据（客户端通过 API 获取实时数据）
//
// 注：曾尝试用 async server component + Edge Runtime 做 SSR 预取，
// 但 @cloudflare/next-on-pages 不支持 Next.js ISR（export const revalidate），
// 也对带数据获取的 server component + edge runtime 组合表现不稳定，
// 部署后会返回 Not Found。保持纯客户端获取是当前最稳的方案。
// 参考: https://github.com/cloudflare/next-on-pages/blob/main/packages/next-on-pages/docs/supported.md
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

export default function Home() {
  return <MinerCalculator initialData={DEFAULT_DATA} />;
}
