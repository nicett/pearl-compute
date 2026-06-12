'use client';

import { signOut, useSession } from 'next-auth/react';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/app/lib/cn';

/**
 * 右上角用户菜单 — 显示用户名 + 下拉
 */
export function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!session?.user) return null;

  const name = session.user.name || 'user';
  const initial = name.charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm',
          'text-secondary hover:text-primary hover:bg-elevated transition-colors',
        )}
      >
        <span
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full',
            'bg-brand text-white text-xs font-semibold',
          )}
        >
          {initial}
        </span>
        <span className="hidden sm:inline font-medium">{name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-tertiary" />
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 top-full mt-1.5 w-48 rounded-lg',
            'bg-elevated border border-subtle shadow-elevated',
            'z-50 overflow-hidden',
          )}
        >
          <div className="px-3 py-2.5 border-b border-subtle">
            <div className="text-xs text-tertiary">登录用户</div>
            <div className="text-sm text-primary font-medium truncate mt-0.5">{name}</div>
          </div>
          <div className="py-1">
            <button
              type="button"
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2',
                'text-sm text-secondary hover:text-primary hover:bg-card',
                'transition-colors',
              )}
              onClick={() => {
                setOpen(false);
                // 占位：v1.5 加账号设置
              }}
            >
              <User className="h-4 w-4" />
              账号设置
              <span className="ml-auto text-[10px] text-tertiary">soon</span>
            </button>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2',
                'text-sm text-secondary hover:text-danger hover:bg-card',
                'transition-colors',
              )}
            >
              <LogOut className="h-4 w-4" />
              登出
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
