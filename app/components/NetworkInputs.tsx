'use client';

import { Currency, MiningInputs, MiningResults } from '../types';

interface NetworkInputsProps {
  inputs: MiningInputs;
  results: MiningResults;
  currency: Currency;
  t: (key: string) => string;
  onInputChange: (field: string, value: string) => void;
}

export default function NetworkInputs({
  inputs,
  results,
  currency,
  t,
  onInputChange,
}: NetworkInputsProps) {
  return (
    <div className="space-y-4">
      <div className="input-group relative">
        <div className="flex justify-between items-end mb-2">
          <label className="mb-0 text-indigo-400">
            {t('hashrateYield')}
          </label>
          <span className="text-[10px] text-indigo-400/60 font-medium border border-indigo-500/20 px-1.5 py-0.5 tracking-wider uppercase">
            {t('singleCardYield')}: {results.singleCardHourlyCoins.toFixed(5)}
          </span>
        </div>
        <input
          type="number"
          value={inputs.hashrateYield.toFixed(6)}
          step="0.000001"
          readOnly
          className="bg-surface text-muted cursor-not-allowed border-edge"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="input-group">
          <label>{t('poolFee')}</label>
          <input
            type="number"
            value={inputs.poolFee}
            step="0.1"
            min="0"
            max="50"
            onChange={(e) => onInputChange('poolFee', e.target.value)}
          />
        </div>
        <div className="input-group">
          <label>{t('electricityPrice')}</label>
          <input
            type="number"
            value={inputs.electricityPrice}
            step="0.01"
            min="0"
            max="10"
            onChange={(e) => onInputChange('electricityPrice', e.target.value)}
          />
        </div>
      </div>
      {currency === 'CNY' && (
        <div className="input-group">
          <label>{t('exchangeRate')}</label>
          <input
            type="number"
            value={inputs.exchangeRate.toFixed(2)}
            step="0.01"
            readOnly
            className="bg-surface text-muted cursor-not-allowed border-edge"
          />
        </div>
      )}
    </div>
  );
}
