'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Globe, Sun, Moon, Languages } from 'lucide-react';

import { useI18n } from './i18n/context';
import { useTheme } from './theme/context';
import { useMiningCalculator } from './hooks/useMiningCalculator';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import { useChartManager } from './hooks/useChartManager';
import { usePoolData } from './hooks/usePoolData';
import { useSyncedConfig } from './hooks/useSyncedConfig';
import { formatNumber, formatSyncTime } from './utils';
import { calcChangePercent } from './math';
import { InitialData, MiningInputs, Currency, PriceHistoryPoint, PoolData } from './types';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import HardwareInputs from './components/HardwareInputs';
import NetworkInputs from './components/NetworkInputs';
import PoolSelector from './components/PoolSelector';
import EfficiencyPanel from './components/EfficiencyPanel';
import ResultHero from './components/ResultHero';
import MetricsRow from './components/MetricsRow';
import PaybackSection from './components/PaybackSection';
import PriceChart from './components/PriceChart';
import ChartPanel from './components/ChartPanel';
import ExportButton from './components/ExportButton';
import SyncStatusBar from './components/SyncStatusBar';

interface Props {
  initialData: InitialData;
  /** 控制是否渲染顶栏（公开页 / true，登录后嵌在 AppShell 里 / false） */
  showTopBar?: boolean;
}

