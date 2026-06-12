/**
 * Metric — 数字指标卡（label + 大数字 + 可选趋势）
 *
 * 用法：
 *   <Metric label="算力" value="295.5 KH/s" />
 *   <Metric label="24h收益" value="2.71 PRL" trend="up" trendValue="+12.5%" />
 *   <Metric label="状态" value="离线" tone="danger" />
 */
'use client';

import { cn } from '@/app/lib/cn';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'default' | 'brand' | 'success' | 'danger' | 'warning';
type Trend = 'up' | 'down' | 'flat';

interface MetricProps {
  label: string;
  value: ReactNode;
  /** 数字主色调 */
  tone?: Tone;
  /** 可选小图标 / 单位 / 副标题 */
  hint?: ReactNode;
  /** 趋势箭头 + 百分比 */
  trend?: Trend;
  trendValue?: string;
  /** 紧凑版（不带卡片背景，仅文字） */
  inline?: boolean;
  className?: string;
}

const TONE_CLASSES: Record<Tone, string> = {
  default: 'text-primary',
  brand: 'text-brand',
  success: 'text-success',
  danger: 'text-danger',
  warning: 'text-warning',
};

export function Metric({
  label,
  value,
  tone = 'default',
  hint,
  trend,
  trendValue,
  inline = false,
  className,
}: MetricProps) {
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-tertiary';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5',
        !inline && 'rounded-md border border-subtle bg-card p-3',
        className,
      )}
    >
      <div className="text-xs font-medium text-tertiary">{label}</div>
      <div className={cn('text-xl font-semibold font-mono leading-none', TONE_CLASSES[tone])}>
        {value}
      </div>
      {(hint || trend) && (
        <div className="flex items-center gap-2 text-xs">
          {trend && trendValue && (
            <span className={cn('inline-flex items-center gap-1', trendColor)}>
              {TrendIcon && <TrendIcon className="h-3 w-3" />}
              <span className="font-mono">{trendValue}</span>
            </span>
          )}
          {hint && <span className="text-tertiary">{hint}</span>}
        </div>
      )}
    </div>
  );
}
