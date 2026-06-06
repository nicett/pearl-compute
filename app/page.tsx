import MinerCalculator from './MinerCalculator';
import { InitialData } from './types';

// 默认初始数据（客户端通过 API 获取实时数据）
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
