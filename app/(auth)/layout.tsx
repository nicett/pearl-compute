/**
 * 登录 / 注册公用布局 — 居中卡片 + 品牌头
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center px-4 py-12">
      <Link
        href="/"
        className="flex items-center gap-2 mb-8 text-secondary hover:text-primary transition-colors"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-brand to-brand-hover">
          <span className="text-white text-sm font-bold">P</span>
        </span>
        <span className="text-base font-semibold">Pearl Compute</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
