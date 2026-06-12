/**
 * Badge — 状态徽章 / 标签
 *
 * 用法：
 *   <Badge>默认</Badge>
 *   <Badge variant="success">在线</Badge>
 *   <Badge variant="brand" dot>5</Badge>
 */
'use client';

import { cn } from '@/app/lib/cn';
import type { ReactNode } from 'react';

type Variant = 'default' | 'brand' | 'success' | 'danger' | 'warning';

interface BadgeProps {
  variant?: Variant;
  /** 在文字前显示一个圆点（适合状态指示） */
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

const VARIANTS: Record<Variant, { bg: string; text: string; dot: string }> = {
  default: {
    bg: 'bg-elevated',
    text: 'text-secondary',
    dot: 'bg-tertiary',
  },
  brand: {
    bg: 'bg-brand-soft',
    text: 'text-brand',
    dot: 'bg-brand',
  },
  success: {
    bg: 'bg-success/10',
    text: 'text-success',
    dot: 'bg-success',
  },
  danger: {
    bg: 'bg-danger/10',
    text: 'text-danger',
    dot: 'bg-danger',
  },
  warning: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    dot: 'bg-warning',
  },
};

export function Badge({ variant = 'default', dot = false, className, children }: BadgeProps) {
  const style = VARIANTS[variant];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5',
        'text-xs font-medium',
        style.bg,
        style.text,
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />}
      {children}
    </span>
  );
}
