'use client';

import { useEffect, useState, useCallback } from 'react';

import { listPools } from '@/app/lib/pools/registry';

interface Props {
  onAdded: () => void;
}

const POOLS = listPools();

export default function AddMinerForm({ onAdded }: Props) {
  const [poolSlug, setPoolSlug] = useState<string>(POOLS[0]?.slug ?? '');
  const [walletAddr, setWalletAddr] = useState('');
  const [label, setLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      setError(null);

      const res = await fetch('/api/me/miners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          poolSlug,
          walletAddr: walletAddr.trim(),
          label: label.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '添加失败');
        setSubmitting(false);
        return;
      }

      // 成功：清空表单 + 通知父组件刷新
      setWalletAddr('');
      setLabel('');
      setSubmitting(false);
      onAdded();
    },
    [poolSlug, walletAddr, label, onAdded],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted tracking-wider uppercase mb-1.5 block">
            矿池
          </label>
          <select
            value={poolSlug}
            onChange={(e) => setPoolSlug(e.target.value)}
            className="w-full bg-surface-dark border border-edge px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent"
          >
            {POOLS.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.displayName}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs text-muted tracking-wider uppercase mb-1.5 block">
            钱包地址
          </label>
          <input
            type="text"
            required
            placeholder="prl1..."
            value={walletAddr}
            onChange={(e) => setWalletAddr(e.target.value)}
            className="w-full bg-surface-dark border border-edge px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted tracking-wider uppercase mb-1.5 block">
          备注 <span className="text-muted/50 normal-case">(选填)</span>
        </label>
        <input
          type="text"
          maxLength={64}
          placeholder="例如：主机房"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full bg-surface-dark border border-edge px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent"
        />
      </div>

      {error && (
        <div className="text-xs text-red-400 border border-red-500/30 bg-red-500/5 px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !walletAddr.trim()}
        className="bg-accent text-surface-dark text-sm font-bold tracking-wider uppercase px-6 py-2 hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {submitting ? '添加中…' : '+ 添加'}
      </button>
    </form>
  );
}
