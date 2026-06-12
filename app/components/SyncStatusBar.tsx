'use client';

import { SyncStatus, PriceSourceName } from '../types';
import { cn } from '@/lib/utils';

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
  const dotColor = syncStatus === 'error'
    ? 'bg-destructive'
    : isStale
    ? 'bg-warning'
    : 'bg-success';

  const textColor = syncStatus === 'error'
    ? 'text-destructive'
    : isStale
    ? 'text-warning'
    : 'text-success';

  return (
    <div>
      <div className="rounded-md border bg-muted/30 py-2.5 px-3 flex justify-center items-center gap-2 text-sm">
        <span className={cn('w-2 h-2 rounded-full animate-pulse-slow', dotColor)} />
        <span className={textColor}>
          {syncStatus === 'error'
            ? t('syncFailed')
            : isStale
            ? `${t('syncFailed')} (${countdown}s)`
            : `${t('nextSync')}: ${countdown}s`}
        </span>
      </div>
      <div className="flex justify-between items-center mt-2 px-1">
        {priceSource && syncStatus === 'success' && (
          <span className="text-xs text-success">
            {t('priceSource')}: {priceSource}
          </span>
        )}
        <span className="text-xs text-muted-foreground/60 font-mono ml-auto">
          {lastSyncTs ? `${t('lastSync')}: ${formattedSyncTime}` : t('notSynced')}
        </span>
      </div>
    </div>
  );
}
