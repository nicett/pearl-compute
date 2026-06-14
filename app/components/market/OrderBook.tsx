'use client';

import { useMemo } from 'react';

import { cn } from '@/lib/utils';

interface DepthData {
  asks: Array<[string, string]>;
  bids: Array<[string, string]>;
  fetchedAt: number;
}

interface Props {
  depth: DepthData | null;
  /** 中间价用 ticker.price，比 (best ask + best bid) / 2 更稳定 */
  midPrice?: number | null;
  /** 显示档位数（默认 12，避免页面太长） */
  rows?: number;
}

interface Row {
  price: number;
  amount: number;
  cumAmount: number;
  cumPercent: number;
}

/** 从原始 [price, amount] 字符串数组构造可显示行：
 * - 按价格排序（asks 升序、bids 降序）
 * - 累计深度（用于阶梯条宽度）
 */
function buildRows(raw: Array<[string, string]>, ascending: boolean, take: number): Row[] {
  if (!raw || raw.length === 0) return [];
  const parsed = raw
    .map(([p, a]) => ({ price: parseFloat(p), amount: parseFloat(a) }))
    .filter((r) => Number.isFinite(r.price) && Number.isFinite(r.amount) && r.amount > 0)
    .sort((a, b) => (ascending ? a.price - b.price : b.price - a.price));

  const sliced = parsed.slice(0, take);
  let cum = 0;
  const total = sliced.reduce((s, r) => s + r.amount, 0);
  return sliced.map((r) => {
    cum += r.amount;
    return {
      ...r,
      cumAmount: cum,
      cumPercent: total > 0 ? (cum / total) * 100 : 0,
    };
  });
}

function fmtPrice(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function fmtAmount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(2);
}

export default function OrderBook({ depth, midPrice, rows = 12 }: Props) {
  const asks = useMemo(() => buildRows(depth?.asks ?? [], true, rows), [depth?.asks, rows]);
  const bids = useMemo(() => buildRows(depth?.bids ?? [], false, rows), [depth?.bids, rows]);

  if (!depth) {
    return (
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">订单簿</h3>
        <p className="text-xs text-muted-foreground">加载中…</p>
      </div>
    );
  }

  const mid = midPrice ?? (asks[0] && bids[0] ? (asks[0].price + bids[0].price) / 2 : null);

  return (
    <div className="rounded-lg border bg-card flex flex-col">
      <div className="px-5 py-3 border-b">
        <h3 className="text-sm font-semibold">订单簿</h3>
      </div>

      {/* 表头 */}
      <div className="grid grid-cols-[1fr_1fr] px-3 py-2 text-[10px] text-muted-foreground border-b">
        <span>价格 (USDT)</span>
        <span className="text-right">数量 (PRL)</span>
      </div>

      {/* asks（从远到近，由上到下） */}
      <div className="flex flex-col-reverse">
        {asks.map((r) => (
          <DepthRow key={`a-${r.price}`} row={r} side="ask" />
        ))}
      </div>

      {/* mid price */}
      {mid != null && (
        <div className="flex items-center justify-center gap-2 px-3 py-2 border-y bg-muted/30">
          <span className="text-base font-mono font-semibold">{fmtPrice(mid)}</span>
          <span className="text-[10px] text-muted-foreground">中间价</span>
        </div>
      )}

      {/* bids */}
      <div className="flex flex-col">
        {bids.map((r) => (
          <DepthRow key={`b-${r.price}`} row={r} side="bid" />
        ))}
      </div>
    </div>
  );
}

function DepthRow({ row, side }: { row: Row; side: 'ask' | 'bid' }) {
  const colorClass = side === 'ask' ? 'text-destructive' : 'text-success';
  const barClass = side === 'ask' ? 'bg-destructive/10' : 'bg-success/10';
  const barAlign = side === 'ask' ? 'left-0' : 'right-0';

  return (
    <div className="relative grid grid-cols-[1fr_1fr] px-3 py-1 text-xs font-mono hover:bg-muted/30 transition-colors">
      {/* 阶梯背景条 */}
      <div
        aria-hidden
        className={cn('absolute inset-y-0', barAlign, barClass)}
        style={{ width: `${Math.min(row.cumPercent, 100)}%` }}
      />
      <span className={cn('relative', colorClass)}>{fmtPrice(row.price)}</span>
      <span className="relative text-right text-muted-foreground">{fmtAmount(row.amount)}</span>
    </div>
  );
}
