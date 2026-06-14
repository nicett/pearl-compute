/**
 * 行情页 — 客户端组件，5s 轮询 /api/market/snapshot
 *
 * 三栏：左大块 K 线 + 右上订单簿 + 右下成交流水
 * K 线复用 PriceChart 组件（已有的 lightweight-charts 实现）
 */
'use client';

import { useCallback, useEffect, useState } from 'react';

import OrderBook from '@/app/components/market/OrderBook';
import PriceChart from '@/app/components/PriceChart';
import PriceTicker from '@/app/components/market/PriceTicker';
import TradeFeed from '@/app/components/market/TradeFeed';
import { useTheme } from '@/app/theme/context';
import type { PriceHistoryPoint } from '@/app/types';

interface MarketSnapshot {
  depth: {
    asks: Array<[string, string]>;
    bids: Array<[string, string]>;
    fetchedAt: number;
  } | null;
  trades: Array<{
    id: number;
    price: number;
    amount: number;
    total: number;
    side: 'buy' | 'sell';
    createdAt: string;
  }> | null;
  ticker: {
    price: number;
    high?: number | null;
    low?: number | null;
    volume?: number | null;
    priceChange?: string | number | null;
  } | null;
  syncedAt: number | null;
}

interface ChartData {
  source: string;
  period: number;
  data: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

const POLL_INTERVAL_MS = 5_000;

export default function MarketView() {
  const { resolvedTheme } = useTheme();
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/market/snapshot', { credentials: 'same-origin' });
      if (!res.ok) {
        setError(`加载失败 (HTTP ${res.status})`);
        return;
      }
      const data = (await res.json()) as MarketSnapshot;
      setSnapshot(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    }
  }, []);

  // 拉 K 线（复用 /api/chart） — 频率较低（30s），因为 K 线是 15min 周期
  const reloadChart = useCallback(async () => {
    try {
      const res = await fetch('/api/chart', { credentials: 'same-origin' });
      if (!res.ok) return;
      const data = (await res.json()) as ChartData;
      if (!data.data || !Array.isArray(data.data)) return;
      // PriceHistoryPoint 用 close 作 price + 完整 OHLC
      const points: PriceHistoryPoint[] = data.data.map((c) => ({
        ts: c.time,
        price: c.close,
        volume: c.volume ?? null,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      setPriceHistory(points);
    } catch {
      // 静默失败
    }
  }, []);

  // 5s 轮询 snapshot
  useEffect(() => {
    reload();
    const timer = setInterval(reload, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [reload]);

  // 30s 轮询 K 线
  useEffect(() => {
    reloadChart();
    const timer = setInterval(reloadChart, 30_000);
    return () => clearInterval(timer);
  }, [reloadChart]);

  // 简易 t 函数 —— 复用 PriceChart 需要 t 参数（先用静态字符串）
  const t = useCallback((key: string) => {
    const map: Record<string, string> = {
      priceTrend: 'PRL/USDT 走势',
      priceTrendDesc: '15 分钟周期，过去 24 小时',
      loading: '加载中…',
    };
    return map[key] ?? key;
  }, []);

  return (
    <div className="space-y-4">
      {/* 顶部 ticker */}
      <PriceTicker ticker={snapshot?.ticker ?? null} syncedAt={snapshot?.syncedAt ?? null} />

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* 三栏：左大块 K 线 + 右两个堆叠的小面板 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* 左：K 线 */}
        <div className="rounded-lg border bg-card p-5">
          <PriceChart
            priceHistory={priceHistory}
            resolvedTheme={resolvedTheme}
            t={t}
          />
        </div>

        {/* 右：订单簿 + 成交流 */}
        <div className="space-y-4">
          <OrderBook
            depth={snapshot?.depth ?? null}
            midPrice={snapshot?.ticker?.price}
            rows={12}
          />
          <TradeFeed trades={snapshot?.trades ?? null} limit={20} />
        </div>
      </div>
    </div>
  );
}
