/**
 * /market — 行情页（需登录）
 */
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { AppShell } from '@/app/components/layout/AppShell';
import MarketView from './MarketView';

export default async function MarketPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <AppShell>
      <div className="max-w-[1600px] mx-auto px-4 lg:px-6 py-6">
        <div className="mb-5">
          <h1 className="text-xl font-semibold">PRL/USDT 行情</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            实时订单簿、成交流水、K 线图。数据来自 SafeTrade，每 5 秒刷新。
          </p>
        </div>
        <MarketView />
      </div>
    </AppShell>
  );
}
