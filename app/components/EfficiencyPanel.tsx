'use client';

import { Currency, MiningResults } from '../types';
import { formatCurrency } from '../utils';
import InfoIcon from './InfoIcon';

interface EfficiencyPanelProps {
  results: MiningResults;
  effMonths: number;
  setEffMonths: (months: number) => void;
  currency: Currency;
  t: (key: string) => string;
}

export default function EfficiencyPanel({
  results,
  effMonths,
  setEffMonths,
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
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
        <div className="text-center p-3 bg-surface-dark border border-accent/20">
          <div className="text-[10px] text-accent/50 tracking-wider uppercase font-semibold mb-2 flex items-center justify-center gap-1">
            {t('longTermEff')}
            <InfoIcon tooltip={t('tipLongTermEff')} />
          </div>
          <div className="text-xl font-bold text-accent font-mono" suppressHydrationWarning>{results.longTermEff.toFixed(4)}</div>
          <div className="text-[10px] text-muted/40 tracking-wider mt-0.5">TH/{currency}</div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 text-sm text-muted">
        <span className="tracking-wider uppercase flex items-center gap-1">
          {t('effPeriod')}
          <InfoIcon tooltip={t('tipEffPeriod')} />
        </span>
        <select
          value={effMonths}
          onChange={(e) => setEffMonths(parseInt(e.target.value))}
          className="px-3 py-1.5 border border-edge text-sm bg-surface-dark text-gray-300 focus:outline-none focus:border-accent"
        >
          {[1,2,3,4,5,6,7,8,9,10,11,12,18,24,30,36].map(m => (
            <option key={m} value={m}>{m} {t('months')}</option>
          ))}
        </select>
        <span className="text-edge">│</span>
        <span className="flex items-center gap-1">
          {t('tcoElectricity')}: <strong className="text-gray-300" suppressHydrationWarning>{formatCurrency(results.longTermElecCost, currency)}</strong>
          <InfoIcon tooltip={t('tipTcoElectricity')} />
        </span>
      </div>
    </div>
  );
}
