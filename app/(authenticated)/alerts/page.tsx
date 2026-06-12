/**
 * /alerts — 价格预警规则管理页
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth, signOut } from '@/auth';
import AlertRuleList from '@/app/components/alerts/AlertRuleList';
import NotificationBell from '@/app/components/notifications/NotificationBell';

export default async function AlertsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="min-h-screen bg-surface-dark">
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
              <Link href="/miners" className="text-muted hover:text-accent transition-colors">
                Miners
              </Link>
              <Link href="/alerts" className="text-accent">
                Alerts
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-xs tracking-wider uppercase">
            <NotificationBell />
            <span className="text-muted">
              user: <span className="text-accent font-mono">{session.user.name}</span>
            </span>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/' });
              }}
            >
              <button type="submit" className="text-muted hover:text-accent transition-colors">
                登出
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 lg:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-base font-semibold tracking-[0.2em] uppercase text-foreground">
            价格预警
          </h1>
          <p className="text-xs text-muted/60 mt-2">
            每 30 秒检查一次三个价格源（Pearl OTC / SafeTrade / OKX）。命中后写入站内通知并冷却。
          </p>
        </div>

        <AlertRuleList />
      </main>
    </div>
  );
}
