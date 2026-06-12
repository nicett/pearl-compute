/**
 * Select — 简化版下拉（包装原生 select，但样式跟 Input 一致）
 *
 * 用法：
 *   <Select label="矿池" value={slug} onChange={(e) => setSlug(e.target.value)}>
 *     <option value="">选择</option>
 *     <option value="pearl-herominers">HeroMiners (PRL)</option>
 *   </Select>
 */
'use client';

import { cn } from '@/app/lib/cn';
import { ChevronDown } from 'lucide-react';
import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string | null;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, fullWidth = true, className, id, children, ...rest },
  ref,
) {
  const selectId = id || (label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {label && (
        <label htmlFor={selectId} className="text-xs font-medium text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'h-10 w-full pl-3.5 pr-9 rounded-md text-sm text-primary appearance-none cursor-pointer',
            'bg-input border border-subtle',
            'transition-colors duration-150',
            'focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-danger focus:border-danger focus:ring-danger/20',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tertiary" />
      </div>
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-tertiary">{hint}</p>
      ) : null}
    </div>
  );
});
