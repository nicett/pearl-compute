'use client';

import { calcSafetyMargin } from '../math';

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
  const zoneColor = zone === 'safe' ? 'text-emerald-400' : zone === 'warning' ? 'text-amber-400' : 'text-red-400';
  const zoneBg = zone === 'safe' ? 'bg-emerald-500' : zone === 'warning' ? 'bg-amber-500' : 'bg-red-500';

  const maxPrice = Math.max(cp * 1.1, sp * 2.5);
  const currentPct = 100 - Math.min((cp / maxPrice) * 100, 100);
  const shutdownPct = 100 - Math.min((sp / maxPrice) * 100, 100);
  const warnPct = 100 - Math.min((sp * 1.2 / maxPrice) * 100, 100);

  return (
    <div className="mt-5 pt-4 border-t border-edge">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-300 tracking-wider uppercase">{t('shutdownPrice')}</span>
          <span className="text-xs text-muted/30 cursor-help">[?]</span>
        </div>
        <div className={`text-sm font-bold tracking-wider uppercase ${zoneColor}`} suppressHydrationWarning>
          {zone === 'danger' ? t('bleedingWarning') : `${t('safetyMargin')} ${safetyMargin > 0 ? '+' : ''}${safetyMargin.toFixed(1)}%`}
        </div>
      </div>

      <div className="relative mx-1" style={{ height: '48px' }}>
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-emerald-500/10" style={{ width: `${warnPct}%` }} />
          <div className="absolute inset-y-0 bg-amber-500/10" style={{ left: `${warnPct}%`, width: `${shutdownPct - warnPct}%` }} />
          <div className="absolute inset-y-0 right-0 bg-red-500/10" style={{ width: `${100 - shutdownPct}%` }} />
          <div className="absolute inset-y-0 w-px bg-edge" style={{ left: `${warnPct}%` }} />
          <div className="absolute inset-y-0 w-px bg-edge" style={{ left: `${shutdownPct}%` }} />
        </div>

        <div className="absolute top-0 bottom-0 z-20" style={{ left: `${currentPct}%` }}>
          <div className={`absolute top-0 bottom-0 w-0.5 ${zoneBg}`} />
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <span className={`text-sm font-bold font-mono ${zoneColor} whitespace-nowrap`} suppressHydrationWarning>{cp.toFixed(4)}</span>
            <div className={`w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent ${zone === 'safe' ? 'border-t-emerald-500' : zone === 'warning' ? 'border-t-amber-500' : 'border-t-red-500'}`} />
          </div>
        </div>

        <div className="absolute top-0 bottom-0 z-10" style={{ left: `${shutdownPct}%` }}>
          <div className="absolute top-0 bottom-0 w-0.5 bg-red-500/60" />
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[4px] border-l-transparent border-r-transparent border-b-red-500/60" />
            <span className="text-sm font-mono text-red-400/70 whitespace-nowrap" suppressHydrationWarning>{sp.toFixed(4)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-8 text-xs text-muted/50 tracking-wider uppercase">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-500/40" />
            <span>{t('zoneSafe')} &gt;20%</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-amber-500/40" />
            <span>{t('zoneCaution')} 0~20%</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-red-500/40" />
            <span>{t('zoneDanger')} &lt;0%</span>
          </span>
        </div>
        <span className="font-mono text-muted/40 normal-case tracking-normal" suppressHydrationWarning>
          {t('shutdownPrice')}: {sp.toFixed(4)} USDT
        </span>
      </div>
    </div>
  );
}
