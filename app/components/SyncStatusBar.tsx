'use client';

import { SyncStatus, PriceSourceName } from '../types';

interface SyncStatusBarProps {
  syncStatus: SyncStatus;
  isStale: boolean;
  countdown: number;
  priceSource: PriceSourceName | null;
  lastSyncTs: number | null;
  formattedSyncTime: string;
  t: (key: string) => string;
}

export default function SyncStatusBar({
  syncStatus,
  isStale,
  countdown,
  priceSource,
  lastSyncTs,
  formattedSyncTime,
  t,
}: SyncStatusBarProps) {
  const statusColor = syncStatus === 'error'
    ? 'text-red-400'
    : isStale
    ? 'text-amber-400'
    : 'text-emerald-400';

  return (
    <div className="mb-4">
      <div className="w-full bg-surface-dark border border-edge text-muted text-sm py-3 px-4 flex justify-center items-center gap-2 tracking-wider uppercase">
        <span className={`w-2 h-2 rounded-full ${
          syncStatus === 'error' ? 'bg-red-400' : isStale ? 'bg-amber-400' : 'bg-emerald-400'
        } animate-pulse-slow`} />
        <span className={statusColor}>
          {syncStatus === 'error'
            ? t('syncFailed')
            : isStale
            ? `${t('syncFailed')} (${countdown}s)`
            : `${t('nextSync')}: ${countdown}s`}
        </span>
      </div>
      <div className="flex justify-between items-center mt-2 px-1">
        <span className={`text-xs text-red-400 tracking-wider uppercase ${syncStatus === 'error' ? '' : 'hidden'}`}>
          {t('syncError')}
        </span>
        {priceSource && syncStatus === 'success' && (
          <span className="text-xs text-emerald-400 tracking-wider uppercase">
            {t('priceSource')}: {priceSource}
          </span>
        )}
        <span className="text-xs text-muted/50 font-mono">
          {lastSyncTs ? `${t('lastSync')}: ${formattedSyncTime}` : t('notSynced')}
        </span>
      </div>
    </div>
  );
}
