/**
 * UI 组件预览页（仅本地开发用）
 * 访问 http://localhost:3000/ui-preview 查看所有 shadcn 组件
 */
'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Pickaxe,
  ExternalLink,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Metric } from '@/components/ui/metric';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/app/theme/context';

export default function UiPreviewPage() {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [demoSelect, setDemoSelect] = useState('opt-1');

  return (
    <div className="min-h-screen bg-background text-foreground p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">UI 组件预览（shadcn）</h1>
            <p className="text-sm text-muted-foreground mt-1">
              当前主题：<span className="text-primary font-mono">{resolvedTheme}</span>
            </p>
            <div className="flex flex-wrap gap-3 mt-3 text-sm">
              <Link href="/" className="text-primary hover:underline">
                ← 首页（旧风）
              </Link>
              <Link href="/login" className="text-primary hover:underline">
                登录页
              </Link>
              <Link href="/register" className="text-primary hover:underline">
                注册页
              </Link>
              <Link href="/miners" className="text-primary hover:underline">
                矿工页（需登录）
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <button
              onClick={() => setTheme('light')}
              title="浅色"
              className={cnButton(theme === 'light')}
            >
              <Sun className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              title="深色"
              className={cnButton(theme === 'dark')}
            >
              <Moon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setTheme('system')}
              title="跟随系统"
              className={cnButton(theme === 'system')}
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        <Section title="Button">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button>
              <Plus />
              添加
            </Button>
            <Button variant="destructive">
              <Trash2 />
              删除
            </Button>
            <Button disabled>Disabled</Button>
            <Button size="icon" variant="outline">
              <Pickaxe />
            </Button>
          </div>
        </Section>

        <Section title="Form (Input + Label + Select)">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="demo-username">用户名</Label>
                  <Input id="demo-username" placeholder="请输入" />
                  <p className="text-xs text-muted-foreground">3-32 字符</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-password">密码</Label>
                  <Input id="demo-password" type="password" placeholder="••••••" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-pool">矿池</Label>
                  <Select value={demoSelect} onValueChange={setDemoSelect}>
                    <SelectTrigger id="demo-pool">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opt-1">HeroMiners (PRL)</SelectItem>
                      <SelectItem value="opt-2">PoolFortune</SelectItem>
                      <SelectItem value="opt-3">PearlHash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="demo-wallet">钱包地址</Label>
                  <Input id="demo-wallet" className="font-mono" placeholder="prl1..." />
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section title="Badge">
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
          </div>
        </Section>

        <Section title="Card">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>简单卡片</CardTitle>
                <CardDescription>带标题和描述</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">这是 shadcn 标准 Card 复合组件结构。</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>带操作按钮</CardTitle>
                    <CardDescription>右上角放 action</CardDescription>
                  </div>
                  <Button size="sm">
                    <Plus />
                    添加
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">action 按钮放在 header 内自由排版</p>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section title="Metric（业务组件）">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Metric label="算力" value="295.5 KH/s" />
            <Metric label="未结算" value="1.27 PRL" tone="primary" hint="≈ $0.66" />
            <Metric label="24h 收益" value="2.71 PRL" tone="success" trend="up" trendValue="+12.5%" />
            <Metric label="状态" value="离线" tone="destructive" />
          </div>
        </Section>

        <Section title="Skeleton">
          <Card>
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-3 items-center">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section title="组合示例">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-success/10 p-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">同步成功</span>
                    <Badge variant="success">online</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    最近 5 分钟拉取了 1 个 binding，0 失败
                  </p>
                  <a href="#" className="text-primary inline-flex items-center gap-1 hover:underline text-xs mt-3">
                    查看详情 <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-destructive/10 p-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium">连接失败</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    herominers 上游 504 — 将在下次 tick 自动重试
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function cnButton(active: boolean): string {
  return [
    'flex h-7 w-7 items-center justify-center rounded-sm transition-colors',
    active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground',
  ].join(' ');
}
