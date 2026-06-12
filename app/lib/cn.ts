/**
 * 简易 className 合并工具
 *
 * 不引入 clsx / tailwind-merge 第三方库（足够用就行）。
 * 只做：filter 假值 + space-join。
 *
 * 使用：
 *   <div className={cn('base', isActive && 'active', someClass)} />
 */
export function cn(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(' ');
}
