'use client';

import { useMemo } from 'react';
import { Trash2, ExternalLink, Copy, Pickaxe } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Metric } from '@/components/ui/metric';
import { cn } from '@/lib/utils';

export interface WorkerEntry {
  name: string | null;
  hashrate: number;
  hashrate_1h?: number;
  hashrate_24h?: number;
  lastShare?: string | null;
  solo?: boolean;
}

export interface Snapshot {
  snapshotAt: string;
  hashrateHps: string | null;
  balanceGrains: string | null;
  paid24hGrains: string | null;
  workerCount: number | null;
  rawJson: {
    workers?: WorkerEntry[];
    [k: string]: unknown;
  };
}

export interface Binding {
  id: string;
  poolSlug: string;
  poolDisplayName: string;
  walletAddr: string;
  label: string | null;
  createdAt: string;
  latestSnapshot: Snapshot | null;
}

interface Props {
  binding: Binding;
  onDelete: (id: string) => void;
}

function grainsToPRL(grains: string | null): string {
  if (!grains) return '—';
  try {
    const n = BigInt(grains);
    const whole = n / 100_000_000n;
    const frac = n % 100_000_000n;
    const fracStr = frac.toString().padStart(8, '0').slice(0, 4);
    return `${whole.toString()}.${fracStr}`;
  } catch {
    return '—';
  }
}

function formatHashrate(hps: string | number | null): string {
  if (hps == null) return '—';
  const n = typeof hps === 'string' ? Number(hps) : hps;
  if (!Number.isFinite(n) || n <= 0) return '0 H/s';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GH/s`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)} MH/s`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)} KH/s`;
  return `${n.toFixed(0)} H/s`;
}

function formatAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return '刚刚';
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}秒前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  return `${hr}小时前`;
}

function maskAddress(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 10)}…${addr.slice(-6)}`;
}

export default function MinerCard({ binding, onDelete }: Props) {
  const snap = binding.latestSnapshot;
  const workers = useMemo<WorkerEntry[]>(
    () => (snap?.rawJson?.workers ?? []) as WorkerEntry[],
    [snap],
  );
  const onlineWorkers = workers.filter((w) => w.hashrate > 0).length;
  const totalWorkers = workers.length;
  const isOnline = (snap?.workerCount ?? 0) > 0;

  const externalUrl =
    binding.poolSlug === 'pearl-herominers'
      ? `https://pearl.herominers.com/?lang=zh#worker_stats_${binding.walletAddr}`
      : null;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                isOnline
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <Pickaxe className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold truncate">
                  {binding.label || '未命名矿工'}
                </h3>
                <Badge variant={isOnline ? 'success' : 'destructive'}>
                  {isOnline ? 'online' : 'offline'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{binding.poolDisplayName}</span>
                <span>·</span>
                <button
                  onClick={() => navigator.clipboard.writeText(binding.walletAddr)}
                  title="复制地址"
                  className="font-mono inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  {maskAddress(binding.walletAddr)}
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                查看源页 <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm('确定删除该绑定及其所有历史数据？')) onDelete(binding.id);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              删除
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <Metric
            label="总算力"
            value={formatHashrate(snap?.hashrateHps ?? null)}
            tone="primary"
          />
          <Metric
            label="未结算"
            value={`${grainsToPRL(snap?.balanceGrains ?? null)} PRL`}
          />
          <Metric
            label="24h 已派发"
            value={`${grainsToPRL(snap?.paid24hGrains ?? null)} PRL`}
            tone="success"
          />
          <Metric
            label="在线 Worker"
            value={totalWorkers > 0 ? `${onlineWorkers}/${totalWorkers}` : '—'}
            tone={onlineWorkers === totalWorkers ? 'success' : 'warning'}
          />
        </div>

        {workers.length > 0 && (
          <div className="rounded-md border overflow-hidden">
            <div className="px-3 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
              Workers ({workers.length})
            </div>
            <ul className="divide-y">
              {workers.map((w, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-mono text-muted-foreground truncate">
                    {w.name || '(unnamed)'}
                  </span>
                  <span
                    className={cn(
                      'font-mono shrink-0',
                      w.hashrate > 0 ? 'text-success' : 'text-muted-foreground',
                    )}
                  >
                    {formatHashrate(w.hashrate)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
          {snap ? (
            <span>最近同步：{formatAge(snap.snapshotAt)}</span>
          ) : (
            <span className="text-warning">等待首次同步…（5 分钟内）</span>
          )}
          <span className="font-mono">
            绑定于 {new Date(binding.createdAt).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
