/**
 * 登录 / 注册公用布局
 *
 * 居中卡片样式，复用主题色（surface / edge / muted / accent）
 */
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-dark px-4 py-12">
      <Link
        href="/"
        className="text-xs text-muted tracking-[0.2em] uppercase mb-8 hover:text-accent transition-colors"
      >
        ← Pearl Compute
      </Link>
      <div className="w-full max-w-md bg-surface border border-edge p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}
