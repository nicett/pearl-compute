'use client';

import { NetworkStats, PriceSource, SyncStatus } from '../types';
import { formatNumber } from '../utils';

interface NetworkTickerProps {
  networkStats: NetworkStats;
  coinPrice: number;
  allPrices: PriceSource[];
  selectedPriceSource: string;
  onSelectPrice: (name: string, price: number) => void;
  syncStatus: SyncStatus;
  isStale: boolean;
  countdown: number;
  t: (key: string) => string;
}

function formatHashrate(hashrateTH: number): string {
  if (hashrateTH >= 1000000) return `${formatNumber(hashrateTH / 1000000, 2)} EH/s`;
  if (hashrateTH >= 1000) return `${formatNumber(hashrateTH / 1000, 2)} PH/s`;
  return `${formatNumber(hashrateTH, 2)} TH/s`;
}

/**
 * 全宽顶部行情条 — 紧凑单行，仿 DEX 行情 ticker
 */
export default function NetworkTicker({
  networkStats,
  coinPrice,
  allPrices,
  selectedPriceSource,
  onSelectPrice,
  syncStatus,
  isStale,
  countdown,
  t,
}: NetworkTickerProps) {
  const statusColor = syncStatus === 'error'
    ? 'bg-red-500'
    : isStale
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  return (
    <div className="w-full bg-surface border-b border-edge">
      <div className="max-w-[1400px] mx-auto px-4 py-2 flex items-center justify-between gap-4 overflow-x-auto scrollbar-hide">
        {/* 左侧：行情数据 */}
        <div className="flex items-center gap-5 text-[10px] tracking-wider uppercase whitespace-nowrap">
          {/* 币价 */}
          <div className="flex items-center gap-2" suppressHydrationWarning>
            <span className="text-accent font-bold text-xs">PRL</span>
            <span className="text-gray-200 font-mono text-sm" suppressHydrationWarning>${coinPrice.toFixed(4)}</span>
            {/* 多源切换 */}
            {allPrices.length > 1 && (
              <div className="hidden md:flex items-center gap-1 ml-1">
                {allPrices.map((p) => {
                  const isSelected = p.name === selectedPriceSource;
                  return (
                    <button
                      key={p.name}
                      onClick={() => onSelectPrice(p.name, p.price)}
                      className={`text-[8px] px-1 py-0.5 border transition-colors duration-150 font-mono ${
                        isSelected
                          ? 'border-accent/40 text-accent bg-accent/5'
                          : 'border-edge text-muted/50 hover:text-muted'
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <span className="text-edge">│</span>

          {/* 网络算力 */}
          <div className="flex items-center gap-1.5">
            <span className="text-muted/50">{t('networkHashrate')}</span>
            <span className="text-gray-300 font-mono">
              {networkStats.networkHashrateTH > 0
                ? formatHashrate(networkStats.networkHashrateTH)
                : 'N/A'}
            </span>
          </div>

          <span className="text-edge hidden sm:inline">│</span>

          {/* 全网日产出 */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-muted/50">{t('dailyGlobalOutput')}</span>
            <span className="text-gray-300 font-mono">
              {networkStats.dailyGlobalOutput > 0
                ? formatNumber(networkStats.dailyGlobalOutput, 0)
                : 'N/A'}
            </span>
          </div>

          <span className="text-edge hidden md:inline">│</span>

          {/* 出块时间 */}
          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-muted/50">{t('avgBlockTime')}</span>
            <span className="text-gray-300 font-mono">{networkStats.avgBlockTime || 'N/A'}</span>
          </div>
        </div>

        {/* 右侧：同步状态 */}
        <div className="flex items-center gap-2 text-[9px] tracking-wider uppercase whitespace-nowrap">
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor} animate-pulse-slow`} />
          <span className="text-muted/50">
            {syncStatus === 'error'
              ? t('syncFailed')
              : isStale
              ? `ERR ${countdown}s`
              : `${countdown}s`}
          </span>
        </div>
      </div>
    </div>
  );
}
