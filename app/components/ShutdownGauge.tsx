'use client';

import { calcSafetyMargin } from '../math';
import { cn } from '@/lib/utils';

interface ShutdownGaugeProps {
  shutdownPrice: number;
  coinPrice: number;
  t: (key: string) => string;
}

export default function ShutdownGauge({ shutdownPrice, coinPrice, t }: ShutdownGaugeProps) {
  const sp = shutdownPrice;
  const cp = coinPrice;
  const safetyMargin = calcSafetyMargin(cp, sp);
  const zone = safetyMargin > 20 ? 'safe' : safetyMargin > 0 ? 'warning' : 'danger';
  const zoneColor =
    zone === 'safe' ? 'text-success'
    : zone === 'warning' ? 'text-warning'
    : 'text-destructive';
  const zoneBg =
    zone === 'safe' ? 'bg-success'
    : zone === 'warning' ? 'bg-warning'
    : 'bg-destructive';

  const maxPrice = Math.max(cp * 1.1, sp * 2.5);
  const currentPct = 100 - Math.min((cp / maxPrice) * 100, 100);
  const shutdownPct = 100 - Math.min((sp / maxPrice) * 100, 100);
  const warnPct = 100 - Math.min((sp * 1.2 / maxPrice) * 100, 100);

  return (
    <div className="mt-5 pt-4 border-t">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-foreground">{t('shutdownPrice')}</span>
        <div className={cn('text-sm font-semibold', zoneColor)} suppressHydrationWarning>
          {zone === 'danger' ? t('bleedingWarning') : `${t('safetyMargin')} ${safetyMargin > 0 ? '+' : ''}${safetyMargin.toFixed(1)}%`}
        </div>
      </div>

      <div className="relative mx-1" style={{ height: '48px' }}>
        <div className="absolute inset-0 overflow-hidden rounded-md">
          <div className="absolute inset-y-0 left-0 bg-success/15" style={{ width: `${warnPct}%` }} />
          <div className="absolute inset-y-0 bg-warning/15" style={{ left: `${warnPct}%`, width: `${shutdownPct - warnPct}%` }} />
          <div className="absolute inset-y-0 right-0 bg-destructive/15" style={{ width: `${100 - shutdownPct}%` }} />
          <div className="absolute inset-y-0 w-px bg-border" style={{ left: `${warnPct}%` }} />
          <div className="absolute inset-y-0 w-px bg-border" style={{ left: `${shutdownPct}%` }} />
        </div>

        <div className="absolute top-0 bottom-0 z-20" style={{ left: `${currentPct}%` }}>
          <div className={cn('absolute top-0 bottom-0 w-0.5', zoneBg)} />
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <span className={cn('text-sm font-bold font-mono whitespace-nowrap', zoneColor)} suppressHydrationWarning>
              {cp.toFixed(4)}
            </span>
            <div
              className={cn(
                'w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent',
                zone === 'safe' ? 'border-t-success'
                : zone === 'warning' ? 'border-t-warning'
                : 'border-t-destructive',
              )}
            />
          </div>
        </div>

        <div className="absolute top-0 bottom-0 z-10" style={{ left: `${shutdownPct}%` }}>
          <div className="absolute top-0 bottom-0 w-0.5 bg-destructive/60" />
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[4px] border-l-transparent border-r-transparent border-b-destructive/60" />
            <span className="text-sm font-mono text-destructive/70 whitespace-nowrap" suppressHydrationWarning>
              {sp.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-8 text-xs text-muted-foreground/70">
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-success/40" />
            <span>{t('zoneSafe')} &gt;20%</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-warning/40" />
            <span>{t('zoneCaution')} 0~20%</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-destructive/40" />
            <span>{t('zoneDanger')} &lt;0%</span>
          </span>
        </div>
        <span className="font-mono text-muted-foreground/60" suppressHydrationWarning>
          {t('shutdownPrice')}: {sp.toFixed(4)} USDT
        </span>
      </div>
    </div>
  );
}
