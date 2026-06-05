'use client';

import { Currency, MiningResults } from '../types';
import { formatCurrency } from '../utils';

interface ResultHeroProps {
  results: MiningResults;
  currency: Currency;
  isBleeding: boolean;
  t: (key: string) => string;
}

export default function ResultHero({ results, currency, isBleeding, t }: ResultHeroProps) {
  return (
    <div className="mb-5">
      <div className="text-xs text-muted tracking-wider uppercase mb-2" suppressHydrationWarning>
        {t('dailyNet')}
      </div>
      <div className="flex items-end gap-3" suppressHydrationWarning>
        <span
          className={`text-3xl sm:text-5xl font-bold font-mono tracking-tight ${
            results.dailyNetRMB > 0 ? 'text-emerald-400' : 'text-red-400'
          }`}
          suppressHydrationWarning
        >
          {formatCurrency(results.dailyNetRMB, currency)}
        </span>
        <span className="text-sm text-muted mb-1 tracking-wider uppercase">
          / {t('days').toLowerCase()}
        </span>
      </div>
      {isBleeding && (
        <div className="mt-2 text-sm text-red-400/70 tracking-wider uppercase flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          {t('bleedingWarning')}
        </div>
      )}
    </div>
  );
}
