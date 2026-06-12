'use client';

import { useEffect, useState, useCallback } from 'react';
import { Pickaxe } from 'lucide-react';

import { Card } from '@/app/components/ui';
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
      setBindings((prev) => prev?.filter((b) => b.id !== id) ?? null);
      reload();
    },
    [reload],
  );

  return (
    <div className="space-y-6">
      {/* 添加表单 */}
      <Card title="添加矿工绑定" subtitle="支持 HeroMiners 系矿池，地址必须以 prl1 开头">
        <AddMinerForm onAdded={reload} />
      </Card>

      {/* 列表 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-primary">
            已绑定 <span className="text-tertiary font-normal">({bindings?.length ?? 0})</span>
          </h2>
          {loadError && <span className="text-xs text-danger">{loadError}</span>}
        </div>

        {bindings === null ? (
          <Card padding="lg">
            <div className="text-center text-sm text-tertiary py-4">加载中…</div>
          </Card>
        ) : bindings.length === 0 ? (
          <Card padding="lg">
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand mb-3">
                <Pickaxe className="h-6 w-6" />
              </div>
              <div className="text-sm font-medium text-primary mb-1">还没有绑定</div>
              <div className="text-xs text-tertiary max-w-xs">
                在上面添加你的第一个矿工地址，系统会每 5 分钟同步一次实时数据
              </div>
            </div>
          </Card>
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
