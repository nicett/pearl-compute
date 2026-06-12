'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get('from') || '/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError('用户名或密码错误');
      setSubmitting(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <>
      <h1 className="text-lg font-semibold tracking-[0.2em] uppercase text-foreground mb-6">
        登录
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-muted tracking-wider uppercase mb-1.5 block">
            用户名
          </label>
          <input
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-surface-dark border border-edge px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div>
          <label className="text-xs text-muted tracking-wider uppercase mb-1.5 block">
            密码
          </label>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-surface-dark border border-edge px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {error && (
          <div className="text-xs text-red-400 border border-red-500/30 bg-red-500/5 px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-accent text-surface-dark text-sm font-bold tracking-wider uppercase py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? '登录中…' : '登录'}
        </button>
      </form>

      <div className="border-t border-edge mt-6 pt-4 text-center">
        <Link
          href="/register"
          className="text-xs text-muted tracking-wider uppercase hover:text-accent transition-colors"
        >
          没有账号？注册 →
        </Link>
      </div>
    </>
  );
}
