/**
 * Dashboard — Sprint 1 占位页
 *
 * Sprint 2 会接入计算器；Sprint 3 加矿工绑定；Sprint 4 加预警
 */
import Link from 'next/link';
import { auth, signOut } from '@/auth';

export default async function DashboardPage() {
  const session = await auth();
  // layout 已保证 session 存在，此处 ! 安全
  const user = session!.user;

  return (
    <div className="min-h-screen bg-surface-dark">
      <header className="bg-surface border-b border-edge">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.2em] uppercase text-foreground"
          >
            Pearl Compute
          </Link>
          <div className="flex items-center gap-4 text-xs tracking-wider uppercase">
            <span className="text-muted">
              user: <span className="text-accent font-mono">{user.name}</span>
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

      <main className="max-w-[1600px] mx-auto px-4 lg:px-6 py-12">
        <div className="bg-surface border border-edge p-8">
          <h1 className="text-base font-semibold tracking-[0.2em] uppercase text-foreground mb-4">
            Dashboard
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            欢迎，{user.name}。Sprint 1 已完成 — 注册 / 登录 / 路由保护就绪。
          </p>
          <ul className="mt-6 space-y-2 text-xs text-muted/70 tracking-wider uppercase">
            <li>Sprint 2 ：计算器配置云端同步</li>
            <li>Sprint 3 ：矿工绑定 + 后台数据同步</li>
            <li>Sprint 4 ：价格预警 + 邮件通知</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
