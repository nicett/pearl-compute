/**
 * 精确计算模块 — 基于 mathjs 的 BigNumber 运算
 * 所有金融计算通过此模块进行，避免 IEEE 754 浮点累积误差
 */
import { create, all } from 'mathjs';

const math = create(all, { number: 'BigNumber', precision: 20 });

const D = (v: number | string) => math.bignumber(v);
const N = (v: unknown): number => Number(v);

/** 安全除法：除数为 0 时返回 0 */
function safeDiv(a: number, b: number): number {
  if (b === 0) return 0;
  return N(math.divide(D(a), D(b)));
}

/** 安全百分比：(a / b) * 100 */
function pct(a: number, b: number): number {
  if (b === 0) return 0;
  return N(math.multiply(math.divide(D(a), D(b)), D(100)));
}

// ─── 核心计算函数 ───

/** 单卡每小时产币 */
export function calcSingleCardHourly(gpuHashrate: number, hashrateYield: number): number {
  return N(math.multiply(D(gpuHashrate), D(hashrateYield)));
}

/** 日产币量 = 总算力 × 每TH产币 × 24h × (1-手续费) */
export function calcDailyCoinOutput(totalHashrate: number, hashrateYield: number, poolFee: number): number {
  const feeRate = N(math.divide(D(poolFee), D(100)));
  const factor = N(math.subtract(D(1), D(feeRate)));
  return N(math.chain(D(totalHashrate)).multiply(D(hashrateYield)).multiply(D(24)).multiply(D(factor)).done());
}

/** 日电费 = 总功率kW × 24h × 电价 */
export function calcDailyElecCost(totalPowerKW: number, elecPrice: number): number {
  return N(math.chain(D(totalPowerKW)).multiply(D(24)).multiply(D(elecPrice)).done());
}

/** 日毛产出 = 产币量 × 币价 */
export function calcDailyGrossUSDT(dailyCoinOutput: number, coinPrice: number): number {
  return N(math.multiply(D(dailyCoinOutput), D(coinPrice)));
}

/** 日净收益 = 毛产出 - 电费 */
export function calcDailyNet(dailyGross: number, dailyElecCost: number): number {
  return N(math.subtract(D(dailyGross), D(dailyElecCost)));
}

/** 电费占比 */
export function calcCostRatio(dailyElecCost: number, dailyGross: number): number {
  return pct(dailyElecCost, dailyGross);
}

/** 回本天数（亏损时返回 Infinity） */
export function calcPaybackDays(investment: number, dailyNet: number): number {
  if (dailyNet <= 0) return Infinity;
  return safeDiv(investment, dailyNet);
}

/** 性价比 = 算力 / 价格 */
export function calcEfficiency(hashrate: number, cost: number): number {
  return safeDiv(hashrate, cost);
}

/** 关机币价 (USDT) */
export function calcShutdownPrice(dailyElecCostUSD: number, effectiveYield: number): number {
  return safeDiv(dailyElecCostUSD, effectiveYield);
}

/** 日 ROI */
export function calcDailyROI(dailyNet: number, totalInvestment: number): number {
  return pct(dailyNet, totalInvestment);
}

/** 年化 ROI */
export function calcAnnualizedROI(dailyROI: number): number {
  return N(math.multiply(D(dailyROI), D(365)));
}

/** 1年 ROI（考虑折旧） */
export function calcYearlyROI(dailyNet: number, totalInvestment: number, totalResidual: number): number {
  const annualNet = N(math.multiply(D(dailyNet), D(365)));
  const depreciation = N(math.subtract(D(totalInvestment), D(totalResidual)));
  const numerator = N(math.subtract(D(annualNet), D(depreciation)));
  return pct(numerator, totalInvestment);
}

/** 利润倍数 */
export function calcProfitMultiple(dailyNet: number, totalInvestment: number): number {
  const annualNet = N(math.multiply(D(dailyNet), D(365)));
  return safeDiv(annualNet, totalInvestment);
}

/** 安全边际 (%) */
export function calcSafetyMargin(coinPrice: number, shutdownPrice: number): number {
  if (shutdownPrice <= 0) return 0;
  return N(math.multiply(math.divide(math.subtract(D(coinPrice), D(shutdownPrice)), D(shutdownPrice)), D(100)));
}

/** 涨跌幅 (%) */
export function calcChangePercent(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return N(math.multiply(math.divide(math.subtract(D(current), D(previous)), D(previous)), D(100)));
}

/** 每 TH 每小时产币 */
export function calcYieldPerTH(reward: number, networkHashrateTH: number): number {
  if (networkHashrateTH <= 0) return 0;
  const BLOCK_TIME_SEC = 124.77;
  const blocksPerHour = N(math.divide(D(3600), D(BLOCK_TIME_SEC)));
  const globalHourlyOutput = N(math.multiply(D(blocksPerHour), D(reward)));
  const result = N(math.divide(D(globalHourlyOutput), D(networkHashrateTH)));
  return isFinite(result) && result > 0 ? result : 0;
}
