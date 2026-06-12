'use client';

import { Currency } from '../types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
      <div className="space-y-2">
        <Label htmlFor="gpuCount">{t('gpuCount')}</Label>
        <Input
          id="gpuCount"
          type="number"
          value={gpuCount}
          step="1"
          min="1"
          max="1000"
          onChange={(e) => onInputChange('gpuCount', e.target.value)}
          className="font-mono"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cardPrice">
            {t('cardPrice')} <span className="text-muted-foreground font-normal">({currency})</span>
          </Label>
          <Input
            id="cardPrice"
            type="number"
            value={cardPrice}
            step="100"
            min="0"
            max="100000"
            onChange={(e) => onInputChange('cardPrice', e.target.value)}
            className="font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="residualValue">
            {t('residualValue')} <span className="text-muted-foreground font-normal">({currency})</span>
          </Label>
          <Input
            id="residualValue"
            type="number"
            value={residualValue}
            step="100"
            min="0"
            max="100000"
            onChange={(e) => onInputChange('residualValue', e.target.value)}
            className="font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="powerCons">{t('powerCons')}</Label>
          <Input
            id="powerCons"
            type="number"
            value={powerCons}
            step="10"
            min="0"
            max="2000"
            onChange={(e) => onInputChange('powerCons', e.target.value)}
            className="font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gpuHashrate">{t('gpuHashrate')}</Label>
          <Input
            id="gpuHashrate"
            type="number"
            value={gpuHashrate}
            step="1"
            min="0"
            max="10000"
            onChange={(e) => onInputChange('gpuHashrate', e.target.value)}
            className="font-mono"
          />
        </div>
      </div>
    </div>
  );
}
