/**
 * Button — 4 个 variant：primary（紫色实心）/ secondary（边框）/ ghost / danger
 *
 * 用法：
 *   <Button>默认</Button>
 *   <Button variant="primary" size="md">提交</Button>
 *   <Button variant="ghost" leftIcon={<Plus className="h-4 w-4" />}>添加</Button>
 *   <Button variant="danger" disabled loading>删除</Button>
 */
'use client';

import { cn } from '@/app/lib/cn';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-hover disabled:bg-brand/40 disabled:text-white/70',
  secondary:
    'bg-transparent border border-line text-primary hover:bg-elevated disabled:opacity-50',
  ghost:
    'bg-transparent text-secondary hover:text-primary hover:bg-elevated disabled:opacity-50',
  danger:
    'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 disabled:opacity-50',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth,
    className,
    disabled,
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-md',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        'disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        leftIcon && <span className="flex shrink-0">{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && <span className="flex shrink-0">{rightIcon}</span>}
    </button>
  );
});
