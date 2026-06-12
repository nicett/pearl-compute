'use client';

import { useEffect, useState, useCallback } from 'react';

import AddAlertForm from './AddAlertForm';

interface Rule {
  id: string;
  type: 'PRICE_ABOVE' | 'PRICE_BELOW' | 'SHUTDOWN_NEAR';
  threshold: number;
  priceSource: string | null;
  enabled: boolean;
  cooldownMin: number;
  lastFiredAt: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<Rule['type'], string> = {
  PRICE_ABOVE: '价格高于',
  PRICE_BELOW: '价格低于',
  SHUTDOWN_NEAR: '接近关机价',
};

export default function AlertRuleList() {
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/me/alerts', { credentials: 'same-origin' });
      if (!res.ok) {
        setError(`加载失败 (HTTP ${res.status})`);
        return;
      }
      const data = (await res.json()) as { rules: Rule[] };
      setRules(data.rules);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleToggle = useCallback(
    async (id: string, enabled: boolean) => {
      // 乐观更新
      setRules((prev) => prev?.map((r) => (r.id === id ? { ...r, enabled } : r)) ?? null);
      await fetch(`/api/me/alerts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ enabled }),
      });
      reload();
    },
    [reload],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('确定删除该预警规则？')) return;
      const res = await fetch(`/api/me/alerts/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        alert('删除失败');
        return;
      }
      setRules((prev) => prev?.filter((r) => r.id !== id) ?? null);
      reload();
    },
    [reload],
  );

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-edge p-5">
        <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-muted mb-4">
          + 添加价格预警
        </h2>
        <AddAlertForm onAdded={reload} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-muted">
            已配置 ({rules?.length ?? 0})
          </h2>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>

        {rules === null ? (
          <div className="bg-surface border border-edge p-8 text-center text-sm text-muted">加载中…</div>
        ) : rules.length === 0 ? (
          <div className="bg-surface border border-edge p-8 text-center text-sm text-muted">
            还没有预警规则。在上面添加你的第一条。
          </div>
        ) : (
          <ul className="space-y-2">
            {rules.map((r) => (
              <li
                key={r.id}
                className={`bg-surface border border-edge p-4 flex flex-wrap items-center gap-3 ${
                  !r.enabled ? 'opacity-50' : ''
                }`}
              >
                <div className="flex-1 min-w-[260px]">
                  <div className="text-sm font-mono text-foreground">
                    {TYPE_LABELS[r.type]}{' '}
                    <span className="text-accent">${r.threshold.toFixed(4)}</span>
                  </div>
                  <div className="text-[10px] text-muted/60 mt-1 tracking-wider uppercase">
                    {r.priceSource ? `仅 ${r.priceSource}` : '任意源'} · 冷却 {r.cooldownMin}min
                    {r.lastFiredAt && (
                      <>
                        {' '}
                        · 上次触发{' '}
                        {new Date(r.lastFiredAt).toLocaleString('zh-CN', {
                          hour12: false,
                        })}
                      </>
                    )}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted tracking-wider uppercase cursor-pointer">
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={(e) => handleToggle(r.id, e.target.checked)}
                    className="accent-emerald-500"
                  />
                  {r.enabled ? '启用' : '已停用'}
                </label>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="text-[10px] text-muted/50 hover:text-red-400 tracking-wider uppercase border border-edge hover:border-red-500/40 px-2 py-1 transition-colors"
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
