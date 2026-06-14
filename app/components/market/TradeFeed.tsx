'use client';

import { cn } from '@/lib/utils';

interface TradeRow {
  id: number;
  price: number;
  amount: number;
  total: number;
  side: 'buy' | 'sell';
  createdAt: string;
}

interface Props {
  trades: TradeRow[] | null;
  /** 默认最多显示 30 条 */
  limit?: number;
}

function fmtPrice(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function fmtAmount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(2);
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return '—';
  }
}

export default function TradeFeed({ trades, limit = 30 }: Props) {
  if (!trades) {
    return (
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">最近成交</h3>
        <p className="text-xs text-muted-foreground">加载中…</p>
      </div>
    );
  }

  const list = trades.slice(0, limit);

  return (
    <div className="rounded-lg border bg-card flex flex-col">
      <div className="px-5 py-3 border-b">
        <h3 className="text-sm font-semibold">最近成交</h3>
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] px-3 py-2 text-[10px] text-muted-foreground border-b">
        <span>价格 (USDT)</span>
        <span className="text-right">数量 (PRL)</span>
        <span className="text-right pl-3">时间</span>
      </div>

      <ul className="divide-y">
        {list.length === 0 ? (
          <li className="px-3 py-3 text-xs text-muted-foreground text-center">暂无成交</li>
        ) : (
          list.map((t) => (
            <li
              key={t.id}
              className="grid grid-cols-[1fr_1fr_auto] px-3 py-1.5 text-xs font-mono hover:bg-muted/30 transition-colors"
            >
              <span className={cn(t.side === 'buy' ? 'text-success' : 'text-destructive')}>
                {fmtPrice(t.price)}
              </span>
              <span className="text-right text-muted-foreground">{fmtAmount(t.amount)}</span>
              <span className="text-right pl-3 text-muted-foreground/70">
                {fmtTime(t.createdAt)}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
