'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // 1. 调注册接口
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
        email: email || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || '注册失败');
      setSubmitting(false);
      return;
    }

    // 2. 注册成功后立即用同一份凭据登录
    const signInRes = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    if (signInRes?.error) {
      setError('注册成功但自动登录失败，请手动登录');
      setSubmitting(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <>
      <h1 className="text-lg font-semibold tracking-[0.2em] uppercase text-foreground mb-6">
        注册
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
            minLength={3}
            maxLength={32}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-surface-dark border border-edge px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent transition-colors"
          />
          <div className="text-[10px] text-muted/60 mt-1">
            3-32 字符，仅字母 / 数字 / _ / -
          </div>
        </div>

        <div>
          <label className="text-xs text-muted tracking-wider uppercase mb-1.5 block">
            密码
          </label>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-surface-dark border border-edge px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent transition-colors"
          />
          <div className="text-[10px] text-muted/60 mt-1">
            至少 8 字符，含字母与数字
          </div>
        </div>

        <div>
          <label className="text-xs text-muted tracking-wider uppercase mb-1.5 block">
            邮箱 <span className="text-muted/50 normal-case">(选填)</span>
          </label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-surface-dark border border-edge px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent transition-colors"
          />
          <div className="text-[10px] text-muted/60 mt-1">
            用于接收预警通知与找回密码
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
          className="w-full bg-accent text-surface-dark text-sm font-bold tracking-wider uppercase py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {submitting ? '处理中…' : '注册并登录'}
        </button>
      </form>

      <div className="border-t border-edge mt-6 pt-4 text-center">
        <Link
          href="/login"
          className="text-xs text-muted tracking-wider uppercase hover:text-accent transition-colors"
        >
          已有账号？登录 →
        </Link>
      </div>
    </>
  );
}
