/**
 * 行情页 — 客户端组件
 *
 * 数据流：
 * - /api/market/snapshot 5s 轮询：depth / trades / ticker
 * - /api/chart?period=N 30s 轮询：当前周期 K 线
 *
 * 周期切换：客户端 setState 触发 K 线重新拉取
 */
'use client';

import { useCallback, useEffect, useState } from 'react';

import OrderBook from '@/app/components/market/OrderBook';
import PriceTicker from '@/app/components/market/PriceTicker';
import TradeFeed from '@/app/components/market/TradeFeed';
import CandlestickChart, {
  type KlinePoint,
} from '@/app/components/market/CandlestickChart';
import PeriodSelector from '@/app/components/market/PeriodSelector';
import { useTheme } from '@/app/theme/context';

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

const SNAPSHOT_INTERVAL_MS = 5_000;
const KLINE_INTERVAL_MS = 30_000;
const DEFAULT_PERIOD = 15;

export default function MarketView() {
  const { resolvedTheme } = useTheme();

  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [klines, setKlines] = useState<KlinePoint[]>([]);
  const [period, setPeriod] = useState<number>(DEFAULT_PERIOD);
  const [klineLoading, setKlineLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── snapshot 轮询 ──
  const reloadSnapshot = useCallback(async () => {
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

  useEffect(() => {
    reloadSnapshot();
    const t = setInterval(reloadSnapshot, SNAPSHOT_INTERVAL_MS);
    return () => clearInterval(t);
  }, [reloadSnapshot]);

  // ── K 线轮询（依赖 period） ──
  const reloadKlines = useCallback(async (p: number, showLoading: boolean) => {
    if (showLoading) setKlineLoading(true);
    try {
      const res = await fetch(`/api/chart?period=${p}`, { credentials: 'same-origin' });
      if (!res.ok) return;
      const data = (await res.json()) as { data?: KlinePoint[] };
      if (Array.isArray(data.data)) setKlines(data.data);
    } catch {
      // 静默失败；保留旧数据
    } finally {
      if (showLoading) setKlineLoading(false);
    }
  }, []);

  useEffect(() => {
    // 切周期时清空旧数据 + 显示加载
    setKlines([]);
    reloadKlines(period, true);
    const t = setInterval(() => reloadKlines(period, false), KLINE_INTERVAL_MS);
    return () => clearInterval(t);
  }, [period, reloadKlines]);

  return (
    <div className="space-y-4">
      <PriceTicker ticker={snapshot?.ticker ?? null} syncedAt={snapshot?.syncedAt ?? null} />

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        {/* 左：周期选择 + 蜡烛图 */}
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-b">
            <h3 className="text-sm font-semibold">PRL/USDT K 线</h3>
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>
          <div className="p-2">
            <CandlestickChart
              klines={klines}
              resolvedTheme={resolvedTheme}
              loadingText={klineLoading ? '加载中…' : '暂无数据'}
              height={460}
            />
          </div>
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
