'use client';

import { Currency, MiningResults } from '../types';
import { formatNumber } from '../utils';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import ShutdownGauge from './ShutdownGauge';
import InfoIcon from './InfoIcon';

interface PaybackSectionProps {
  results: MiningResults;
  coinPrice: number;
  currency: Currency;
  isBleeding: boolean;
  t: (key: string) => string;
}

export default function PaybackSection({
  results,
  coinPrice,
  currency,
  isBleeding,
  t,
}: PaybackSectionProps) {
  return (
    <div>
      <div className="text-sm font-semibold text-foreground mb-4">
        {t('paybackTitle')}
      </div>

      {isBleeding && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive p-4 mb-5" role="alert">
          <div className="flex items-start gap-3">
            <span className="text-destructive font-bold">[!]</span>
            <p className="text-sm">
              <strong className="font-bold">{t('bleedingWarning')}</strong>
              <span className="text-destructive/80 ml-2">{t('bleedingMessage')}</span>
            </p>
          </div>
        </div>
      )}

      <div className={isBleeding ? 'opacity-30 pointer-events-none' : ''}>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              {t('fullPayback')}
              <InfoIcon tooltip={t('tipFullPayback')} />
            </div>
            <div className="flex items-baseline gap-2" suppressHydrationWarning>
              <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-primary" suppressHydrationWarning>
                {isBleeding ? '-' : formatNumber(results.fullDays, 1)}
              </span>
              <span className="text-sm text-muted-foreground">{t('days')}</span>
            </div>
            {!isBleeding && (
              <div className="text-xs text-muted-foreground/60 mt-1" suppressHydrationWarning>
                {t('about')} {formatNumber(results.fullMonths, 1)} {t('months')}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              {t('residualPayback')}
              <Badge variant="success" className="text-[9px]">{t('recommended')}</Badge>
              <InfoIcon tooltip={t('tipResPayback')} />
            </div>
            <div className="flex items-baseline gap-2" suppressHydrationWarning>
              <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-success" suppressHydrationWarning>
                {isBleeding ? '-' : formatNumber(results.resDays, 1)}
              </span>
              <span className="text-sm text-muted-foreground">{t('days')}</span>
            </div>
            {!isBleeding && (
              <div className="text-xs text-muted-foreground/60 mt-1" suppressHydrationWarning>
                {t('about')} {formatNumber(results.resMonths, 1)} {t('months')}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
          {[
            { label: t('dailyROI'), value: isBleeding ? '-' : `${results.dailyROI.toFixed(3)}%`, ok: results.dailyROI >= 0, tip: t('tipDailyROI') },
            { label: t('annualizedROI'), value: isBleeding ? '-' : `${results.annualizedROI.toFixed(1)}%`, ok: results.annualizedROI >= 0, tip: t('tipAnnualizedROI') },
            { label: t('yearlyROI'), value: isBleeding ? '-' : `${results.yearlyROI.toFixed(1)}%`, ok: results.yearlyROI >= 0, tip: t('tipYearlyROI') },
            { label: t('profitMultiple'), value: isBleeding ? '-' : `${results.profitMultiple.toFixed(2)}x`, ok: results.profitMultiple >= 0, tip: t('tipProfitMultiple') },
          ].map((item) => (
            <div key={item.label} className="rounded-md border bg-muted/30 p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-muted-foreground mb-1.5">
                {item.label}
                <InfoIcon tooltip={item.tip} />
              </div>
              <div className={cn('text-base sm:text-lg font-mono font-semibold', item.ok ? 'text-foreground' : 'text-destructive')} suppressHydrationWarning>
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {results.shutdownPrice > 0 && (
          <ShutdownGauge
            shutdownPrice={results.shutdownPrice}
            coinPrice={coinPrice}
            t={t}
          />
        )}
      </div>
    </div>
  );
}
