'use client';

import { Currency, MiningResults } from '../types';
import InfoIcon from './InfoIcon';

interface EfficiencyPanelProps {
  results: MiningResults;
  currency: Currency;
  t: (key: string) => string;
}

export default function EfficiencyPanel({
  results,
  currency,
  t,
}: EfficiencyPanelProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground">{t('efficiencyTitle')}</span>
        <span className="text-[10px] text-muted-foreground/60">{t('effHigher')}</span>
      </div>
      <p className="text-[10px] text-muted-foreground/60 mb-3">{t('effSingleCard')}</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border bg-muted/30 p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-2">
            {t('costEff')}
            <InfoIcon tooltip={t('tipCostEff')} />
          </div>
          <div className="text-xl font-bold text-primary font-mono" suppressHydrationWarning>{results.costEff.toFixed(4)}</div>
          <div className="text-[10px] text-muted-foreground/60 mt-0.5">TH/{currency}</div>
        </div>
        <div className="rounded-md border bg-muted/30 p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-2">
            {t('powerEff')}
            <InfoIcon tooltip={t('tipPowerEff')} />
          </div>
          <div className="text-xl font-bold text-primary font-mono" suppressHydrationWarning>{results.powerEff.toFixed(3)}</div>
          <div className="text-[10px] text-muted-foreground/60 mt-0.5">TH/W</div>
        </div>
      </div>
    </div>
  );
}