export default function MinerCalculator({ initialData, showTopBar = true }: Props) {
  const { t, locale, setLocale } = useI18n();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const currency: Currency = locale === 'zh' ? 'CNY' : 'USD';

  const PERSISTED_FIELDS: (keyof MiningInputs)[] = [
    'gpuCount', 'cardPrice', 'residualValue', 'powerCons',
    'gpuHashrate', 'poolFee', 'electricityPrice',
  ];
  const defaults: MiningInputs = {
    gpuCount: 1,
    cardPrice: 2800,
    residualValue: 2000,
    powerCons: 150,
    gpuHashrate: 70,
    hashrateYield: initialData.hashrateYield,
    coinPrice: initialData.coinPrice,
    poolFee: 3.0,
    electricityPrice: 0.70,
    exchangeRate: initialData.exchangeRate,
    selectedPool: null,
  };
  const [inputs, setInputs] = useSyncedConfig<MiningInputs>('miner_calc', defaults, PERSISTED_FIELDS);

  const prePoolFeeRef = useRef<number | null>(null);

  const handlePoolChange = useCallback((pool: PoolData | null) => {
    setInputs((prev) => {
      if (pool) {
        if (prePoolFeeRef.current === null) {
          prePoolFeeRef.current = prev.poolFee;
        }
        const dailyOutput = pool.reward_24h_grains / 1e8;
        const hashrateTH = pool.reported_hashrate_hps ? pool.reported_hashrate_hps / 1e12 : 0;
        const poolYield = hashrateTH > 0 ? dailyOutput / 24 / hashrateTH : prev.hashrateYield;

        return {
          ...prev,
          hashrateYield: poolYield,
          poolFee: pool.fee_percent,
          selectedPool: pool.slug,
        };
      }
      const restoredFee = prePoolFeeRef.current ?? prev.poolFee;
      prePoolFeeRef.current = null;
      return {
        ...prev,
        hashrateYield: initialData.hashrateYield,
        poolFee: restoredFee,
        selectedPool: null,
      };
    });
  }, [initialData.hashrateYield, setInputs]);

  const poolData = usePoolData(handlePoolChange);

  const handleInputChange = useCallback((field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setInputs((prev) => ({ ...prev, [field]: numValue }));
  }, [setInputs]);

  const results = useMiningCalculator(inputs, currency);
  const sync = useRealtimeSync(initialData.priceSource, setInputs, initialData.networkStats, initialData.priceHistory, inputs.selectedPool);
  const charts = useChartManager(resolvedTheme, t);

  useEffect(() => {
    charts.updateCharts({
      dailyElecCost: results.dailyElecCostRMB,
      dailyNet: results.dailyNetRMB,
      totalRiskExposure: results.totalInvestment - results.totalResidual,
    });
  }, [results.dailyElecCostRMB, results.dailyNetRMB, results.totalInvestment, results.totalResidual, charts.updateCharts]);

  const isBleeding = results.dailyNetRMB <= 0;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden w-full">
      {showTopBar && (
        <TopBar
          locale={locale}
          setLocale={setLocale}
          theme={theme}
          setTheme={setTheme}
          syncStatus={sync.syncStatus}
          isStale={sync.isStale}
          countdown={sync.countdown}
        />
      )}
      <div className="max-w-[1600px] mx-auto px-4 py-4 lg:px-6 lg:py-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5">

          {/* ── 左栏：参数输入 ── */}
          <div className="w-full lg:w-[340px] xl:w-[380px] flex-shrink-0">
            <Card>
              <CardHeader className="border-b py-4">
                <CardTitle className="text-sm">{t('sectionInput')}</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <PriceDisplay
                  coinPrice={inputs.coinPrice}
                  allPrices={sync.allPrices}
                  selectedPriceSource={sync.selectedPriceSource}
                  onSelectPrice={sync.handleSelectPrice}
                  priceHistory={sync.priceHistory}
                  t={t}
                />
                <div className="border-t" />
                <HardwareInputs
                  gpuCount={inputs.gpuCount}
                  cardPrice={inputs.cardPrice}
                  residualValue={inputs.residualValue}
                  powerCons={inputs.powerCons}
                  gpuHashrate={inputs.gpuHashrate}
                  currency={currency}
                  t={t}
                  onInputChange={handleInputChange}
                />
                <div className="border-t" />
                <PoolSelector
                  pools={poolData.pools}
                  selectedPool={poolData.selectedPool}
                  loading={poolData.loading}
                  error={poolData.error}
                  onSelectPool={poolData.selectPool}
                  t={t}
                />
                <div className="border-t" />
                <NetworkInputs
                  inputs={inputs}
                  results={results}
                  currency={currency}
                  t={t}
                  onInputChange={handleInputChange}
                />
                <div className="border-t" />
                <EfficiencyPanel
                  results={results}
                  currency={currency}
                  t={t}
                />
              </CardContent>
            </Card>
          </div>

          {/* ── 中栏：计算结果 ── */}
          <div className="w-full lg:flex-1 min-w-0">
            <Card>
              <CardHeader className="border-b py-4">
                <CardTitle className="text-sm">{t('sectionResults')}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{t('disclaimer')}</p>
              </CardHeader>
              <CardContent className="p-5">
                <ResultHero
                  results={results}
                  currency={currency}
                  isBleeding={isBleeding}
                  t={t}
                />
                <MetricsRow
                  results={results}
                  currency={currency}
                  t={t}
                />
                <div className="border-t my-5" />
                <PaybackSection
                  results={results}
                  coinPrice={inputs.coinPrice}
                  currency={currency}
                  isBleeding={isBleeding}
                  t={t}
                />
                <div className="border-t my-5" />
                <ChartPanel
                  compChartRef={charts.compChartRef}
                  projChartRef={charts.projChartRef}
                  t={t}
                />
                <div className="mt-4 flex justify-end">
                  <ExportButton results={results} currency={currency} t={t} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── 右栏：实时信息 ── */}
          <div className="w-full lg:w-[320px] xl:w-[360px] flex-shrink-0">
            <Card>
              <CardHeader className="border-b py-4">
                <CardTitle className="text-sm">{t('sectionRealtime')}</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <NetworkStatsPanel networkStats={sync.networkStats} t={t} />
                <div className="border-t" />
                <SyncStatusBar
                  syncStatus={sync.syncStatus}
                  isStale={sync.isStale}
                  countdown={sync.countdown}
                  priceSource={sync.priceSource}
                  lastSyncTs={sync.lastSyncTs}
                  formattedSyncTime={sync.lastSyncTs ? formatSyncTime(sync.lastSyncTs, locale) : ''}
                  t={t}
                />
                {sync.selectedPriceSource === 'SafeTrade' ? (
                  <PriceChart
                    priceHistory={sync.priceHistory}
                    resolvedTheme={resolvedTheme}
                    t={t}
                  />
                ) : (
                  <div className="rounded-md border h-[220px] flex items-center justify-center text-muted-foreground text-xs">
                    {t('priceTrendDesc')} · Not Available for {sync.selectedPriceSource}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>

      <div className="border-t py-4 text-center text-xs text-muted-foreground/60">
        PRL MINER v2.0
      </div>
    </div>
  );
}

/* ── 子组件 ── */

