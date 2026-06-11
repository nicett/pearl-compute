'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useI18n } from './i18n/context';
import { useTheme } from './theme/context';
import { useMiningCalculator } from './hooks/useMiningCalculator';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import { useChartManager } from './hooks/useChartManager';
import { usePoolData } from './hooks/usePoolData';
import { usePersistedInputs } from './hooks/useLocalStorage';
import { formatNumber, formatSyncTime } from './utils';
import { calcChangePercent } from './math';
import { InitialData, MiningInputs, Currency, PriceHistoryPoint, PoolData } from './types';

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
}

export default function MinerCalculator({ initialData }: Props) {
  const { t, locale, setLocale } = useI18n();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const currency: Currency = locale === 'zh' ? 'CNY' : 'USD';

  // 默认参数（首屏渲染、SSR 安全；客户端 mount 后由 usePersistedInputs 合并 localStorage 的值）
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
    selectedPool: null, // 由 usePoolData hook 管理
  };
  const [inputs, setInputs] = usePersistedInputs<MiningInputs>('miner_calc', defaults, PERSISTED_FIELDS);

  // 保存选择矿池前的用户自定义 poolFee
  const prePoolFeeRef = useRef<number | null>(null);

  // 矿池选择回调
  const handlePoolChange = useCallback((pool: PoolData | null) => {
    setInputs((prev) => {
      if (pool) {
        // 首次选择矿池时，保存用户的自定义 poolFee
        if (prePoolFeeRef.current === null) {
          prePoolFeeRef.current = prev.poolFee;
        }
        // 计算矿池 yield
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
      // 取消选择时，恢复原始 poolFee 和初始 yield
      const restoredFee = prePoolFeeRef.current ?? prev.poolFee;
      prePoolFeeRef.current = null;
      return {
        ...prev,
        hashrateYield: initialData.hashrateYield,
        poolFee: restoredFee,
        selectedPool: null,
      };
    });
  }, [initialData.hashrateYield]);

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
    // 只依赖真正影响图表的标量字段，避免 results / charts 对象引用每次变化都触发 Chart.update()
  }, [results.dailyElecCostRMB, results.dailyNetRMB, results.totalInvestment, results.totalResidual, charts.updateCharts]);

  const isBleeding = results.dailyNetRMB <= 0;

  return (
    <div className="min-h-screen bg-surface-dark overflow-x-hidden w-full">
      {/* 顶部控制栏 */}
      <TopBar
        locale={locale}
        setLocale={setLocale}
        theme={theme}
        setTheme={setTheme}
        syncStatus={sync.syncStatus}
        isStale={sync.isStale}
        countdown={sync.countdown}
        t={t}
      />

      {/* 三栏布局 */}
      <div className="max-w-[1600px] mx-auto px-4 py-4 lg:px-6 lg:py-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5">

          {/* ── 左栏：参数输入 ── */}
          <div className="w-full lg:w-[340px] xl:w-[380px] flex-shrink-0">
            <Panel title={t('sectionInput')}>
              {/* 价格展示 */}
              <PriceDisplay
                coinPrice={inputs.coinPrice}
                allPrices={sync.allPrices}
                selectedPriceSource={sync.selectedPriceSource}
                onSelectPrice={sync.handleSelectPrice}
                priceHistory={sync.priceHistory}
                t={t}
              />
              <div className="border-t border-edge my-4" />
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
              <div className="border-t border-edge my-4" />
              <PoolSelector
                pools={poolData.pools}
                selectedPool={poolData.selectedPool}
                loading={poolData.loading}
                error={poolData.error}
                onSelectPool={poolData.selectPool}
                t={t}
              />
              <div className="border-t border-edge my-4" />
              <NetworkInputs
                inputs={inputs}
                results={results}
                currency={currency}
                t={t}
                onInputChange={handleInputChange}
              />
              <div className="border-t border-edge my-4" />
              <EfficiencyPanel
                results={results}
                currency={currency}
                t={t}
              />
            </Panel>
          </div>

          {/* ── 中栏：计算结果 ── */}
          <div className="w-full lg:flex-1 min-w-0">
            <Panel title={t('sectionResults')} subtitle={t('disclaimer')}>
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
              <div className="border-t border-edge my-4" />
              <PaybackSection
                results={results}
                coinPrice={inputs.coinPrice}
                currency={currency}
                isBleeding={isBleeding}
                t={t}
              />
              <div className="border-t border-edge my-4" />
              <ChartPanel
                compChartRef={charts.compChartRef}
                projChartRef={charts.projChartRef}
                t={t}
              />
              <div className="mt-4 flex justify-end">
                <ExportButton results={results} currency={currency} t={t} />
              </div>
            </Panel>
          </div>

          {/* ── 右栏：实时信息 ── */}
          <div className="w-full lg:w-[320px] xl:w-[360px] flex-shrink-0">
            <Panel title={t('sectionRealtime')}>
              <NetworkStatsPanel
                networkStats={sync.networkStats}
                t={t}
              />
              <div className="border-t border-edge my-4" />
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
                <div className="border border-edge overflow-hidden h-[220px] flex items-center justify-center text-muted text-sm tracking-wider uppercase">
                  {t('priceTrendDesc')} · Not Available for {sync.selectedPriceSource}
                </div>
              )}
            </Panel>
          </div>

        </div>
      </div>

      {/* 底部 */}
      <div className="border-t border-edge py-4 text-center text-xs text-muted/40 tracking-wider uppercase">
        PRL MINER v2.0
      </div>
    </div>
  );
}

