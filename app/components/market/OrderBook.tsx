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
  /** 中间价用 ticker.price 比 (best ask + best bid) / 2 更稳定 */
  midPrice?: number | null;
  /** 每边显示行数（默认 12） */
  rows?: number;
}

interface Row {
  price: number;
  amount: number;
  cumPercent: number;
}

/** 从原始 [price, amount] 构造行：排序 + 累计深度（用于阶梯条） */
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
      price: r.price,
      amount: r.amount,
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

/**
 * 订单簿 — 市场深度布局
 *
 * 左侧 bids（买单，绿色，价高→低），右侧 asks（卖单，红色，价低→高），
 * 顶部展示中间价。阶梯背景条按累计深度，bids 向右伸展、asks 向左伸展，
 * 形成对称的视觉密度图。
 */
export default function OrderBook({ depth, midPrice, rows = 12 }: Props) {
  // bids: 价格降序（最近的买价在最上）
  const bids = useMemo(() => buildRows(depth?.bids ?? [], false, rows), [depth?.bids, rows]);
  // asks: 价格升序（最近的卖价在最上）
  const asks = useMemo(() => buildRows(depth?.asks ?? [], true, rows), [depth?.asks, rows]);

  if (!depth) {
    return (
      <div className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold mb-3">订单簿</h3>
        <p className="text-xs text-muted-foreground">加载中…</p>
      </div>
    );
  }

  const mid = midPrice ?? (asks[0] && bids[0] ? (asks[0].price + bids[0].price) / 2 : null);
  const spread =
    asks[0] && bids[0]
      ? {
          abs: asks[0].price - bids[0].price,
          pct: ((asks[0].price - bids[0].price) / asks[0].price) * 100,
        }
      : null;

  return (
    <div className="rounded-lg border bg-card flex flex-col">
      {/* 头部：中间价 + 价差 */}
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold mb-1">订单簿</h3>
        {mid != null && (
          <div className="flex items-center gap-3">
            <span className="text-base font-mono font-bold">{fmtPrice(mid)}</span>
            <span className="text-[10px] text-muted-foreground">中间价</span>
            {spread && spread.abs > 0 && (
              <span className="ml-auto text-[10px] text-muted-foreground font-mono">
                价差 {spread.abs.toFixed(4)} ({spread.pct.toFixed(2)}%)
              </span>
            )}
          </div>
        )}
      </div>

      {/* 列头 */}
      <div className="grid grid-cols-2 px-3 py-2 text-[10px] text-muted-foreground border-b">
        <div className="grid grid-cols-2">
          <span>买价</span>
          <span className="text-right">数量</span>
        </div>
        <div className="grid grid-cols-2 pl-3">
          <span>卖价</span>
          <span className="text-right">数量</span>
        </div>
      </div>

      {/* 主体：左 bids / 右 asks */}
      <div className="grid grid-cols-2">
        {/* bids（左） */}
        <ul>
          {bids.length === 0 ? (
            <li className="px-3 py-3 text-center text-xs text-muted-foreground">暂无</li>
          ) : (
            bids.map((r) => <BidRow key={`b-${r.price}`} row={r} />)
          )}
        </ul>

        {/* asks（右） */}
        <ul className="border-l">
          {asks.length === 0 ? (
            <li className="px-3 py-3 text-center text-xs text-muted-foreground">暂无</li>
          ) : (
            asks.map((r) => <AskRow key={`a-${r.price}`} row={r} />)
          )}
        </ul>
      </div>
    </div>
  );
}

function BidRow({ row }: { row: Row }) {
  return (
    <li className="relative grid grid-cols-2 px-3 py-1 text-xs font-mono hover:bg-muted/30 transition-colors">
      {/* 阶梯条：从右向左延伸（向中线方向，bids 在左侧） */}
      <div
        aria-hidden
        className={cn(
          'absolute inset-y-0 right-0 bg-success/10 pointer-events-none',
        )}
        style={{ width: `${Math.min(row.cumPercent, 100)}%` }}
      />
      <span className="relative text-success">{fmtPrice(row.price)}</span>
      <span className="relative text-right text-foreground">{fmtAmount(row.amount)}</span>
    </li>
  );
}

function AskRow({ row }: { row: Row }) {
  return (
    <li className="relative grid grid-cols-2 px-3 py-1 text-xs font-mono hover:bg-muted/30 transition-colors">
      {/* 阶梯条：从左向右延伸（向中线方向，asks 在右侧） */}
      <div
        aria-hidden
        className={cn(
          'absolute inset-y-0 left-0 bg-destructive/10 pointer-events-none',
        )}
        style={{ width: `${Math.min(row.cumPercent, 100)}%` }}
      />
      <span className="relative text-destructive">{fmtPrice(row.price)}</span>
      <span className="relative text-right text-foreground">{fmtAmount(row.amount)}</span>
    </li>
  );
}
