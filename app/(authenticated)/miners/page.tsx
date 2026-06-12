/**
 * /miners — 矿工绑定管理页（登录后）
 */
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { AppShell } from '@/app/components/layout/AppShell';
import MinerBindingList from '@/app/components/miners/MinerBindingList';

export default async function MinersPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <AppShell>
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-primary">矿工绑定</h1>
          <p className="text-sm text-tertiary mt-1.5">
            绑定矿池和钱包地址，系统每 5 分钟同步一次算力 / 余额 / 收益数据；前端 10 秒刷新一次展示。
          </p>
        </div>

        <MinerBindingList />
      </div>
    </AppShell>
  );
}
