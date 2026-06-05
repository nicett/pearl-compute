'use client';

import { Currency, MiningResults } from '../types';
import { formatCurrency, formatNumber } from '../utils';
import InfoIcon from './InfoIcon';

interface FinancialMetricsProps {
  results: MiningResults;
  currency: Currency;
  isBleeding: boolean;
  t: (key: string) => string;
}

export default function FinancialMetrics({
  results,
  currency,
  isBleeding,
  t,
}: FinancialMetricsProps) {
  return (
    <>
      {/* 顶层汇总状态条 */}
      <div className="bg-surface border border-edge text-muted text-[10px] px-4 py-3 mb-6 flex justify-between items-center tracking-wider uppercase">
        <div className="group relative flex flex-col">
          <span className="text-muted/50 flex items-center gap-1">
            {t('totalHashrate')}
            <InfoIcon tooltip={t('tipTotalHashrate')} />
          </span>
          <strong className="text-gray-200 text-sm font-mono normal-case tracking-normal">
            {results.totalHashrate.toLocaleString()} TH/s
          </strong>
        </div>
        <div className="w-px h-8 bg-edge" />
        <div className="group relative flex flex-col">
          <span className="text-muted/50 flex items-center gap-1">
            {t('totalPower')}
            <InfoIcon tooltip={t('tipTotalPower')} />
          </span>
          <strong className="text-gray-200 text-sm font-mono normal-case tracking-normal">
            {results.totalPowerKW.toFixed(2)} kW
          </strong>
        </div>
        <div className="w-px h-8 bg-edge" />
        <div className="group relative flex flex-col text-right">
          <span className="text-muted/50 flex items-center justify-end gap-1">
            {t('totalInvestment')}
            <InfoIcon tooltip={t('tipTotalInvestment')} position="left" />
          </span>
          <strong className="text-accent text-sm font-mono normal-case tracking-normal">
            {formatCurrency(results.totalInvestment, currency)}
          </strong>
        </div>
      </div>

      {/* Section 1: Financial Metrics */}
      <div className="section-header">
        {t('section1')}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {/* 1. 日产币 */}
        <div className="group metric-card border-orange-500 relative">
          <div className="absolute top-2 right-2">
            <InfoIcon tooltip={t('tipDailyCoinOutput')} position="left" />
          </div>
          <div className="metric-title">{t('dailyCoinOutput')}</div>
          <div className="metric-value text-orange-400 text-lg">
            {formatNumber(results.dailyCoinOutput, 2)}
          </div>
          <div className="text-[9px] text-muted/50 mt-1 font-mono tracking-wider">PRL</div>
        </div>

        {/* 2. 每日产出 */}
        <div className="group metric-card border-yellow-500 relative">
          <div className="absolute top-2 right-2">
            <InfoIcon tooltip={t('tipDailyGross')} position="left" />
          </div>
          <div className="metric-title">{t('dailyGross')}</div>
          <div className="metric-value text-lg">
            {formatCurrency(results.dailyGrossRMB, currency)}
          </div>
          {currency === 'CNY' && (
            <div className="text-[9px] text-muted/50 mt-1 font-mono tracking-wider">
              ${formatNumber(results.dailyGrossUSDT, 4)}
            </div>
          )}
        </div>

        {/* 3. 每日净利润 */}
        <div className="group metric-card border-green-500 relative overflow-hidden">
          <div className="absolute top-2 right-2">
            <InfoIcon tooltip={t('tipDailyNet')} position="left" />
          </div>
          <div className="metric-title">{t('dailyNet')}</div>
          <div
            className={`metric-value text-lg ${
              results.dailyNetRMB > 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatCurrency(results.dailyNetRMB, currency)}
          </div>
        </div>

        {/* 4. 每日电费 */}
        <div className="group metric-card border-red-500 relative">
          <div className="absolute top-2 right-2">
            <InfoIcon tooltip={t('tipDailyElecCost')} position="left" />
          </div>
          <div className="metric-title">{t('dailyElecCost')}</div>
          <div className="metric-value text-red-400 text-lg">
            {formatCurrency(results.dailyElecCostRMB, currency)}
          </div>
        </div>

        {/* 5. 电费占比 */}
        <div className="group metric-card border-purple-500 relative">
          <div className="absolute top-2 right-2">
            <InfoIcon tooltip={t('tipCostRatio')} position="left" />
          </div>
          <div className="metric-title">{t('costRatio')}</div>
          <div
            className={`metric-value text-lg ${
              results.costRatio >= 100 ? 'text-red-400' : ''
            }`}
          >
            {results.costRatio.toFixed(2)}%
          </div>
        </div>
      </div>
    </>
  );
}
