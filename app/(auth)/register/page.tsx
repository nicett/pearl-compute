'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

import { Button, Card, Input } from '@/app/components/ui';

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

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email: email || undefined }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || '注册失败');
      setSubmitting(false);
      return;
    }

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
    <Card padding="lg">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-primary">注册</h1>
        <p className="text-sm text-tertiary mt-1">免费创建账号，开始管理你的矿工</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="用户名"
          autoComplete="username"
          required
          minLength={3}
          maxLength={32}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          hint="3-32 字符，仅字母 / 数字 / _ / -"
        />

        <Input
          label="密码"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="至少 8 字符，含字母与数字"
        />

        <Input
          label="邮箱"
          labelHint="选填"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hint="用于找回密码（不验证邮箱）"
        />

        {error && (
          <div className="rounded-md bg-danger/10 border border-danger/20 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <Button type="submit" loading={submitting} fullWidth>
          注册并登录
        </Button>
      </form>

      <div className="border-t border-subtle mt-6 pt-4 text-center text-sm">
        <span className="text-tertiary">已有账号？</span>{' '}
        <Link href="/login" className="text-brand hover:text-brand-hover transition-colors font-medium">
          直接登录
        </Link>
      </div>
    </Card>
  );
}
