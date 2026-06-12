/**
 * Input — 带 label / error / 辅助文本的统一输入框
 *
 * 用法：
 *   <Input label="用户名" required />
 *   <Input label="密码" type="password" error="密码错误" />
 *   <Input label="备注" hint="可选" />
 */
'use client';

import { cn } from '@/app/lib/cn';
import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string | null;
  /** 在 label 右侧显示的可选信息（例如「选填」） */
  labelHint?: string;
  /** 让 input 占用全宽（默认 true，因为表单里几乎都需要） */
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, labelHint, fullWidth = true, className, id, ...rest },
  ref,
) {
  const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {label && (
        <label htmlFor={inputId} className="flex items-center gap-2 text-xs font-medium text-secondary">
          {label}
          {labelHint && <span className="text-tertiary text-[11px] font-normal">{labelHint}</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-10 px-3.5 rounded-md text-sm font-mono text-primary',
          'bg-input border border-subtle',
          'placeholder:text-tertiary',
          'transition-colors duration-150',
          'focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-danger focus:border-danger focus:ring-danger/20',
          className,
        )}
        {...rest}
      />
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-tertiary">{hint}</p>
      ) : null}
    </div>
  );
});
