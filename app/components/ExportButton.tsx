'use client';

import { useState, useCallback } from 'react';
import { Check, Copy } from 'lucide-react';

import { Currency, MiningResults } from '../types';
import { formatCurrency, formatNumber } from '../utils';
import { Button } from '@/components/ui/button';

interface ExportButtonProps {
  results: MiningResults;
  currency: Currency;
  t: (key: string) => string;
}

export default function ExportButton({ results, currency, t }: ExportButtonProps) {
  const [copied, setCopied] = useState(false);

  const generateSummary = useCallback(() => {
    const lines = [
      `PRL Mining Calculator`,
      '================================',
      `${t('totalHashrate')}: ${results.totalHashrate.toLocaleString()} TH/s`,
      `${t('totalPower')}: ${results.totalPowerKW.toFixed(2)} kW`,
      `${t('totalInvestment')}: ${formatCurrency(results.totalInvestment, currency)}`,
      '',
      `${t('dailyGross')}: ${formatCurrency(results.dailyGrossRMB, currency)}`,
      `${t('dailyElecCost')}: ${formatCurrency(results.dailyElecCostRMB, currency)}`,
      `${t('dailyNet')}: ${formatCurrency(results.dailyNetRMB, currency)}`,
      `${t('costRatio')}: ${results.costRatio.toFixed(2)}%`,
      '',
      `${t('fullPayback')}: ${formatNumber(results.fullDays, 1)} ${t('days')}`,
      `${t('residualPayback')}: ${formatNumber(results.resDays, 1)} ${t('days')}`,
      `${t('shutdownPrice')}: ${results.shutdownPrice.toFixed(4)} USDT`,
      `${t('dailyROI')}: ${results.dailyROI.toFixed(3)}%`,
      `${t('annualizedROI')}: ${results.annualizedROI.toFixed(1)}%`,
      `${t('profitMultiple')}: ${results.profitMultiple.toFixed(2)}x`,
    ];
    return lines.join('\n');
  }, [results, currency, t]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generateSummary());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = generateSummary();
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generateSummary]);

  return (
    <Button variant="outline" size="sm" onClick={handleCopy} title={t('exportSummary')}>
      {copied ? (
        <>
          <Check className="text-success" />
          {t('copied')}
        </>
      ) : (
        <>
          <Copy />
          {t('exportSummary')}
        </>
      )}
    </Button>
  );
}
