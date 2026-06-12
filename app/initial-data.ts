/**
 * MinerCalculator 的默认初始数据
 *
 * 客户端 mount 后会被 useRealtimeSync 拉取的实时数据覆盖；
 * 此处仅为 SSR 阶段的占位，避免 hydration mismatch
 */
import type { InitialData } from './types';

export const DEFAULT_INITIAL_DATA: InitialData = {
  hashrateYield: 0.0023,
  coinPrice: 0.18,
  exchangeRate: 6.8,
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
