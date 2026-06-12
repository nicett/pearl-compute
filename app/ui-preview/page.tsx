/**
 * UI 组件预览页（仅本地开发用，不进入正式导航）
 *
 * 访问 http://localhost:3000/_ui-preview 查看所有原子组件的 dark / light 表现
 */
'use client';

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
} from 'lucide-react';

import { Button, Input, Card, Badge, Metric, Select, Skeleton } from '@/app/components/ui';
import { useTheme } from '@/app/theme/context';

export default function UiPreviewPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [demoInput, setDemoInput] = useState('');
  const [demoSelect, setDemoSelect] = useState('option-1');

  return (
    <div className="min-h-screen bg-base text-primary p-6 sm:p-10">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">UI 组件预览</h1>
            <p className="text-sm text-tertiary mt-1">
              当前主题：<span className="text-brand font-mono">{resolvedTheme}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={resolvedTheme === 'light' ? 'primary' : 'secondary'}
              size="sm"
              leftIcon={<Sun className="h-4 w-4" />}
              onClick={() => setTheme('light')}
            >
              Light
            </Button>
            <Button
              variant={resolvedTheme === 'dark' ? 'primary' : 'secondary'}
              size="sm"
              leftIcon={<Moon className="h-4 w-4" />}
              onClick={() => setTheme('dark')}
            >
              Dark
            </Button>
          </div>
        </header>

        {/* Buttons */}
        <Section title="Button">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Add</Button>
            <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />}>
              Delete
            </Button>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        {/* Inputs */}
        <Section title="Input / Select">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="用户名"
              placeholder="请输入"
              value={demoInput}
              onChange={(e) => setDemoInput(e.target.value)}
              hint="3-32 字符"
            />
            <Input
              label="密码"
              type="password"
              placeholder="••••••••"
              error="密码必须含字母与数字"
            />
            <Input label="备注" labelHint="选填" placeholder="例如：主机房" />
            <Select
              label="矿池"
              value={demoSelect}
              onChange={(e) => setDemoSelect(e.target.value)}
            >
              <option value="option-1">HeroMiners (PRL)</option>
              <option value="option-2">Pool Fortune</option>
              <option value="option-3">PearlHash</option>
            </Select>
          </div>
        </Section>

        {/* Badges */}
        <Section title="Badge">
          <div className="flex flex-wrap gap-3">
            <Badge>默认</Badge>
            <Badge variant="brand">紫色</Badge>
            <Badge variant="success" dot>
              在线
            </Badge>
            <Badge variant="danger" dot>
              离线
            </Badge>
            <Badge variant="warning">警告</Badge>
          </div>
        </Section>

        {/* Cards */}
        <Section title="Card">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="无 actions" subtitle="一个简单的标题 + 副标题">
              <p className="text-sm text-secondary">
                卡片内容。背景色 / 边框 / 圆角都来自 token，可以直接换主题。
              </p>
            </Card>
            <Card
              title="有 actions"
              subtitle="右上角放按钮"
              actions={
                <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  添加
                </Button>
              }
            >
              <p className="text-sm text-secondary">含右侧操作按钮的卡片头。</p>
            </Card>
            <Card padding="lg" interactive>
              <div className="flex items-center gap-3">
                <Pickaxe className="h-5 w-5 text-brand" />
                <span className="text-sm">可点击卡片（hover 边框变深）</span>
              </div>
            </Card>
            <Card padding="none">
              <div className="px-4 py-3 border-b border-subtle text-sm font-medium">
                自定义内边距
              </div>
              <div className="p-6 text-sm text-secondary">padding=none 时手动控制</div>
            </Card>
          </div>
        </Section>

        {/* Metrics */}
        <Section title="Metric">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Metric label="算力" value="295.5 KH/s" />
            <Metric label="未结算" value="1.27 PRL" tone="brand" hint="≈ $0.66" />
            <Metric label="24h 收益" value="2.71 PRL" tone="success" trend="up" trendValue="+12.5%" />
            <Metric label="状态" value="离线" tone="danger" />
          </div>
        </Section>

        {/* Skeleton */}
        <Section title="Skeleton">
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-3">
              <Skeleton variant="circle" className="h-12 w-12" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          </div>
        </Section>

        {/* Status combos */}
        <Section title="组合示例">
          <Card>
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-success/10 p-2">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">同步成功</span>
                  <Badge variant="success" dot>
                    online
                  </Badge>
                </div>
                <p className="text-xs text-tertiary">
                  最近 5 分钟拉取了 1 个 binding，0 失败
                </p>
                <div className="flex items-center gap-3 mt-3 text-xs">
                  <a href="#" className="text-brand inline-flex items-center gap-1 hover:underline">
                    查看详情 <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-danger/10 p-2">
                <AlertCircle className="h-5 w-5 text-danger" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">连接失败</span>
                <p className="text-xs text-tertiary mt-1">
                  herominers 上游 504 — 将在下次 tick 自动重试
                </p>
              </div>
            </div>
          </Card>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-tertiary uppercase tracking-wider">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
