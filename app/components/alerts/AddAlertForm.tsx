'use client';

import { useEffect, useState, useCallback } from 'react';

import { ALERT_TYPES, PRICE_SOURCES } from '@/app/lib/validators/alert';

interface Props {
  onAdded: () => void;
}

const TYPE_LABELS: Record<(typeof ALERT_TYPES)[number], string> = {
  PRICE_ABOVE: '价格高于',
  PRICE_BELOW: '价格低于',
  SHUTDOWN_NEAR: '接近关机价（暂未实现）',
};

export default function AddAlertForm({ onAdded }: Props) {
  const [type, setType] = useState<(typeof ALERT_TYPES)[number]>('PRICE_ABOVE');
  const [threshold, setThreshold] = useState<string>('1.0');
  const [priceSource, setPriceSource] = useState<string>(''); // '' = 任意源
  const [cooldownMin, setCooldownMin] = useState<string>('60');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const t = parseFloat(threshold);
      if (!Number.isFinite(t) || t < 0) {
        setError('阈值必须是非负数字');
        return;
      }
      const cd = parseInt(cooldownMin, 10);
      if (!Number.isFinite(cd) || cd < 1) {
        setError('冷却分钟必须 ≥ 1');
        return;
      }

      setSubmitting(true);
      const res = await fetch('/api/me/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          type,
          threshold: t,
          priceSource: priceSource || null,
          cooldownMin: cd,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || '添加失败');
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      onAdded();
    },
    [type, threshold, priceSource, cooldownMin, onAdded],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted tracking-wider uppercase mb-1.5 block">
            类型
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as (typeof ALERT_TYPES)[number])}
            className="w-full bg-surface-dark border border-edge px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent"
          >
            {ALERT_TYPES.filter((t) => t !== 'SHUTDOWN_NEAR').map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted tracking-wider uppercase mb-1.5 block">
            阈值 (USD)
          </label>
          <input
            type="number"
            step="0.0001"
            min="0"
            required
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            className="w-full bg-surface-dark border border-edge px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted tracking-wider uppercase mb-1.5 block">
            数据源
          </label>
          <select
            value={priceSource}
            onChange={(e) => setPriceSource(e.target.value)}
            className="w-full bg-surface-dark border border-edge px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent"
          >
            <option value="">任意源命中即触发</option>
            {PRICE_SOURCES.map((s) => (
              <option key={s} value={s}>
                仅 {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted tracking-wider uppercase mb-1.5 block">
            冷却 (分钟)
          </label>
          <input
            type="number"
            min="1"
            max="1440"
            required
            value={cooldownMin}
            onChange={(e) => setCooldownMin(e.target.value)}
            className="w-full bg-surface-dark border border-edge px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 border border-red-500/30 bg-red-500/5 px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="bg-accent text-surface-dark text-sm font-bold tracking-wider uppercase px-6 py-2 hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {submitting ? '添加中…' : '+ 添加预警'}
      </button>
    </form>
  );
}
