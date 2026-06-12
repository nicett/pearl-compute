'use client';

import { signOut, useSession } from 'next-auth/react';
import { LogOut, User as UserIcon } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * 右上角用户菜单 — shadcn DropdownMenu 版
 */
export function UserMenu() {
  const { data: session } = useSession();
  if (!session?.user) return null;

  const name = session.user.name || 'user';
  const initial = name.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {initial}
          </span>
          <span className="hidden sm:inline font-medium">{name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>
          <div className="text-xs text-muted-foreground font-normal">登录用户</div>
          <div className="text-sm text-foreground font-semibold truncate mt-0.5">{name}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <UserIcon />
          账号设置
          <span className="ml-auto text-[10px] text-muted-foreground">soon</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: '/' })}
          className="text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut />
          登出
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
