'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface Notification {
  id: string;
  channel: string;
  subject: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  meta?: Record<string, unknown> | null;
}

const POLL_INTERVAL_MS = 30_000;

function formatAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}秒前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}小时前`;
  const day = Math.floor(hr / 24);
  return `${day}天前`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/me/notifications?limit=20', { credentials: 'same-origin' });
      if (!res.ok) return;
      const data = (await res.json()) as { notifications: Notification[]; unreadCount: number };
      setList(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // 静默：不在每次轮询失败时打扰用户
    }
  }, []);

  // 轮询
  useEffect(() => {
    reload();
    const timer = setInterval(reload, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [reload]);

  // 点外面关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markRead = useCallback(
    async (id: string) => {
      await fetch(`/api/me/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      reload();
    },
    [reload],
  );

  const markAllRead = useCallback(async () => {
    await fetch('/api/me/notifications/read-all', {
      method: 'POST',
      credentials: 'same-origin',
    });
    reload();
  }, [reload]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative text-muted hover:text-accent transition-colors text-xs tracking-wider uppercase"
        aria-label="通知"
      >
        通知
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-3 bg-red-500 text-white text-[10px] font-mono font-bold rounded-full px-1.5 leading-4 min-w-[16px] text-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-7 z-50 w-80 sm:w-96 bg-surface border border-edge shadow-2xl">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-edge">
            <span className="text-xs font-semibold tracking-[0.15em] uppercase text-muted">
              通知 ({unreadCount} 未读)
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] text-muted/60 hover:text-accent tracking-wider uppercase"
              >
                全部已读
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {list.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted/60">暂无通知</div>
            ) : (
              <ul>
                {list.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => !n.readAt && markRead(n.id)}
                    className={`px-4 py-3 border-b border-edge/40 cursor-pointer hover:bg-surface-dark transition-colors ${
                      !n.readAt ? 'bg-accent/5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium text-foreground truncate">
                        {!n.readAt && <span className="text-accent mr-1.5">●</span>}
                        {n.subject}
                      </div>
                      <span className="text-[10px] text-muted/50 whitespace-nowrap mt-0.5">
                        {formatAge(n.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs text-muted mt-1 leading-relaxed">{n.body}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
