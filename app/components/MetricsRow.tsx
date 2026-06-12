'use client';

import { Currency, MiningResults } from '../types';
import { formatCurrency, formatNumber } from '../utils';
import { cn } from '@/lib/utils';
import InfoIcon from './InfoIcon';

interface MetricsRowProps {
  results: MiningResults;
  currency: Currency;
  t: (key: string) => string;
}

export default function MetricsRow({ results, currency, t }: MetricsRowProps) {
  const row1 = [
    { label: t('totalHashrate'), value: `${results.totalHashrate.toLocaleString()} TH/s`, color: 'text-foreground', tip: t('tipTotalHashrate') },
    { label: t('totalPower'), value: `${results.totalPowerKW.toFixed(2)} kW`, color: 'text-foreground', tip: t('tipTotalPower') },
    { label: t('totalInvestment'), value: formatCurrency(results.totalInvestment, currency), color: 'text-primary', tip: t('tipTotalInvestment') },
  ];

  const row2 = [
    { label: t('dailyCoinOutput'), value: `${formatNumber(results.dailyCoinOutput, 2)} PRL`, color: 'text-warning', tip: t('tipDailyCoinOutput') },
    { label: t('dailyGross'), value: formatCurrency(results.dailyGrossRMB, currency), color: 'text-foreground', tip: t('tipDailyGross') },
    { label: t('dailyElecCost'), value: formatCurrency(results.dailyElecCostRMB, currency), color: 'text-destructive', tip: t('tipDailyElecCost') },
    { label: t('costRatio'), value: `${results.costRatio.toFixed(1)}%`, color: results.costRatio >= 100 ? 'text-destructive' : 'text-foreground', tip: t('tipCostRatio') },
  ];

  return (
    <div suppressHydrationWarning>
      {/* 第 1 行：总额 */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3" suppressHydrationWarning>
        {row1.map((item) => (
          <div key={item.label} className="rounded-md border bg-muted/30 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-muted-foreground mb-1.5">
              {item.label}
              <InfoIcon tooltip={item.tip} />
            </div>
            <div className={cn('text-xs sm:text-sm font-mono font-semibold', item.color)} suppressHydrationWarning>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* 第 2 行：日度 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3" suppressHydrationWarning>
        {row2.map((item) => (
          <div key={item.label} className="rounded-md border bg-muted/30 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-muted-foreground mb-1.5">
              {item.label}
              <InfoIcon tooltip={item.tip} />
            </div>
            <div className={cn('text-sm sm:text-base font-mono font-semibold', item.color)} suppressHydrationWarning>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
