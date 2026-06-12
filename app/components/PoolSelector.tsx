'use client';

import { PoolData } from '../types';
import { formatNumber } from '../utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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

/** 矿池选择器 */
export default function PoolSelector({
  pools,
  selectedPool,
  loading,
  error,
  onSelectPool,
  t,
}: PoolSelectorProps) {
  const currentPool = selectedPool ? pools.find((p) => p.slug === selectedPool) : null;
  // shadcn Select 不接受空字符串作为 value，用一个特殊值代表「全网」
  const ALL = '__all__';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="poolSelector">{t('selectPool')}</Label>
        {loading && (
          <span className="text-[10px] text-muted-foreground/60 animate-pulse">
            {t('loading')}
          </span>
        )}
      </div>

      <Select
        value={selectedPool ?? ALL}
        onValueChange={(v) => onSelectPool(v === ALL ? null : v)}
        disabled={loading || error}
      >
        <SelectTrigger id="poolSelector">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('allNetwork')}</SelectItem>
          {pools.map((pool) => (
            <SelectItem key={pool.slug} value={pool.slug}>
              {pool.name} ({pool.fee_percent}% {t('fee')})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentPool && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t('poolHashrate')}</span>
            <span className="text-xs font-mono text-foreground">
              {currentPool.reported_hashrate_hps
                ? formatHashrate(currentPool.reported_hashrate_hps)
                : 'N/A'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t('poolBlocks24h')}</span>
            <span className="text-xs font-mono text-foreground">
              {currentPool.blocks_24h}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t('poolShare')}</span>
            <span className="text-xs font-mono text-foreground">
              {currentPool.pool_share_24h.toFixed(2)}%
            </span>
          </div>
          {currentPool.reported_hashrate_hps && currentPool.reported_hashrate_hps > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t('poolYield')}</span>
              <span className="text-xs font-mono text-foreground">
                {calcPoolYield(currentPool).toFixed(6)}
              </span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-[10px] text-destructive/80">
          {t('poolFetchError')}
        </div>
      )}
    </div>
  );
}

function calcPoolYield(pool: PoolData): number {
  if (!pool.reported_hashrate_hps || pool.reported_hashrate_hps <= 0) return 0;
  const dailyOutput = pool.reward_24h_grains / 1e8;
  const hashrateTH = pool.reported_hashrate_hps / 1e12;
  return dailyOutput / 24 / hashrateTH;
}
