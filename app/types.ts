// 共享类型定义

/** 价格历史数据点（环形缓冲区中的单条记录） */
export interface PriceHistoryPoint {
  ts: number;       // Unix 秒
  price: number;    // USDT
  volume: number | null;
}

/** 网络统计扩展字段 */
export interface NetworkStats {
  networkHashrate: string;     // 原始字符串如 "21.06 EH/s"
  networkHashrateTH: number;   // 解析后的 TH/s 值
  blockReward: number;
  dailyGlobalOutput: number;   // 每日全网产出（估算）
  avgBlockTime: string;        // 平均出块时间，如 "19.5m"
  hashrateYield: number;       // 每 TH 每小时产币数
}

export interface InitialData {
  hashrateYield: number;
  coinPrice: number;
  exchangeRate: number;
  priceSource: string;
  // Phase 1 扩展
  networkStats: NetworkStats;
  priceHistory: PriceHistoryPoint[];
}

export interface MiningInputs {
  gpuCount: number;
  cardPrice: number;
  residualValue: number;
  powerCons: number;
  gpuHashrate: number;
  hashrateYield: number;
  coinPrice: number;
  poolFee: number;
  electricityPrice: number;
  exchangeRate: number;
  selectedPool: string | null;  // null = 使用全网数据
}

export interface MiningResults {
  singleCardHourlyCoins: number;
  totalHashrate: number;
  totalPowerKW: number;
  totalInvestment: number;
  totalResidual: number;
  dailyElecCostRMB: number;
  dailyGrossUSDT: number;
  dailyGrossRMB: number;
  dailyNetRMB: number;
  dailyCoinOutput: number;     // 每日产出币数（PRL）
  costRatio: number;
  fullDays: number;
  fullMonths: number;
  resDays: number;
  resMonths: number;
  costEff: number;
  powerEff: number;
  longTermEff: number;
  longTermElecCost: number;
  shutdownPrice: number;
  dailyROI: number;
  annualizedROI: number;
  yearlyROI: number;
  profitMultiple: number;
}

export interface PriceSource {
  name: string;
  price: number;
}

/** 矿池数据 */
export interface PoolData {
  slug: string;
  name: string;
  fee_percent: number;
  reported_hashrate_hps: number;
  reward_24h_grains: number;
  blocks_24h: number;
  pool_share_24h: number;
}

export type SyncStatus = 'idle' | 'loading' | 'success' | 'error';
export type Locale = 'en' | 'zh';
export type Currency = 'USD' | 'CNY';
