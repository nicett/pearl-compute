'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

import { Button, Card, Input } from '@/app/components/ui';

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
    <Card padding="lg">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-primary">登录</h1>
        <p className="text-sm text-tertiary mt-1">欢迎回来，继续你的算力管理</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="用户名"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <Input
          label="密码"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <div className="rounded-md bg-danger/10 border border-danger/20 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <Button type="submit" loading={submitting} fullWidth>
          登录
        </Button>
      </form>

      <div className="border-t border-subtle mt-6 pt-4 text-center text-sm">
        <span className="text-tertiary">还没有账号？</span>{' '}
        <Link href="/register" className="text-brand hover:text-brand-hover transition-colors font-medium">
          立即注册
        </Link>
      </div>
    </Card>
  );
}
