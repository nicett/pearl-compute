/**
 * 合并 className —— shadcn 标准实现
 *
 * clsx：处理条件式 className（filter 假值、合并字符串/对象/数组）
 * tailwind-merge：自动去重冲突的 Tailwind 类（如 'p-2 p-4' 只保留 'p-4'）
 *
 * 用法：
 *   <div className={cn('text-red-500', isActive && 'bg-blue-100', className)} />
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
