/**
 * Dashboard — 用户登录后看到的计算器
 *
 * 注：Phase 3 之前 MinerCalculator 内部仍是旧风格（颜色会"裸奔"），
 * 等 Phase 3 重写计算器主页后整页统一
 */
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { AppShell } from '@/app/components/layout/AppShell';
import MinerCalculator from '@/app/MinerCalculator';
import { DEFAULT_INITIAL_DATA } from '@/app/initial-data';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <AppShell>
      <MinerCalculator initialData={DEFAULT_INITIAL_DATA} />
    </AppShell>
  );
}
