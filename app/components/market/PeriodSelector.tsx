'use client';

import { cn } from '@/lib/utils';

export interface PeriodOption {
  value: number;     // 分钟
  label: string;
}

export const KLINE_PERIODS: PeriodOption[] = [
  { value: 1,     label: '1m' },
  { value: 5,     label: '5m' },
  { value: 15,    label: '15m' },
  { value: 60,    label: '1h' },
  { value: 240,   label: '4h' },
  { value: 1440,  label: '1d' },
  { value: 10080, label: '1w' },
];

interface Props {
  value: number;
  onChange: (period: number) => void;
}

/** 周期切换 tab —— 行情页与首页都可用 */
export default function PeriodSelector({ value, onChange }: Props) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border bg-card p-0.5">
      {KLINE_PERIODS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={cn(
            'rounded-sm px-2.5 py-1 text-xs font-medium transition-colors',
            value === p.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
