'use client';

import { Currency } from '../types';

interface HardwareInputsProps {
  gpuCount: number;
  cardPrice: number;
  residualValue: number;
  powerCons: number;
  gpuHashrate: number;
  currency: Currency;
  t: (key: string) => string;
  onInputChange: (field: string, value: string) => void;
}

export default function HardwareInputs({
  gpuCount,
  cardPrice,
  residualValue,
  powerCons,
  gpuHashrate,
  currency,
  t,
  onInputChange,
}: HardwareInputsProps) {
  return (
    <div className="space-y-4">
      <div className="input-group">
        <label>{t('gpuCount')}</label>
        <input
          type="number"
          value={gpuCount}
          step="1"
          min="1"
          max="1000"
          onChange={(e) => onInputChange('gpuCount', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="input-group">
          <label>{t('cardPrice')} ({currency})</label>
          <input
            type="number"
            value={cardPrice}
            step="100"
            min="0"
            max="100000"
            onChange={(e) => onInputChange('cardPrice', e.target.value)}
          />
        </div>
        <div className="input-group">
          <label>{t('residualValue')} ({currency})</label>
          <input
            type="number"
            value={residualValue}
            step="100"
            min="0"
            max="100000"
            onChange={(e) => onInputChange('residualValue', e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="input-group">
          <label>{t('powerCons')}</label>
          <input
            type="number"
            value={powerCons}
            step="10"
            min="0"
            max="2000"
            onChange={(e) => onInputChange('powerCons', e.target.value)}
          />
        </div>
        <div className="input-group">
          <label>{t('gpuHashrate')}</label>
          <input
            type="number"
            value={gpuHashrate}
            step="1"
            min="0"
            max="10000"
            onChange={(e) => onInputChange('gpuHashrate', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
