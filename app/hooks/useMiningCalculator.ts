'use client';

import { useMemo } from 'react';
import { MiningInputs, MiningResults, Currency } from '../types';
import {
  calcSingleCardHourly,
  calcDailyCoinOutput,
  calcDailyElecCost,
  calcDailyGrossUSDT,
  calcDailyNet,
  calcCostRatio,
  calcPaybackDays,
  calcEfficiency,
  calcShutdownPrice,
  calcDailyROI,
  calcAnnualizedROI,
  calcYearlyROI,
  calcProfitMultiple,
} from '../math';

/**
 * 核心计算逻辑 Hook
 * 输入参数 → 计算结果（使用 mathjs BigNumber 精确计算）
 */
export function useMiningCalculator(
  inputs: MiningInputs,
  currency: Currency
): MiningResults {
  return useMemo(() => {
    const {
      gpuCount,
      cardPrice,
      residualValue,
      powerCons,
      gpuHashrate,
      hashrateYield,
      coinPrice,
      poolFee,
      electricityPrice,
      exchangeRate,
    } = inputs;

    const isUSD = currency === 'USD';
    const safeRate = exchangeRate > 0 ? exchangeRate : 1;

    // 基础指标
    const singleCardHourlyCoins = calcSingleCardHourly(gpuHashrate, hashrateYield);
    const totalHashrate = gpuCount * gpuHashrate;
    const totalPowerKW = (gpuCount * powerCons) / 1000;

    // 投资和残值
    const totalInvestment = gpuCount * cardPrice;
    const totalResidual = gpuCount * residualValue;

    // 电费
    const dailyElecCost = calcDailyElecCost(totalPowerKW, electricityPrice);

    // 产出
    const dailyCoinOutput = calcDailyCoinOutput(totalHashrate, hashrateYield, poolFee);
    const dailyGrossUSDT = calcDailyGrossUSDT(dailyCoinOutput, coinPrice);
    const dailyGross = isUSD ? dailyGrossUSDT : dailyGrossUSDT * safeRate;
    const dailyNet = calcDailyNet(dailyGross, dailyElecCost);

    // 电费占比
    const costRatio = dailyGross === 0 && dailyElecCost > 0 ? 100 : calcCostRatio(dailyElecCost, dailyGross);

    // 回本分析
    const totalRiskExposure = totalInvestment - totalResidual;
    const fullDays = calcPaybackDays(totalInvestment, dailyNet);
    const fullMonths = fullDays / 30;
    const resDays = calcPaybackDays(Math.max(0, totalRiskExposure), dailyNet);
    const resMonths = resDays / 30;

    // 效能分析
    const costEff = calcEfficiency(gpuHashrate, cardPrice);
    const powerEff = calcEfficiency(gpuHashrate, powerCons);

    // 关机币价（复用上面已计算的 dailyCoinOutput，避免重复 BigNumber 链式运算）
    const dailyElecCostUSD = isUSD ? dailyElecCost : dailyElecCost / safeRate;
    const shutdownPrice = calcShutdownPrice(dailyElecCostUSD, dailyCoinOutput);

    // 投资回报率
    const dailyROI = calcDailyROI(dailyNet, totalInvestment);
    const annualizedROI = calcAnnualizedROI(dailyROI);
    const yearlyROI = calcYearlyROI(dailyNet, totalInvestment, totalResidual);
    const profitMultiple = calcProfitMultiple(dailyNet, totalInvestment);

    return {
      singleCardHourlyCoins,
      totalHashrate,
      totalPowerKW,
      totalInvestment,
      totalResidual,
      dailyElecCostRMB: dailyElecCost,
      dailyGrossUSDT,
      dailyGrossRMB: dailyGross,
      dailyNetRMB: dailyNet,
      dailyCoinOutput,
      costRatio,
      fullDays,
      fullMonths,
      resDays,
      resMonths,
      costEff,
      powerEff,
      shutdownPrice,
      dailyROI,
      annualizedROI,
      yearlyROI,
      profitMultiple,
    };
  }, [
    inputs.gpuCount, inputs.cardPrice, inputs.residualValue, inputs.powerCons,
    inputs.gpuHashrate, inputs.hashrateYield, inputs.coinPrice, inputs.poolFee,
    inputs.electricityPrice, inputs.exchangeRate, currency
  ]);
}