/** 顶部状态栏（公开页用，登录页另有 AppShell） */
function TopBar({ locale, setLocale, theme, setTheme, syncStatus, isStale, countdown }: {
  locale: string;
  setLocale: (l: 'en' | 'zh') => void;
  theme: string;
  setTheme: (t: 'light' | 'dark' | 'system') => void;
  syncStatus: string;
  isStale: boolean;
  countdown: number;
}) {
  const dotColor = syncStatus === 'error'
    ? 'bg-destructive'
    : isStale
    ? 'bg-warning'
    : 'bg-success';

  return (
    <header className="sticky top-0 z-40 bg-card/80 backdrop-blur border-b">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-6 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 text-base font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70">
            <span className="text-primary-foreground text-xs font-bold">P</span>
          </span>
          <span className="hidden sm:inline">Pearl Compute</span>
        </a>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground" suppressHydrationWarning>
            <span className={cn('w-2 h-2 rounded-full animate-pulse-slow', dotColor)} />
            <span suppressHydrationWarning>
              {syncStatus === 'error' ? 'ERR' : `${countdown}s`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <Languages className="h-3.5 w-3.5" />
            {locale === 'en' ? 'EN/$' : '中/￥'}
          </button>

          <div className="flex items-center rounded-md border p-0.5">
            {(['light', 'dark', 'system'] as const).map((opt) => {
              const Icon = opt === 'light' ? Sun : opt === 'dark' ? Moon : Globe;
              const active = theme === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setTheme(opt)}
                  className={cn(
                    'flex h-6 w-7 items-center justify-center rounded-sm transition-colors',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  title={opt}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}

/** 价格展示 */
function PriceDisplay({ coinPrice, allPrices, selectedPriceSource, onSelectPrice, priceHistory, t }: {
  coinPrice: number;
  allPrices: { name: string; price: number }[];
  selectedPriceSource: string;
  onSelectPrice: (name: string, price: number) => void;
  priceHistory: PriceHistoryPoint[];
  t: (k: string) => string;
}) {
  const prices = priceHistory.map(p => p.price);
  const firstPrice = prices.length > 0 ? prices[0] : 0;
  const changePercent = calcChangePercent(coinPrice, firstPrice);
  const isUp = changePercent >= 0;

  return (
    <div suppressHydrationWarning>
      <div className="text-xs text-muted-foreground mb-2">{t('coinPrice')}</div>
      <div className="flex items-end gap-3 mb-3" suppressHydrationWarning>
        <span className="text-2xl sm:text-4xl font-bold text-primary font-mono tracking-tight" suppressHydrationWarning>
          ${coinPrice.toFixed(4)}
        </span>
        <span
          className={cn(
            'text-base font-mono font-semibold mb-0.5',
            isUp ? 'text-success' : 'text-destructive',
          )}
          suppressHydrationWarning
        >
          {isUp ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
        </span>
      </div>
      {allPrices.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allPrices.map((p) => {
            const isSelected = p.name === selectedPriceSource;
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => onSelectPrice(p.name, p.price)}
                className={cn(
                  'rounded-md border px-2.5 py-1 text-xs font-mono transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
                )}
              >
                {p.name}: ${p.price.toFixed(4)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 网络统计面板 */
function NetworkStatsPanel({ networkStats, t }: {
  networkStats: { networkHashrateTH: number; networkHashrate: string; dailyGlobalOutput: number; avgBlockTime: string };
  t: (k: string) => string;
}) {
  function formatHashrate(hashrateTH: number): string {
    if (hashrateTH >= 1000000) return `${formatNumber(hashrateTH / 1000000, 2)} EH/s`;
    if (hashrateTH >= 1000) return `${formatNumber(hashrateTH / 1000, 2)} PH/s`;
    return `${formatNumber(hashrateTH, 2)} TH/s`;
  }

  const items = [
    { label: t('networkHashrate'), value: networkStats.networkHashrateTH > 0 ? formatHashrate(networkStats.networkHashrateTH) : networkStats.networkHashrate || 'N/A' },
    { label: t('dailyGlobalOutput'), value: networkStats.dailyGlobalOutput > 0 ? `${formatNumber(networkStats.dailyGlobalOutput, 0)} PRL` : 'N/A' },
    { label: t('avgBlockTime'), value: networkStats.avgBlockTime || 'N/A' },
  ];

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.label} className="flex items-center justify-between" suppressHydrationWarning>
          <span className="text-xs text-muted-foreground">{item.label}</span>
          <span className="text-sm font-mono font-semibold text-foreground" suppressHydrationWarning>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
