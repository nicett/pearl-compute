'use client';

import { NetworkStats, PriceSource } from '../types';
import { formatNumber } from '../utils';

interface NetworkDashboardProps {
  networkStats: NetworkStats;
  coinPrice: number;
  allPrices: PriceSource[];
  selectedPriceSource: string;
  onSelectPrice: (name: string, price: number) => void;
  t: (key: string) => string;
}

/**
 * 智能格式化网络算力
 */
function formatHashrate(hashrateTH: number): string {
  if (hashrateTH >= 1000000) {
    return `${formatNumber(hashrateTH / 1000000, 2)} EH/s`;
  }
  if (hashrateTH >= 1000) {
    return `${formatNumber(hashrateTH / 1000, 2)} PH/s`;
  }
  return `${formatNumber(hashrateTH, 2)} TH/s`;
}

/**
 * 网络概览横条 — 工业风格
 */
export default function NetworkDashboard({
  networkStats,
  coinPrice,
  allPrices,
  selectedPriceSource,
  onSelectPrice,
  t,
}: NetworkDashboardProps) {
  return (
    <div className="mb-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* 当前币价 - 多源切换 */}
        <div className="group metric-card border-accent relative">
          <div className="metric-title">{t('coinPrice')}</div>
          <div className="metric-value text-accent text-lg">
            ${coinPrice.toFixed(4)}
          </div>
          {/* 多来源切换 */}
          {allPrices.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {allPrices.map((p) => {
                const isSelected = p.name === selectedPriceSource;
                return (
                  <button
                    key={p.name}
                    onClick={() => onSelectPrice(p.name, p.price)}
                    className={`text-[9px] px-1.5 py-0.5 tracking-wider uppercase border transition-colors duration-150 font-mono ${
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

        {/* 网络算力 */}
        <div className="group metric-card border-indigo-500 relative">
          <div className="metric-title">{t('networkHashrate')}</div>
          <div className="metric-value text-indigo-400 text-lg">
            {networkStats.networkHashrateTH > 0
              ? formatHashrate(networkStats.networkHashrateTH)
              : networkStats.networkHashrate || 'N/A'}
          </div>
          <div className="absolute top-2 right-2">
            <span className="text-[9px] text-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-help">
              [i]
            </span>
            <div className="tooltip-industrial right-0 bottom-full mb-2 w-48">
              {t('tipNetworkHashrate')}
            </div>
          </div>
        </div>

        {/* 全网日产出 */}
        <div className="group metric-card border-emerald-500 relative">
          <div className="metric-title">{t('dailyGlobalOutput')}</div>
          <div className="metric-value text-emerald-400 text-lg">
            {networkStats.dailyGlobalOutput > 0
              ? formatNumber(networkStats.dailyGlobalOutput, 0)
              : 'N/A'}
            <span className="text-[9px] text-muted ml-1 font-normal tracking-wider">PRL</span>
          </div>
          <div className="absolute top-2 right-2">
            <span className="text-[9px] text-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-help">
              [i]
            </span>
            <div className="tooltip-industrial right-0 bottom-full mb-2 w-48">
              {t('tipDailyGlobalOutput')}
            </div>
          </div>
        </div>

        {/* 平均出块时间 */}
        <div className="group metric-card border-cyan-500 relative">
          <div className="metric-title">{t('avgBlockTime')}</div>
          <div className="metric-value text-cyan-400 text-lg">
            {networkStats.avgBlockTime || 'N/A'}
          </div>
          <div className="absolute top-2 right-2">
            <span className="text-[9px] text-muted opacity-0 group-hover:opacity-100 transition-opacity cursor-help">
              [i]
            </span>
            <div className="tooltip-industrial right-0 bottom-full mb-2 w-48">
              {t('tipAvgBlockTime')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
