'use client';

import { useEffect, useState, useCallback } from 'react';

import AddMinerForm from './AddMinerForm';
import MinerCard, { type Binding } from './MinerCard';

const POLL_INTERVAL_MS = 10_000;

export default function MinerBindingList() {
  const [bindings, setBindings] = useState<Binding[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/me/miners', { credentials: 'same-origin' });
      if (!res.ok) {
        setLoadError(`加载失败 (HTTP ${res.status})`);
        return;
      }
      const data = (await res.json()) as { bindings: Binding[] };
      setBindings(data.bindings);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '加载失败');
    }
  }, []);

  // 首次加载 + 10s 轮询
  useEffect(() => {
    reload();
    const timer = setInterval(reload, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [reload]);

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/me/miners/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        alert('删除失败');
        return;
      }
      // 乐观更新 + 后台对齐
      setBindings((prev) => prev?.filter((b) => b.id !== id) ?? null);
      reload();
    },
    [reload],
  );

  return (
    <div className="space-y-6">
      {/* 添加表单 */}
      <div className="bg-surface border border-edge p-5">
        <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-muted mb-4">
          + 添加矿工绑定
        </h2>
        <AddMinerForm onAdded={reload} />
      </div>

      {/* 已绑定列表 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-muted">
            已绑定 ({bindings?.length ?? 0})
          </h2>
          {loadError && (
            <span className="text-xs text-red-400">{loadError}</span>
          )}
        </div>

        {bindings === null ? (
          <div className="bg-surface border border-edge p-8 text-center text-sm text-muted">
            加载中…
          </div>
        ) : bindings.length === 0 ? (
          <div className="bg-surface border border-edge p-8 text-center text-sm text-muted">
            还没有任何绑定。在上面添加你的第一个矿工地址。
          </div>
        ) : (
          <div className="space-y-4">
            {bindings.map((b) => (
              <MinerCard key={b.id} binding={b} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
