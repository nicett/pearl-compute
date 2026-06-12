/**
 * /miners — 矿工绑定管理页（登录后）
 */
import Link from 'next/link';

import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';
import MinerBindingList from '@/app/components/miners/MinerBindingList';

export default async function MinersPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="min-h-screen bg-surface-dark">
      {/* 全局 header */}
      <header className="bg-surface border-b border-edge">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-semibold tracking-[0.2em] uppercase text-foreground"
            >
              Pearl Compute
            </Link>
            <nav className="flex items-center gap-4 text-xs tracking-wider uppercase">
              <Link href="/dashboard" className="text-muted hover:text-accent transition-colors">
                Calculator
              </Link>
              <Link href="/miners" className="text-accent">
                Miners
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-xs tracking-wider uppercase">
            <span className="text-muted">
              user: <span className="text-accent font-mono">{session.user.name}</span>
            </span>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/' });
              }}
            >
              <button
                type="submit"
                className="text-muted hover:text-accent transition-colors"
              >
                登出
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-base font-semibold tracking-[0.2em] uppercase text-foreground">
            矿工绑定
          </h1>
          <p className="text-xs text-muted/60 mt-2">
            绑定矿池和钱包地址，系统会每 5 分钟同步一次算力 / 余额 / 收益数据，
            前端 10 秒刷新一次展示。
          </p>
        </div>

        <MinerBindingList />
      </main>
    </div>
  );
}
