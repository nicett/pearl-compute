/**
 * 受保护路由组的共用 layout
 *
 * Server-side 直接 await auth() 强制鉴权 —— 即使 middleware 漏过任何路径，
 * 这里也是最后一道防线，未登录直接 redirect
 */
import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return <>{children}</>;
}
