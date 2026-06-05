'use client';

import { Currency, MiningResults } from '../types';
import { formatCurrency, formatNumber } from '../utils';
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
      <div className="text-sm font-semibold tracking-wider uppercase text-muted mb-4">
        {t('paybackTitle')}
      </div>

      {isBleeding && (
        <div className="border border-red-500/30 bg-red-500/5 text-red-400 p-4 mb-5" role="alert">
          <div className="flex items-center gap-3">
            <span className="text-red-400 font-bold">[!]</span>
            <p className="text-sm">
              <strong className="font-bold tracking-wider uppercase">{t('bleedingWarning')}</strong>
              <span className="text-red-400/70 ml-2">{t('bleedingMessage')}</span>
            </p>
          </div>
        </div>
      )}

      <div className={isBleeding ? 'opacity-30 pointer-events-none' : ''}>
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <div className="text-xs text-muted tracking-wider uppercase mb-1 flex items-center gap-1">
              {t('fullPayback')}
              <InfoIcon tooltip={t('tipFullPayback')} />
            </div>
            <div className="flex items-baseline gap-2" suppressHydrationWarning>
              <span className="text-2xl sm:text-3xl font-bold text-blue-400 font-mono tracking-tight" suppressHydrationWarning>
                {isBleeding ? '-' : formatNumber(results.fullDays, 1)}
              </span>
              <span className="text-sm text-muted tracking-wider uppercase">{t('days')}</span>
            </div>
            {!isBleeding && (
              <div className="text-xs text-muted/50 mt-1" suppressHydrationWarning>
                {t('about')} {formatNumber(results.fullMonths, 1)} {t('months')}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-muted tracking-wider uppercase mb-1 flex items-center gap-1">
              {t('residualPayback')}
              <span className="px-1.5 py-0 border border-emerald-500/30 text-emerald-400 text-[9px] tracking-wider uppercase">
                {t('recommended')}
              </span>
              <InfoIcon tooltip={t('tipResPayback')} />
            </div>
            <div className="flex items-baseline gap-2" suppressHydrationWarning>
              <span className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono tracking-tight" suppressHydrationWarning>
                {isBleeding ? '-' : formatNumber(results.resDays, 1)}
              </span>
              <span className="text-sm text-muted tracking-wider uppercase">{t('days')}</span>
            </div>
            {!isBleeding && (
              <div className="text-xs text-muted/50 mt-1" suppressHydrationWarning>
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
            <div key={item.label} className="text-center p-2 sm:p-3 bg-surface-dark border border-edge">
              <div className="text-[9px] sm:text-[10px] text-muted tracking-wider uppercase mb-1 sm:mb-1.5 flex items-center justify-center gap-1">
                {item.label}
                <InfoIcon tooltip={item.tip} />
              </div>
              <div className={`text-base sm:text-lg font-mono font-bold ${item.ok ? 'text-gray-200' : 'text-red-400'}`} suppressHydrationWarning>
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
