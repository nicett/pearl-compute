'use client';

import { useMemo } from 'react';

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

// PRL grains → 人类可读 PRL 值（1 PRL = 1e8 grains）
function grainsToPRL(grains: string | null): string {
  if (!grains) return '—';
  try {
    const n = BigInt(grains);
    // 用 BigInt 做整数 / 小数分离，避免 number 精度丢失
    const whole = n / 100_000_000n;
    const frac = n % 100_000_000n;
    const fracStr = frac.toString().padStart(8, '0').slice(0, 4); // 4 位小数
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

  return (
    <div className="bg-surface border border-edge p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isOnline ? 'bg-emerald-400 animate-pulse-slow' : 'bg-red-400'
            }`}
          />
          <div>
            <div className="text-sm font-semibold text-foreground tracking-wider uppercase">
              {binding.label || maskAddress(binding.walletAddr)}
            </div>
            <div className="text-[10px] text-muted/60 tracking-wider uppercase mt-0.5">
              {binding.poolDisplayName} ·{' '}
              <span className="font-mono">{maskAddress(binding.walletAddr)}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm('确定删除该绑定及其所有历史数据？')) onDelete(binding.id);
          }}
          className="text-[10px] text-muted/50 hover:text-red-400 tracking-wider uppercase border border-edge hover:border-red-500/40 px-2 py-1 transition-colors"
        >
          删除
        </button>
      </div>

      {/* 主要指标 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <Metric label="总算力" value={formatHashrate(snap?.hashrateHps ?? null)} color="text-indigo-400" />
        <Metric label="未结算" value={`${grainsToPRL(snap?.balanceGrains ?? null)} PRL`} color="text-emerald-400" />
        <Metric label="24h 已派发" value={`${grainsToPRL(snap?.paid24hGrains ?? null)} PRL`} color="text-cyan-400" />
        <Metric
          label="在线 Worker"
          value={totalWorkers > 0 ? `${onlineWorkers}/${totalWorkers}` : '—'}
          color={onlineWorkers === totalWorkers ? 'text-emerald-400' : 'text-amber-400'}
        />
      </div>

      {/* Workers 列表 */}
      {workers.length > 0 && (
        <details className="border-t border-edge pt-3" open>
          <summary className="text-xs text-muted/60 tracking-wider uppercase cursor-pointer hover:text-muted">
            Workers ({workers.length})
          </summary>
          <ul className="mt-3 space-y-1.5 text-xs font-mono">
            {workers.map((w, i) => (
              <li
                key={i}
                className="flex items-center justify-between border-b border-edge/30 pb-1.5 last:border-b-0"
              >
                <span className="text-foreground">{w.name || '(unnamed)'}</span>
                <span
                  className={w.hashrate > 0 ? 'text-emerald-400' : 'text-red-400/60'}
                >
                  {formatHashrate(w.hashrate)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* 状态条 */}
      <div className="border-t border-edge mt-4 pt-3 flex items-center justify-between text-[10px] text-muted/50 tracking-wider uppercase">
        {snap ? (
          <span>最近同步：{formatAge(snap.snapshotAt)}</span>
        ) : (
          <span className="text-amber-400/70">等待首次同步…（5 分钟内）</span>
        )}
        <span>绑定于 {new Date(binding.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center p-2.5 bg-surface-dark border border-edge">
      <div className="text-[10px] text-muted tracking-wider uppercase mb-1">
        {label}
      </div>
      <div className={`text-sm font-mono font-bold ${color}`}>{value}</div>
    </div>
  );
}
