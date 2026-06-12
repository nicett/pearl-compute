/**
 * Skeleton — 加载占位
 *
 * 用法：
 *   <Skeleton className="h-4 w-32" />
 *   <Skeleton className="h-10 rounded-md" />
 *   <Skeleton variant="circle" className="h-10 w-10" />
 */
'use client';

import { cn } from '@/app/lib/cn';

interface SkeletonProps {
  variant?: 'rect' | 'text' | 'circle';
  className?: string;
}

export function Skeleton({ variant = 'rect', className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse-slow bg-elevated',
        variant === 'circle' && 'rounded-full',
        variant === 'text' && 'rounded h-3',
        variant === 'rect' && 'rounded-md',
        className,
      )}
    />
  );
}
