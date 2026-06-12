/**
 * Card — 标准卡片容器，可选 header / footer
 *
 * 用法：
 *   <Card>简单内容</Card>
 *   <Card title="矿工" subtitle="实时数据" actions={<Button size="sm">+ 添加</Button>}>
 *     ...
 *   </Card>
 *   <Card padding="lg" interactive>{...}</Card>
 */
'use client';

import { cn } from '@/app/lib/cn';
import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** hover 态：用于可点击的卡片（如绑定列表项） */
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}

const PADDINGS = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
} as const;

export function Card({
  title,
  subtitle,
  actions,
  padding = 'md',
  interactive,
  className,
  children,
}: CardProps) {
  const hasHeader = title || subtitle || actions;

  return (
    <div
      className={cn(
        'bg-card border border-subtle rounded-lg',
        'shadow-card dark:shadow-none',
        interactive && 'transition-colors duration-150 hover:border-line cursor-pointer',
        className,
      )}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 pt-4 pb-3 border-b border-subtle">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-sm font-semibold text-primary truncate">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-tertiary mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className={cn(hasHeader ? 'p-4 sm:p-5' : PADDINGS[padding])}>{children}</div>
    </div>
  );
}
