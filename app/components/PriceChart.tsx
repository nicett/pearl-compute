'use client';

import { useEffect, useRef } from 'react';
import { PriceHistoryPoint } from '../types';

interface PriceChartProps {
  priceHistory: PriceHistoryPoint[];
  resolvedTheme: 'light' | 'dark';
  t: (key: string) => string;
}

export default function PriceChart({ priceHistory, resolvedTheme, t }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const isDark = resolvedTheme === 'dark';

  // 图表只初始化一次，不依赖 isDark（主题变化通过 applyOptions 更新）
  useEffect(() => {
    let aborted = false;

    async function init() {
      if (!containerRef.current) return;

      const { createChart, ColorType, AreaSeries } = await import('lightweight-charts');

      // 异步导入完成后，如果 effect 已被清理则不继续
      if (aborted) return;

      const dark = document.documentElement.classList.contains('dark');

      const chart = createChart(containerRef.current!, {
        width: containerRef.current!.clientWidth,
        height: 220,
        layout: {
          background: { type: ColorType.Solid, color: dark ? '#141414' : '#ffffff' },
          textColor: dark ? '#666666' : '#999999',
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 11,
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: dark ? '#1a1a1a' : '#f0f0f0' },
          horzLines: { color: dark ? '#1a1a1a' : '#f0f0f0' },
        },
        crosshair: {
          vertLine: {
            color: dark ? '#333333' : '#cccccc',
            width: 1,
            style: 2,
            labelBackgroundColor: dark ? '#222222' : '#e0e0e0',
          },
          horzLine: {
            color: dark ? '#333333' : '#cccccc',
            width: 1,
            style: 2,
            labelBackgroundColor: dark ? '#222222' : '#e0e0e0',
          },
        },
        rightPriceScale: {
          borderColor: dark ? '#222222' : '#e0e0e0',
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: dark ? '#222222' : '#e0e0e0',
          timeVisible: true,
          secondsVisible: false,
        },
      });

      // 创建面积系列
      const series = chart.addSeries(AreaSeries, {
        topColor: dark ? 'rgba(0, 229, 255, 0.12)' : 'rgba(0, 184, 212, 0.12)',
        bottomColor: dark ? 'rgba(0, 229, 255, 0.01)' : 'rgba(0, 184, 212, 0.01)',
        lineColor: dark ? '#00e5ff' : '#00b8d4',
        lineWidth: 2,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: dark ? '#00e5ff' : '#00b8d4',
        crosshairMarkerBackgroundColor: dark ? '#141414' : '#ffffff',
      });

      chartRef.current = chart;
      seriesRef.current = series;

      // 渲染初始数据
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
          time: p.ts as any,
          value: p.price,
        }));
        series.setData(lineData);
        chart.timeScale().fitContent();
      }

      // 自适应容器大小
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

  // 更新数据
  useEffect(() => {
    if (!seriesRef.current || priceHistory.length === 0) return;

    // 降采样
    const maxPoints = 300;
    let displayData = priceHistory;
    if (priceHistory.length > maxPoints) {
      const step = Math.ceil(priceHistory.length / maxPoints);
      displayData = priceHistory.filter((_, i) => i % step === 0);
      if (displayData[displayData.length - 1] !== priceHistory[priceHistory.length - 1]) {
        displayData.push(priceHistory[priceHistory.length - 1]);
      }
    }

    // 转换为 lightweight-charts 格式（UTCTimestamp 秒级）
    const lineData = displayData.map((p) => ({
      time: p.ts as any,
      value: p.price,
    }));

    seriesRef.current.setData(lineData);

    // 自动适配可见范围
    chartRef.current?.timeScale().fitContent();
  }, [priceHistory]);

  // 主题切换时更新颜色
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;

    chartRef.current.applyOptions({
      layout: {
        background: { type: 'solid' as const, color: isDark ? '#141414' : '#ffffff' },
        textColor: isDark ? '#666666' : '#999999',
      },
      grid: {
        vertLines: { color: isDark ? '#1a1a1a' : '#f0f0f0' },
        horzLines: { color: isDark ? '#1a1a1a' : '#f0f0f0' },
      },
      crosshair: {
        vertLine: { color: isDark ? '#333333' : '#cccccc', labelBackgroundColor: isDark ? '#222222' : '#e0e0e0' },
        horzLine: { color: isDark ? '#333333' : '#cccccc', labelBackgroundColor: isDark ? '#222222' : '#e0e0e0' },
      },
      rightPriceScale: { borderColor: isDark ? '#222222' : '#e0e0e0' },
      timeScale: { borderColor: isDark ? '#222222' : '#e0e0e0' },
    });

    seriesRef.current.applyOptions({
      topColor: isDark ? 'rgba(0, 229, 255, 0.12)' : 'rgba(0, 184, 212, 0.12)',
      bottomColor: isDark ? 'rgba(0, 229, 255, 0.01)' : 'rgba(0, 184, 212, 0.01)',
      lineColor: isDark ? '#00e5ff' : '#00b8d4',
      crosshairMarkerBorderColor: isDark ? '#00e5ff' : '#00b8d4',
      crosshairMarkerBackgroundColor: isDark ? '#141414' : '#ffffff',
    });
  }, [isDark]);

  // 统计数据
  const prices = priceHistory.map((p) => p.price);
  const high24h = prices.length > 0 ? Math.max(...prices) : 0;
  const low24h = prices.length > 0 ? Math.min(...prices) : 0;
  const currentPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
  const firstPrice = prices.length > 0 ? prices[0] : 0;
  const changePercent = firstPrice > 0 ? ((currentPrice - firstPrice) / firstPrice) * 100 : 0;
  const changeColor = changePercent >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-muted tracking-wider uppercase">
          {t('priceTrend')}
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted/40">
            H: <span className="font-mono text-emerald-400" suppressHydrationWarning>{high24h.toFixed(6)}</span>
          </span>
          <span className="text-muted/40">
            L: <span className="font-mono text-red-400" suppressHydrationWarning>{low24h.toFixed(6)}</span>
          </span>
          <span className={`font-bold font-mono ${changeColor}`} suppressHydrationWarning>
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="border border-edge overflow-hidden relative h-[220px]">
        {priceHistory.length === 0 && (
          <div className="absolute inset-0 z-10 bg-background/80 flex items-center justify-center text-muted text-sm tracking-wider uppercase">
            {t('loading')}
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
      <p className="text-[10px] text-muted/30 text-center mt-2 tracking-wider uppercase">
        PRL/USDT · {t('priceTrendDesc')}
      </p>
    </div>
  );
}
