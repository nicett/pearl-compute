'use client';

import { Currency, MiningInputs, MiningResults } from '../types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InfoIcon from './InfoIcon';

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
  const isPoolSelected = inputs.selectedPool != null;

  return (
    <div className="space-y-4">
      {/* hashrate yield —— 只读，但显示单卡 yield 标签 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center flex-wrap gap-1">
          <Label htmlFor="hashrateYield">{t('hashrateYield')}</Label>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {t('singleCardYield')}: {results.singleCardHourlyCoins.toFixed(5)}
          </Badge>
        </div>
        <Input
          id="hashrateYield"
          type="number"
          value={inputs.hashrateYield.toFixed(6)}
          step="0.000001"
          readOnly
          className="font-mono bg-muted/50 cursor-not-allowed"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* poolFee */}
        <div className="space-y-2">
          <Label htmlFor="poolFee" className="flex items-center gap-1">
            {t('poolFee')}
            {isPoolSelected && <InfoIcon tooltip={t('controlledByPool')} />}
          </Label>
          <Input
            id="poolFee"
            type="number"
            value={inputs.poolFee}
            step="0.1"
            min="0"
            max="50"
            readOnly={isPoolSelected}
            className={`font-mono ${isPoolSelected ? 'bg-muted/50 cursor-not-allowed' : ''}`}
            onChange={(e) => onInputChange('poolFee', e.target.value)}
          />
        </div>

        {/* electricityPrice */}
        <div className="space-y-2">
          <Label htmlFor="electricityPrice">{t('electricityPrice')}</Label>
          <Input
            id="electricityPrice"
            type="number"
            value={inputs.electricityPrice}
            step="0.01"
            min="0"
            max="10"
            onChange={(e) => onInputChange('electricityPrice', e.target.value)}
            className="font-mono"
          />
        </div>
      </div>

      {currency === 'CNY' && (
        <div className="space-y-2">
          <Label htmlFor="exchangeRate">{t('exchangeRate')}</Label>
          <Input
            id="exchangeRate"
            type="number"
            value={inputs.exchangeRate.toFixed(2)}
            step="0.01"
            readOnly
            className="font-mono bg-muted/50 cursor-not-allowed"
          />
        </div>
      )}
    </div>
  );
}
