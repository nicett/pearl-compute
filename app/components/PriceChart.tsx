'use client';

import { useEffect, useRef } from 'react';
import type { IChartApi, ISeriesApi, UTCTimestamp, ColorType } from 'lightweight-charts';
import { PriceHistoryPoint } from '../types';
import { cn } from '@/lib/utils';

interface PriceChartProps {
  priceHistory: PriceHistoryPoint[];
  resolvedTheme: 'light' | 'dark';
  t: (key: string) => string;
}

// 主题色：紫色 #7C3AED 系
const COLORS = {
  brand: '#7c3aed',
  brandDim: '#6d28d9',
  brandSoft12: 'rgba(124, 58, 237, 0.14)',
  brandSoft01: 'rgba(124, 58, 237, 0.01)',
};

export default function PriceChart({ priceHistory, resolvedTheme, t }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    let aborted = false;

    async function init() {
      if (!containerRef.current) return;

      const { createChart, ColorType, AreaSeries } = await import('lightweight-charts');
      if (aborted) return;

      const dark = document.documentElement.classList.contains('dark');

      const chart = createChart(containerRef.current!, {
        width: containerRef.current!.clientWidth,
        height: 220,
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
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: dark ? '#1f2129' : '#e5e7eb',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      const series = chart.addSeries(AreaSeries, {
        topColor: COLORS.brandSoft12,
        bottomColor: COLORS.brandSoft01,
        lineColor: dark ? COLORS.brand : COLORS.brandDim,
        lineWidth: 2,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: dark ? COLORS.brand : COLORS.brandDim,
        crosshairMarkerBackgroundColor: dark ? '#13141a' : '#ffffff',
      });

      chartRef.current = chart;
      seriesRef.current = series;

      if (priceHistory.length > 0) {
        const maxPoints = 300;
        let displayData = priceHistory;
        if (priceHistory.length > maxPoints) {
          const step = Math.ceil(priceHistory.length / maxPoints);
          displayData = priceHistory.filter((_, i) => i % step === 0);
          if (displayData[displayData.length - 1] !== priceHistory[priceHistory.length - 1]) {
            displayData.push(priceHistory[priceHistory.length - 1]);
          }
        }
        const lineData = displayData.map((p) => ({
          time: p.ts as UTCTimestamp,
          value: p.price,
        }));
        series.setData(lineData);
        chart.timeScale().fitContent();
      }

      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width } = entry.contentRect;
          chart.applyOptions({ width });
        }
      });
      ro.observe(containerRef.current!);
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
        seriesRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 数据更新
  useEffect(() => {
    if (!seriesRef.current || priceHistory.length === 0) return;

    const maxPoints = 300;
    let displayData = priceHistory;
    if (priceHistory.length > maxPoints) {
      const step = Math.ceil(priceHistory.length / maxPoints);
      displayData = priceHistory.filter((_, i) => i % step === 0);
      if (displayData[displayData.length - 1] !== priceHistory[priceHistory.length - 1]) {
        displayData.push(priceHistory[priceHistory.length - 1]);
      }
    }

    const lineData = displayData.map((p) => ({
      time: p.ts as UTCTimestamp,
      value: p.price,
    }));

    seriesRef.current.setData(lineData);
    chartRef.current?.timeScale().fitContent();
  }, [priceHistory]);

  // 主题切换时刷颜色
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;

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

    seriesRef.current.applyOptions({
      topColor: COLORS.brandSoft12,
      bottomColor: COLORS.brandSoft01,
      lineColor: isDark ? COLORS.brand : COLORS.brandDim,
      crosshairMarkerBorderColor: isDark ? COLORS.brand : COLORS.brandDim,
      crosshairMarkerBackgroundColor: isDark ? '#13141a' : '#ffffff',
    });
  }, [isDark]);

  // 统计
  const prices = priceHistory.map((p) => p.price);
  const high24h = prices.length > 0 ? Math.max(...prices) : 0;
  const low24h = prices.length > 0 ? Math.min(...prices) : 0;
  const currentPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
  const firstPrice = prices.length > 0 ? prices[0] : 0;
  const changePercent = firstPrice > 0 ? ((currentPrice - firstPrice) / firstPrice) * 100 : 0;
  const changeColor = changePercent >= 0 ? 'text-success' : 'text-destructive';

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-muted-foreground">{t('priceTrend')}</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground/60">
            H: <span className="font-mono text-success" suppressHydrationWarning>{high24h.toFixed(6)}</span>
          </span>
          <span className="text-muted-foreground/60">
            L: <span className="font-mono text-destructive" suppressHydrationWarning>{low24h.toFixed(6)}</span>
          </span>
          <span className={cn('font-semibold font-mono', changeColor)} suppressHydrationWarning>
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="rounded-md border overflow-hidden relative h-[220px]">
        {priceHistory.length === 0 && (
          <div className="absolute inset-0 z-10 bg-background/80 flex items-center justify-center text-muted-foreground text-sm">
            {t('loading')}
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
      <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
        PRL/USDT · {t('priceTrendDesc')}
      </p>
    </div>
  );
}
