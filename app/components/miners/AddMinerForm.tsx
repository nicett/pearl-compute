'use client';

import { useState, useCallback } from 'react';
import { Plus, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
        <div className="space-y-2">
          <Label htmlFor="pool">矿池</Label>
          <Select value={poolSlug} onValueChange={setPoolSlug}>
            <SelectTrigger id="pool">
              <SelectValue placeholder="选择矿池" />
            </SelectTrigger>
            <SelectContent>
              {POOLS.map((p) => (
                <SelectItem key={p.slug} value={p.slug}>
                  {p.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="wallet">钱包地址</Label>
          <Input
            id="wallet"
            placeholder="prl1..."
            required
            value={walletAddr}
            onChange={(e) => setWalletAddr(e.target.value)}
            className="font-mono"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="label">
          备注 <span className="text-muted-foreground font-normal text-xs">(选填)</span>
        </Label>
        <Input
          id="label"
          placeholder="例如：主机房 5 台"
          maxLength={64}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting || !walletAddr.trim()}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus />}
          添加
        </Button>
      </div>
    </form>
  );
}
