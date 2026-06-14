'use client';

import { ExternalLink, TrendingDown, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  ticker: {
    price: number;
    high?: number | null;
    low?: number | null;
    volume?: number | null;
    priceChange?: string | number | null;
  } | null;
  syncedAt: number | null;
}

function formatPriceChange(raw: string | number | null | undefined): { value: number; pct: string } {
  if (raw == null) return { value: 0, pct: '0.00%' };
  const n = typeof raw === 'string' ? parseFloat(raw) : raw;
  if (!Number.isFinite(n)) return { value: 0, pct: '0.00%' };
  // SafeTrade 这里通常已经是百分比数（如 1.92），但有时可能是小数（0.0192）
  // 经验：> 1 当百分比看；< 1 当小数看
  const pct = Math.abs(n) > 1 ? n : n * 100;
  return { value: pct, pct: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` };
}

function formatNum(n: number | null | undefined, decimals = 4): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatVolume(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(2);
}

function formatAge(ms: number | null): string {
  if (!ms) return '—';
  const sec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (sec < 5) return '刚刚';
  if (sec < 60) return `${sec} 秒前`;
  return `${Math.floor(sec / 60)} 分钟前`;
}

export default function PriceTicker({ ticker, syncedAt }: Props) {
  const priceChange = formatPriceChange(ticker?.priceChange);
  const isUp = priceChange.value >= 0;
  const stale = syncedAt != null && Date.now() - syncedAt > 30_000;

  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-base font-semibold">PRL/USDT</span>
            <Badge variant="secondary" className="text-[10px]">SafeTrade</Badge>
            {stale && (
              <Badge variant="warning" className="text-[10px]">数据陈旧</Badge>
            )}
          </div>
          <div className="flex items-baseline gap-3">
            <span
              className={cn(
                'text-3xl sm:text-4xl font-bold font-mono tracking-tight',
                isUp ? 'text-success' : 'text-destructive',
              )}
            >
              {formatNum(ticker?.price)}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 font-mono text-sm font-semibold',
                isUp ? 'text-success' : 'text-destructive',
              )}
            >
              {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {priceChange.pct}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://safe.trade/markets/PRL_USDT"
              target="_blank"
              rel="noreferrer"
            >
              去 SafeTrade 交易
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <Stat label="24h 高" value={formatNum(ticker?.high)} tone="success" />
        <Stat label="24h 低" value={formatNum(ticker?.low)} tone="destructive" />
        <Stat label="24h 量" value={`${formatVolume(ticker?.volume)} PRL`} />
        <Stat label="数据更新" value={formatAge(syncedAt)} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'destructive';
}) {
  const toneClass =
    tone === 'success' ? 'text-success' : tone === 'destructive' ? 'text-destructive' : 'text-foreground';
  return (
    <div className="rounded-md border bg-muted/30 p-2.5">
      <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
      <div className={cn('font-mono font-semibold', toneClass)}>{value}</div>
    </div>
  );
}
