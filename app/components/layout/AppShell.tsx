'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calculator, Pickaxe, LineChart, Moon, Sun, Monitor } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { useTheme } from '@/app/theme/context';
import { UserMenu } from './UserMenu';

const NAV_ITEMS = [
  { href: '/dashboard', label: '计算器', icon: Calculator },
  { href: '/miners', label: '矿工', icon: Pickaxe },
  { href: '/market', label: '行情', icon: LineChart },
];

/**
 * AppShell — 登录后页面通用外壳
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur border-b">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-2 text-base font-semibold">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70">
                <span className="text-primary-foreground text-xs font-bold">P</span>
              </span>
              <span className="hidden sm:inline">Pearl Compute</span>
            </Link>

            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: 'light', icon: Sun, label: '浅色' },
    { value: 'dark', icon: Moon, label: '深色' },
    { value: 'system', icon: Monitor, label: '跟随系统' },
  ] as const;

  return (
    <div className="hidden sm:flex items-center rounded-md border p-0.5">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            title={opt.label}
            onClick={() => setTheme(opt.value)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-sm transition-colors',
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
