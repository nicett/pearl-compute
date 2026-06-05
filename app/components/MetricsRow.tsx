'use client';

import { Currency, MiningResults } from '../types';
import { formatCurrency, formatNumber } from '../utils';
import InfoIcon from './InfoIcon';

interface MetricsRowProps {
  results: MiningResults;
  currency: Currency;
  t: (key: string) => string;
}

export default function MetricsRow({ results, currency, t }: MetricsRowProps) {
  const row1 = [
    { label: t('totalHashrate'), value: `${results.totalHashrate.toLocaleString()} TH/s`, color: 'text-gray-200', tip: t('tipTotalHashrate') },
    { label: t('totalPower'), value: `${results.totalPowerKW.toFixed(2)} kW`, color: 'text-gray-200', tip: t('tipTotalPower') },
    { label: t('totalInvestment'), value: formatCurrency(results.totalInvestment, currency), color: 'text-accent', tip: t('tipTotalInvestment') },
  ];

  const row2 = [
    { label: t('dailyCoinOutput'), value: `${formatNumber(results.dailyCoinOutput, 2)} PRL`, color: 'text-orange-400', tip: t('tipDailyCoinOutput') },
    { label: t('dailyGross'), value: formatCurrency(results.dailyGrossRMB, currency), color: 'text-gray-200', tip: t('tipDailyGross') },
    { label: t('dailyElecCost'), value: formatCurrency(results.dailyElecCostRMB, currency), color: 'text-red-400', tip: t('tipDailyElecCost') },
    { label: t('costRatio'), value: `${results.costRatio.toFixed(1)}%`, color: results.costRatio >= 100 ? 'text-red-400' : 'text-gray-200', tip: t('tipCostRatio') },
  ];

  return (
    <div suppressHydrationWarning>
      {/* 第1行：总额 */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-3 sm:mb-4" suppressHydrationWarning>
        {row1.map((item) => (
          <div key={item.label} className="text-center py-2 px-1 border border-edge bg-surface-dark">
            <div className="text-[9px] sm:text-[10px] text-muted tracking-wider uppercase mb-1 flex items-center justify-center gap-0.5">
              {item.label}
              <InfoIcon tooltip={item.tip} />
            </div>
            <div className={`text-xs sm:text-sm font-mono font-bold ${item.color}`} suppressHydrationWarning>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* 第2行：日度 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3" suppressHydrationWarning>
        {row2.map((item) => (
          <div key={item.label} className="text-center py-2 px-1 border border-edge bg-surface-dark">
            <div className="text-[9px] sm:text-[10px] text-muted tracking-wider uppercase mb-1 flex items-center justify-center gap-0.5">
              {item.label}
              <InfoIcon tooltip={item.tip} />
            </div>
            <div className={`text-sm sm:text-base font-mono font-bold ${item.color}`} suppressHydrationWarning>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
