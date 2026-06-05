'use client';

import { useEffect, useRef, useCallback, MutableRefObject } from 'react';
import { Chart, registerables } from 'chart.js';

// 注册 Chart.js 组件（仅客户端）
if (typeof window !== 'undefined') {
  Chart.register(...registerables);
}

interface ChartRefs {
  compChartRef: MutableRefObject<HTMLCanvasElement | null>;
  projChartRef: MutableRefObject<HTMLCanvasElement | null>;
}

interface ChartActions {
  updateCharts: (params: {
    dailyElecCost: number;
    dailyNet: number;
    totalRiskExposure: number;
  }) => void;
}

type TFunction = (key: string) => string;

/**
 * Chart.js 生命周期管理 Hook
 * 负责图表的创建、主题更新、数据更新、销毁
 */
export function useChartManager(
  resolvedTheme: 'light' | 'dark',
  t: TFunction
): ChartRefs & ChartActions {
  const compChartRef = useRef<HTMLCanvasElement | null>(null);
  const projChartRef = useRef<HTMLCanvasElement | null>(null);
  const compChartInstance = useRef<Chart | null>(null);
  const projChartInstance = useRef<Chart | null>(null);

  // 初始化图表
  useEffect(() => {
    if (!compChartRef.current || !projChartRef.current) return;

    Chart.defaults.font.family = '"IBM Plex Mono", monospace';
    Chart.defaults.color = resolvedTheme === 'dark' ? '#666' : '#999';

    // 饼图
    compChartInstance.current = new Chart(compChartRef.current, {
      type: 'doughnut',
      data: {
        labels: [t('dailyElecCost'), t('dailyNet')],
        datasets: [
          {
            data: [0, 0],
            backgroundColor: [
              resolvedTheme === 'dark' ? 'rgba(255, 23, 68, 0.7)' : 'rgba(255, 23, 68, 0.6)',
              resolvedTheme === 'dark' ? 'rgba(0, 229, 255, 0.7)' : 'rgba(0, 184, 212, 0.6)',
            ],
            borderColor: resolvedTheme === 'dark' ? '#141414' : '#ffffff',
            borderWidth: 2,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 16,
              color: resolvedTheme === 'dark' ? '#666' : '#999',
              font: { family: '"IBM Plex Mono", monospace', size: 11 },
            },
          },
        },
      },
    });

    // 柱状图
    projChartInstance.current = new Chart(projChartRef.current, {
      type: 'bar',
      data: {
        labels: [`30 ${t('days')}`, `90 ${t('days')}`, `180 ${t('days')}`, `365 ${t('days')}`],
        datasets: [
          {
            label: t('cumulativeNet'),
            data: [0, 0, 0, 0],
            backgroundColor: resolvedTheme === 'dark' ? 'rgba(0, 229, 255, 0.5)' : 'rgba(0, 184, 212, 0.4)',
            borderColor: resolvedTheme === 'dark' ? '#00e5ff' : '#00b8d4',
            borderWidth: 1,
            borderRadius: 0,
            order: 2,
          },
          {
            label: t('depreciationExposure'),
            data: [0, 0, 0, 0],
            type: 'line',
            borderColor: resolvedTheme === 'dark' ? 'rgba(255, 23, 68, 0.7)' : 'rgba(255, 23, 68, 0.6)',
            borderWidth: 1.5,
            borderDash: [4, 4],
            fill: false,
            pointRadius: 0,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: resolvedTheme === 'dark' ? '#1a1a1a' : '#eee' },
            border: { color: resolvedTheme === 'dark' ? '#1a1a1a' : '#eee' },
            ticks: {
              color: resolvedTheme === 'dark' ? '#666' : '#999',
              font: { family: '"IBM Plex Mono", monospace', size: 10 },
            },
          },
          x: {
            grid: { display: false },
            border: { color: resolvedTheme === 'dark' ? '#1a1a1a' : '#eee' },
            ticks: {
              color: resolvedTheme === 'dark' ? '#666' : '#999',
              font: { family: '"IBM Plex Mono", monospace', size: 10 },
            },
          },
        },
        plugins: {
          tooltip: { mode: 'index', intersect: false },
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 16,
              color: resolvedTheme === 'dark' ? '#666' : '#999',
              font: { family: '"IBM Plex Mono", monospace', size: 11 },
            },
          },
        },
      },
    });

    return () => {
      compChartInstance.current?.destroy();
      projChartInstance.current?.destroy();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 语言切换时更新图表标签
  useEffect(() => {
    if (compChartInstance.current) {
      compChartInstance.current.data.labels = [t('dailyElecCost'), t('dailyNet')];
      compChartInstance.current.update('none');
    }
    if (projChartInstance.current) {
      projChartInstance.current.data.labels = [
        `30 ${t('days')}`,
        `90 ${t('days')}`,
        `180 ${t('days')}`,
        `365 ${t('days')}`,
      ];
      projChartInstance.current.data.datasets[0].label = t('cumulativeNet');
      projChartInstance.current.data.datasets[1].label = t('depreciationExposure');
      projChartInstance.current.update('none');
    }
  }, [t]);

  // 主题切换时更新图表颜色
  useEffect(() => {
    Chart.defaults.color = resolvedTheme === 'dark' ? '#666' : '#999';
    if (projChartInstance.current) {
      if (projChartInstance.current.options.scales?.y?.grid) {
        projChartInstance.current.options.scales.y.grid.color =
          resolvedTheme === 'dark' ? '#1a1a1a' : '#eee';
      }
      projChartInstance.current.update('none');
    }
    if (compChartInstance.current) {
      compChartInstance.current.update('none');
    }
  }, [resolvedTheme]);

  // 更新图表数据（用 useCallback 稳定引用，避免 useEffect 不必要的重执行）
  const updateCharts = useCallback(
    ({
      dailyElecCost,
      dailyNet,
      totalRiskExposure,
    }: {
      dailyElecCost: number;
      dailyNet: number;
      totalRiskExposure: number;
    }) => {
      if (compChartInstance.current) {
        const compData = dailyNet <= 0 ? [dailyElecCost, 0] : [dailyElecCost, dailyNet];
        compChartInstance.current.data.datasets[0].data = compData;
        compChartInstance.current.update();
      }

      if (projChartInstance.current) {
        const projData = [dailyNet * 30, dailyNet * 90, dailyNet * 180, dailyNet * 365];
        projChartInstance.current.data.datasets[0].data = projData;
        projChartInstance.current.data.datasets[1].data = [
          totalRiskExposure,
          totalRiskExposure,
          totalRiskExposure,
          totalRiskExposure,
        ];
        projChartInstance.current.update();
      }
    },
    []
  );

  return {
    compChartRef,
    projChartRef,
    updateCharts,
  };
}
