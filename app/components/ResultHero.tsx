'use client';

import { Currency, MiningResults } from '../types';
import { formatCurrency } from '../utils';
import { cn } from '@/lib/utils';

interface ResultHeroProps {
  results: MiningResults;
  currency: Currency;
  isBleeding: boolean;
  t: (key: string) => string;
}

export default function ResultHero({ results, currency, isBleeding, t }: ResultHeroProps) {
  const isPositive = results.dailyNetRMB > 0;

  return (
    <div className="mb-5">
      <div className="text-xs text-muted-foreground mb-2" suppressHydrationWarning>
        {t('dailyNet')}
      </div>
      <div className="flex items-end gap-3" suppressHydrationWarning>
        <span
          className={cn(
            'text-3xl sm:text-5xl font-bold font-mono tracking-tight',
            isPositive ? 'text-success' : 'text-destructive',
          )}
          suppressHydrationWarning
        >
          {formatCurrency(results.dailyNetRMB, currency)}
        </span>
        <span className="text-sm text-muted-foreground mb-1">/ {t('days').toLowerCase()}</span>
      </div>
      {isBleeding && (
        <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
          <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          {t('bleedingWarning')}
        </div>
      )}
    </div>
  );
}
