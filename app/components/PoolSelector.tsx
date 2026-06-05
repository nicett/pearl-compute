'use client';

import { PoolData } from '../types';
import { formatNumber } from '../utils';

interface PoolSelectorProps {
  pools: PoolData[];
  selectedPool: string | null;
  loading: boolean;
  error: boolean;
  onSelectPool: (slug: string | null) => void;
  t: (key: string) => string;
}

/** 格式化算力显示 */
function formatHashrate(hashrateHps: number): string {
  const hashrateTH = hashrateHps / 1e12;
  if (hashrateTH >= 1000000) return `${formatNumber(hashrateTH / 1000000, 2)} EH/s`;
  if (hashrateTH >= 1000) return `${formatNumber(hashrateTH / 1000, 2)} PH/s`;
  return `${formatNumber(hashrateTH, 2)} TH/s`;
}

/** 矿池选择器组件 */
export default function PoolSelector({
  pools,
  selectedPool,
  loading,
  error,
  onSelectPool,
  t,
}: PoolSelectorProps) {
  const currentPool = selectedPool ? pools.find((p) => p.slug === selectedPool) : null;

  return (
    <div className="space-y-3">
      {/* 选择器标签 */}
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted tracking-wider uppercase">
          {t('selectPool')}
        </label>
        {loading && (
          <span className="text-[10px] text-muted/50 animate-pulse">
            {t('loading')}
          </span>
        )}
      </div>

      {/* 下拉选择框 */}
      <select
        value={selectedPool || ''}
        onChange={(e) => onSelectPool(e.target.value || null)}
        disabled={loading || error}
        className="w-full bg-surface-dark border border-edge text-sm px-3 py-2 focus:outline-none focus:border-accent/50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">{t('allNetwork')}</option>
        {pools.map((pool) => (
          <option key={pool.slug} value={pool.slug}>
            {pool.name} ({pool.fee_percent}% {t('fee')})
          </option>
        ))}
      </select>

      {/* 矿池详情 */}
      {currentPool && (
        <div className="bg-surface-dark/50 border border-edge/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{t('poolHashrate')}</span>
            <span className="text-xs font-mono text-indigo-400">
              {currentPool.reported_hashrate_hps
                ? formatHashrate(currentPool.reported_hashrate_hps)
                : 'N/A'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{t('poolBlocks24h')}</span>
            <span className="text-xs font-mono text-emerald-400">
              {currentPool.blocks_24h}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">{t('poolShare')}</span>
            <span className="text-xs font-mono text-cyan-400">
              {currentPool.pool_share_24h.toFixed(2)}%
            </span>
          </div>
          {currentPool.reported_hashrate_hps && currentPool.reported_hashrate_hps > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">{t('poolYield')}</span>
              <span className="text-xs font-mono text-amber-400">
                {calcPoolYield(currentPool).toFixed(6)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="text-[10px] text-red-400/70">
          {t('poolFetchError')}
        </div>
      )}
    </div>
  );
}

/** 计算矿池 yield */
function calcPoolYield(pool: PoolData): number {
  if (!pool.reported_hashrate_hps || pool.reported_hashrate_hps <= 0) return 0;
  const dailyOutput = pool.reward_24h_grains / 1e8; // grains → PRL
  const hashrateTH = pool.reported_hashrate_hps / 1e12; // H/s → TH/s
  return dailyOutput / 24 / hashrateTH;
}
