/**
 * Dashboard — 用户登录后的计算器
 * 外层 AppShell 已带 header，MinerCalculator 不渲染自己的 TopBar
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
      <MinerCalculator initialData={DEFAULT_INITIAL_DATA} showTopBar={false} />
    </AppShell>
  );
}
