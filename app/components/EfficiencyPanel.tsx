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
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold tracking-wider uppercase text-muted">
          {t('efficiencyTitle')}
        </span>
        <span className="text-[10px] text-muted/40 tracking-wider uppercase">{t('effHigher')}</span>
      </div>
      <p className="text-[10px] text-muted/40 mb-4">{t('effSingleCard')}</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 bg-surface-dark border border-edge">
          <div className="text-[10px] text-muted tracking-wider uppercase mb-2 flex items-center justify-center gap-1">
            {t('costEff')}
            <InfoIcon tooltip={t('tipCostEff')} />
          </div>
          <div className="text-xl font-bold text-indigo-400 font-mono" suppressHydrationWarning>{results.costEff.toFixed(4)}</div>
          <div className="text-[10px] text-muted/40 tracking-wider mt-0.5">TH/{currency}</div>
        </div>
        <div className="text-center p-3 bg-surface-dark border border-edge">
          <div className="text-[10px] text-muted tracking-wider uppercase mb-2 flex items-center justify-center gap-1">
            {t('powerEff')}
            <InfoIcon tooltip={t('tipPowerEff')} />
          </div>
          <div className="text-xl font-bold text-indigo-400 font-mono" suppressHydrationWarning>{results.powerEff.toFixed(3)}</div>
          <div className="text-[10px] text-muted/40 tracking-wider mt-0.5">TH/W</div>
        </div>
      </div>
    </div>
  );
}