/* ── 子组件 ── */

/** 顶部控制栏 */
function TopBar({ locale, setLocale, theme, setTheme, syncStatus, isStale, countdown, t }: {
  locale: string;
  setLocale: (l: 'en' | 'zh') => void;
  theme: string;
  setTheme: (t: 'light' | 'dark' | 'system') => void;
  syncStatus: string;
  isStale: boolean;
  countdown: number;
  t: (k: string) => string;
}) {
  const statusColor = syncStatus === 'error' ? 'bg-red-500' : isStale ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="bg-surface border-b border-edge">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-6 py-3 flex flex-wrap items-center justify-between gap-y-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <span className="text-accent font-bold text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase">PRL</span>
          <span className="text-muted/30 text-xs hidden sm:inline">MINER CALCULATOR</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted flex-shrink-0">
            <span className={`w-2 h-2 rounded-full ${statusColor} animate-pulse-slow`} />
            <span suppressHydrationWarning>{syncStatus === 'error' ? 'ERR' : `${countdown}s`}</span>
          </div>
          <span className="text-edge hidden sm:inline">│</span>
          <button
            onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
            className="text-xs text-muted hover:text-gray-200 px-2 py-1 border border-edge hover:border-edge-light transition-colors tracking-wider uppercase"
          >
            {locale === 'en' ? 'EN/$' : '中/￥'}
          </button>
          <div className="flex items-center border border-edge">
            <button onClick={() => setTheme('light')} className={`px-2 py-1 text-xs ${theme === 'light' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-gray-200'}`}>☀</button>
            <button onClick={() => setTheme('dark')} className={`px-2 py-1 text-xs border-x border-edge ${theme === 'dark' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-gray-200'}`}>☾</button>
            <button onClick={() => setTheme('system')} className={`px-2 py-1 text-xs ${theme === 'system' ? 'bg-accent/10 text-accent' : 'text-muted hover:text-gray-200'}`}>◉</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 通用面板容器 */
function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-edge">
      <div className="px-5 py-3 border-b border-edge">
        <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-muted">{title}</h2>
        {subtitle && <p className="text-[10px] text-muted/50 mt-1 leading-relaxed">{subtitle}</p>}
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

/** 价格展示（左栏内） */
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
      <div className="text-xs text-muted tracking-wider uppercase mb-2">{t('coinPrice')}</div>
      <div className="flex items-end gap-3 mb-3" suppressHydrationWarning>
        <span className="text-2xl sm:text-4xl font-bold text-accent font-mono tracking-tight" suppressHydrationWarning>
          ${coinPrice.toFixed(4)}
        </span>
        <span className={`text-base font-mono font-bold mb-0.5 ${isUp ? 'text-emerald-400' : 'text-red-400'}`} suppressHydrationWarning>
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
                onClick={() => onSelectPrice(p.name, p.price)}
                className={`text-xs px-2.5 py-1.5 border transition-colors font-mono ${
                  isSelected
                    ? 'border-accent text-accent bg-accent/5'
                    : 'border-edge text-muted hover:border-edge-light hover:text-gray-300'
                }`}
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

/** 网络统计面板（右栏内） */
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
    { label: t('networkHashrate'), value: networkStats.networkHashrateTH > 0 ? formatHashrate(networkStats.networkHashrateTH) : networkStats.networkHashrate || 'N/A', color: 'text-indigo-400' },
    { label: t('dailyGlobalOutput'), value: networkStats.dailyGlobalOutput > 0 ? `${formatNumber(networkStats.dailyGlobalOutput, 0)} PRL` : 'N/A', color: 'text-emerald-400' },
    { label: t('avgBlockTime'), value: networkStats.avgBlockTime || 'N/A', color: 'text-cyan-400' },
  ];

  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.label} className="flex items-center justify-between" suppressHydrationWarning>
          <span className="text-xs text-muted tracking-wider uppercase">{item.label}</span>
          <span className={`text-sm font-mono font-bold ${item.color}`} suppressHydrationWarning>{item.value}</span>
        </div>
      ))}
    </div>
  );
}
