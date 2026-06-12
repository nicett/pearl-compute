'use client';

import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';

import { Button, Input, Select } from '@/app/components/ui';
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

      setWalletAddr('');
      setLabel('');
      setSubmitting(false);
      onAdded();
    },
    [poolSlug, walletAddr, label, onAdded],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select
          label="矿池"
          value={poolSlug}
          onChange={(e) => setPoolSlug(e.target.value)}
        >
          {POOLS.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.displayName}
            </option>
          ))}
        </Select>

        <div className="sm:col-span-2">
          <Input
            label="钱包地址"
            placeholder="prl1..."
            required
            value={walletAddr}
            onChange={(e) => setWalletAddr(e.target.value)}
          />
        </div>
      </div>

      <Input
        label="备注"
        labelHint="选填"
        placeholder="例如：主机房 5 台"
        maxLength={64}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />

      {error && (
        <div className="rounded-md bg-danger/10 border border-danger/20 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="submit"
          loading={submitting}
          disabled={!walletAddr.trim()}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          添加
        </Button>
      </div>
    </form>
  );
}
