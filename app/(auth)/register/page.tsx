'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">注册</CardTitle>
        <CardDescription>免费创建账号，开始管理你的矿工</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              autoComplete="username"
              required
              minLength={3}
              maxLength={32}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">3-32 字符，仅字母 / 数字 / _ / -</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">至少 8 字符，含字母与数字</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              邮箱
              <span className="text-muted-foreground font-normal ml-1">(选填)</span>
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">用于找回密码（不验证邮箱）</p>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? '处理中…' : '注册并登录'}
          </Button>
        </form>

        <div className="border-t mt-6 pt-4 text-center text-sm">
          <span className="text-muted-foreground">已有账号？</span>{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            直接登录
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
