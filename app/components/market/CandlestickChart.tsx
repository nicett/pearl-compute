'use client';

import { useEffect, useRef } from 'react';
import type {
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  ColorType,
} from 'lightweight-charts';

import { cn } from '@/lib/utils';

export interface KlinePoint {
  time: number;       // Unix 秒
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Props {
  klines: KlinePoint[];
  resolvedTheme: 'light' | 'dark';
  /** 加载中显示的占位文字 */
  loadingText?: string;
  /** 总高度（含成交量副图）；默认 480 */
  height?: number;
}

/**
 * 中文加密圈标准：绿涨红跌
 * 用 success/destructive 对应的 hex（与 globals.css 中的 token 一致）
 */
const COLORS = {
  up: '#10b981',      // success
  down: '#ef4444',    // destructive
  // 半透明用于成交量柱
  upVol: 'rgba(16, 185, 129, 0.5)',
  downVol: 'rgba(239, 68, 68, 0.5)',
};

/** 蜡烛图 + 下方成交量副图（共享时间轴） */
export default function CandlestickChart({
  klines,
  resolvedTheme,
  loadingText = '加载中…',
  height = 480,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const isDark = resolvedTheme === 'dark';

  // 初始化（一次） —— 主题切换通过 applyOptions 更新
  useEffect(() => {
    let aborted = false;

    async function init() {
      if (!containerRef.current) return;

      const { createChart, ColorType, CandlestickSeries, HistogramSeries } = await import(
        'lightweight-charts'
      );
      if (aborted || !containerRef.current) return;

      const dark = document.documentElement.classList.contains('dark');

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height,
        layout: {
          background: { type: ColorType.Solid, color: dark ? '#13141a' : '#ffffff' },
          textColor: dark ? '#a1a4b0' : '#525560',
          fontFamily: 'Inter, "PingFang SC", system-ui, sans-serif',
          fontSize: 11,
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: dark ? '#1f2129' : '#e5e7eb' },
          horzLines: { color: dark ? '#1f2129' : '#e5e7eb' },
        },
        crosshair: {
          vertLine: {
            color: dark ? '#2a2d38' : '#d1d5db',
            width: 1,
            style: 2,
            labelBackgroundColor: dark ? '#1a1c24' : '#f4f4f7',
          },
          horzLine: {
            color: dark ? '#2a2d38' : '#d1d5db',
            width: 1,
            style: 2,
            labelBackgroundColor: dark ? '#1a1c24' : '#f4f4f7',
          },
        },
        rightPriceScale: {
          borderColor: dark ? '#1f2129' : '#e5e7eb',
          scaleMargins: { top: 0.1, bottom: 0.3 },  // 主图占 60%，下方留 30% 给成交量
        },
        timeScale: {
          borderColor: dark ? '#1f2129' : '#e5e7eb',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      // 主图：蜡烛
      const candle = chart.addSeries(CandlestickSeries, {
        upColor: COLORS.up,
        downColor: COLORS.down,
        borderUpColor: COLORS.up,
        borderDownColor: COLORS.down,
        wickUpColor: COLORS.up,
        wickDownColor: COLORS.down,
      });

      // 副图：成交量（独立 priceScale，主图占顶部 70%，副图占底部 25%）
      const volume = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      volume.priceScale().applyOptions({
        scaleMargins: { top: 0.75, bottom: 0 },
      });

      chartRef.current = chart;
      candleRef.current = candle;
      volumeRef.current = volume;

      // 窗口大小变化
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          chart.applyOptions({ width: entry.contentRect.width });
        }
      });
      ro.observe(containerRef.current);
      resizeObserverRef.current = ro;
    }

    init();

    return () => {
      aborted = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleRef.current = null;
        volumeRef.current = null;
      }
    };
  }, [height]); // eslint-disable-line react-hooks/exhaustive-deps

  // 数据更新（每次 klines 变化）
  useEffect(() => {
    if (!candleRef.current || !volumeRef.current) return;
    if (klines.length === 0) {
      candleRef.current.setData([]);
      volumeRef.current.setData([]);
      return;
    }

    const candleData = klines.map((k) => ({
      time: k.time as UTCTimestamp,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    }));

    const volumeData = klines.map((k) => ({
      time: k.time as UTCTimestamp,
      value: k.volume,
      color: k.close >= k.open ? COLORS.upVol : COLORS.downVol,
    }));

    candleRef.current.setData(candleData);
    volumeRef.current.setData(volumeData);
    chartRef.current?.timeScale().fitContent();
  }, [klines]);

  // 主题切换
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      layout: {
        background: { type: 'solid' as ColorType, color: isDark ? '#13141a' : '#ffffff' },
        textColor: isDark ? '#a1a4b0' : '#525560',
      },
      grid: {
        vertLines: { color: isDark ? '#1f2129' : '#e5e7eb' },
        horzLines: { color: isDark ? '#1f2129' : '#e5e7eb' },
      },
      crosshair: {
        vertLine: { color: isDark ? '#2a2d38' : '#d1d5db', labelBackgroundColor: isDark ? '#1a1c24' : '#f4f4f7' },
        horzLine: { color: isDark ? '#2a2d38' : '#d1d5db', labelBackgroundColor: isDark ? '#1a1c24' : '#f4f4f7' },
      },
      rightPriceScale: { borderColor: isDark ? '#1f2129' : '#e5e7eb' },
      timeScale: { borderColor: isDark ? '#1f2129' : '#e5e7eb' },
    });
  }, [isDark]);

  return (
    <div className={cn('relative w-full', !klines.length && 'min-h-[480px]')}>
      {klines.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground">
          {loadingText}
        </div>
      )}
      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  );
}
