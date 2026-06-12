/**
 * Dashboard — 用户登录后看到的计算器
 *
 * 与首页同一个 MinerCalculator 组件，但因为用户已登录，
 * 内部 useSyncedConfig 会自动接入云端，配置跨设备同步。
 *
 * 登出按钮在右上角（暂时复用 MinerCalculator 自带的 TopBar；
 * 后续 Sprint 加全局 Header 时再统一）
 */
import { redirect } from 'next/navigation';

import { auth, signOut } from '@/auth';
import MinerCalculator from '@/app/MinerCalculator';
import { DEFAULT_INITIAL_DATA } from '@/app/initial-data';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="min-h-screen flex flex-col">
      {/* 临时的用户信息条 —— Sprint 3 加全局 header 时合并 */}
      <div className="bg-surface border-b border-edge">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-2 flex items-center justify-end gap-4 text-xs tracking-wider uppercase">
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

      <MinerCalculator initialData={DEFAULT_INITIAL_DATA} />
    </div>
  );
}
