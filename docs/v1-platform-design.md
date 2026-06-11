# Pearl 一站式平台 v1 设计文档

> **状态**：设计文档草案 v0.1（2026-06-12）
> **范围**：在 `self-hosted` 分支基础上，从「纯计算器」演进为「PRL 矿工一站式平台」
> **当前分支**：self-hosted（commit `8c6479f`，Cloudflare 解耦 + 日志降噪已完成）
> **设计文档本身不实施**：实施按 Sprint 拆分，每个 Sprint 单独开计划

---

## Context

`pearl_compute` 当前是纯前端计算器：所有用户输入（GPU 数量、电价、矿池选择、价格源等）存在浏览器 `localStorage`，无后端、无用户、无持久状态。换浏览器即丢失配置。

用户希望演进为「一站式平台」：注册登录、配置云端同步、绑定钱包同步实时挖矿数据、价格预警，**v2 再做交易所 API 接入**（卖币提币，已书面告知极高安全 + 合规风险）。

预期规模 1000 用户、面向全球、部署在阿里云新加坡 ECS（1Panel 管理）。

---

## 决策汇总（已与用户对齐）

| 项 | 选择 | 备注 |
|---|---|---|
| 部署 | 阿里云新加坡 ECS + 1Panel + PM2 | self-hosted 分支已就绪 |
| 数据库 | **Supabase** (Postgres, ap-southeast-1) | 同区域低延迟；用 Postgres 本体，不依赖 Supabase 特有功能（Auth、Realtime、Storage 都不用） |
| ORM | **Prisma** | 类型生成、迁移管理 |
| 认证 | **Auth.js v5 (NextAuth)** + Credentials Provider（用户名 + 密码） | JWT session，不用 database session（避免每次请求都查库） |
| 密码哈希 | **Argon2id** | 比 bcrypt 现代，抗 GPU 破解 |
| 缓存 / 队列 | **Redis + BullMQ** | 复用现有 Redis；BullMQ 跑后台 worker |
| 邮件 | **Resend**（免费档 100 封/天，足够）| 注册验证、预警通知 |
| v1 范围 | 用户体系 + 配置同步 + 挖矿数据同步 + 价格预警 | 不做交易所接入 |
| v2 范围 | 交易所 API 接入（极高风险，必须显式免责） | v1 稳定运营 1-2 个月后启动 |

---

## 整体架构

```
                          ┌────────────────────────────────────────────┐
                          │            Browser (Next.js Client)         │
                          │  ─ React UI                                 │
                          │  ─ Auth.js client hooks                    │
                          │  ─ 计算 / 图表（本地，零变化）              │
                          └──────────────────┬─────────────────────────┘
                                             │ HTTPS
                          ┌──────────────────▼─────────────────────────┐
                          │     Next.js 14 App Router  (PM2:web)       │
                          │  ─ Route Handlers /api/**                  │
                          │  ─ Server Components                       │
                          │  ─ Auth.js server (sessions、middleware)   │
                          └──┬───────────┬───────────────┬─────────────┘
                             │           │               │
                ┌────────────▼──┐  ┌─────▼─────┐  ┌─────▼─────────┐
                │ Supabase      │  │  Redis    │  │ 外部 API       │
                │ Postgres      │  │ (1Panel)  │  │  ─ PRLScan     │
                │ (ap-se-1)     │  │  ─ 缓存   │  │  ─ SafeTrade   │
                │  ─ 用户       │  │  ─ 任务   │  │  ─ Pearl OTC   │
                │  ─ 配置       │  │    队列   │  │  ─ OKX         │
                │  ─ 挖矿历史   │  └─────▲─────┘  │  ─ 矿池 per-   │
                │  ─ 预警规则   │        │        │    miner API   │
                └────────▲──────┘        │        └────────▲───────┘
                         │               │                 │
                         │      ┌────────┴────────┐        │
                         └──────┤ BullMQ Worker   ├────────┘
                                │ (PM2:worker)    │
                                │  ─ 5min: 拉矿   │
                                │    池数据       │
                                │  ─ 30s: 价格    │
                                │    检查预警     │
                                │  ─ 队列: 发邮件 │
                                └─────────────────┘
```

**关键点**：

1. **两个 PM2 进程**：`web`（Next.js）和 `worker`（BullMQ worker）。共享代码库、共享 Redis、共享 Postgres，但 Worker 不监听 HTTP 端口
2. **Next.js 进程不跑后台任务**：避免 Vercel-style serverless 假设污染设计；worker 独立保证可水平扩展
3. **三类持久化**：Postgres 存业务状态；Redis 存缓存 + 任务队列；浏览器 localStorage 仅存「未登录访客的本地配置」作为降级
4. **现有 API 路由零侵入**：`/api/stats`、`/api/pools`、`/api/chart` 完全保留，无需登录即可访问（保持「访客也能用计算器」）

---

## 数据库 Schema（Prisma）

> 字段名遵循 Prisma 惯例：`camelCase`（自动 map 到 `snake_case` 列名）。`@db.Uuid` 用 Postgres 原生 UUID。

```prisma
// schema.prisma 草图

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")       // pooled (pgbouncer transaction mode), 用于 app
  directUrl = env("DIRECT_URL")          // direct connection, 用于 migrate
}

// ───────── 用户与会话 ─────────

model User {
  id            String    @id @default(uuid()) @db.Uuid
  username      String    @unique
  email         String?   @unique          // v1 选填，v2 接交易所时必填
  emailVerified DateTime?
  passwordHash  String                     // Argon2id
  locale        String    @default("en")   // 同步前端 pearl_locale
  theme         String    @default("system") // 同步前端 pearl_theme
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastLoginAt   DateTime?

  // 反向关系
  config      UserConfig?
  miners      MinerBinding[]
  alerts      AlertRule[]
  notifications Notification[]

  @@index([email])
}

// ───────── 计算器配置（一对一） ─────────

model UserConfig {
  userId            String  @id @db.Uuid
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  // 对应现有 7 个 miner_calc_* 字段 + 选中矿池 + 价格源
  gpuCount          Float   @default(1)
  cardPrice         Float   @default(2800)
  residualValue     Float   @default(2000)
  powerCons         Float   @default(150)
  gpuHashrate       Float   @default(70)
  poolFee           Float   @default(3)
  electricityPrice  Float   @default(0.7)
  selectedPoolSlug  String?
  priceSource       String  @default("Pearl OTC")
  currency          String  @default("USD")    // 显示币种

  updatedAt         DateTime @updatedAt
}

// ───────── 矿工绑定（一个用户可绑多个矿池×多个地址） ─────────

model MinerBinding {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @db.Uuid
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  poolSlug    String                            // 对应 /api/pools 返回的 slug
  walletAddr  String                            // 矿工标识（钱包地址 / worker name）
  label       String?                           // 用户自定义备注，例如「主机房 5 台」
  createdAt   DateTime @default(now())

  // 反向关系
  snapshots   MinerSnapshot[]

  @@unique([userId, poolSlug, walletAddr])      // 同一用户不能重复绑定
  @@index([poolSlug])                            // worker 按矿池批量拉取时用
}

// ───────── 挖矿数据快照（时序） ─────────

model MinerSnapshot {
  id               BigInt   @id @default(autoincrement())
  bindingId        String   @db.Uuid
  binding          MinerBinding @relation(fields: [bindingId], references: [id], onDelete: Cascade)

  snapshotAt       DateTime                       // worker 拉取时间
  hashrateHps      BigInt?                        // 当前算力
  balanceGrains    BigInt?                        // 未结算余额（最小单位）
  paid24hGrains    BigInt?                        // 24h 已派发
  workerCount      Int?                           // 在线 worker 数
  rawJson          Json                            // 原始响应（兜底，后续可解析新字段）

  @@index([bindingId, snapshotAt(sort: Desc)])    // 查最新 N 条；画时序图
}

// ───────── 价格预警 ─────────

model AlertRule {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @db.Uuid
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  type        AlertType                            // PRICE_ABOVE / PRICE_BELOW / SHUTDOWN_NEAR
  threshold   Float                                // 阈值
  priceSource String?                              // 限定数据源，null = 任意源命中即触发
  enabled     Boolean  @default(true)
  cooldownMin Int      @default(60)                 // 冷却分钟，避免反复触发
  lastFiredAt DateTime?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([enabled, type])
}

enum AlertType {
  PRICE_ABOVE       // 价格高于 threshold
  PRICE_BELOW       // 价格低于 threshold
  SHUTDOWN_NEAR     // 当前价距关机价低于 threshold% （需要 UserConfig 支撑）
}

// ───────── 通知记录 ─────────

model Notification {
  id          BigInt   @id @default(autoincrement())
  userId      String   @db.Uuid
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  channel     String                                // email / inapp
  subject     String
  body        String                                // 纯文本
  meta        Json?                                  // 触发上下文（哪条 alert、当时价格）
  readAt      DateTime?
  createdAt   DateTime @default(now())

  @@index([userId, createdAt(sort: Desc)])
}

// ───────── v2 预留：交易所凭据（暂不实现） ─────────

// model ExchangeCredential {
//   id                  String  @id @default(uuid()) @db.Uuid
//   userId              String  @db.Uuid
//   exchange            String                     // safetrade / okx
//   apiKey              String
//   apiSecretEncrypted  String                     // AES-256-GCM, key from KMS / env
//   permissions         String[]                   // ['read', 'trade', 'withdraw']
//   ipWhitelist         String[]
//   verifiedAt          DateTime?
//   disabledReason      String?
//   ...
// }
```

**索引说明**：
- `MinerSnapshot.[bindingId, snapshotAt DESC]`：前端"看最近 24h 收益曲线"会扫这个；worker 按 binding 写入只追加
- `MinerBinding.[poolSlug]`：worker 每 5 分钟"取所有绑定到 PoolFortune 的用户，批量调 API"
- `AlertRule.[enabled, type]`：worker 每 30s 取所有 enabled 规则，按 type 分组评估

**数据量预估**（1000 用户）：
- `MinerSnapshot` 是大头：1000 用户 × 平均 2 个绑定 × 288 次/天（5 分钟间隔）= 57.6 万行/天 ≈ 2 亿行/年
- 这超出 Supabase 免费档 500MB（一行 ~200B 估算 → 40GB/年）
- **缓解**：定时任务**降采样**（保留最近 7 天的 5min 粒度、最近 90 天的 1h 粒度、之外的 1day 粒度）。这个任务列在 v1.5 Sprint 里

---

## API 路由清单

### 现有（保留不动）

| 路由 | 方法 | 鉴权 | 说明 |
|---|---|---|---|
| `/api/stats` | GET | 公开 | 币价 + 网络算力（已有） |
| `/api/pools` | GET | 公开 | 矿池列表（已有） |
| `/api/chart` | GET | 公开 | K 线（已有） |

### 新增 — 认证（Auth.js v5 自动提供）

| 路由 | 方法 | 说明 |
|---|---|---|
| `/api/auth/[...nextauth]` | * | Auth.js v5 catch-all（signin/signout/callback/session/csrf） |
| `/api/auth/register` | POST | 自定义：用户名/密码注册（Auth.js 本身不管注册） |

### 新增 — 用户配置

| 路由 | 方法 | 鉴权 | 说明 |
|---|---|---|---|
| `/api/me/config` | GET | 必须 | 拉取当前用户的 UserConfig |
| `/api/me/config` | PUT | 必须 | 整体更新（前端 debounce 后整对象发送） |
| `/api/me/profile` | PATCH | 必须 | 改密码 / 邮箱 / locale / theme |

### 新增 — 矿工绑定

| 路由 | 方法 | 鉴权 | 说明 |
|---|---|---|---|
| `/api/me/miners` | GET | 必须 | 列出所有绑定 + 每个绑定最新一条 snapshot |
| `/api/me/miners` | POST | 必须 | 新增绑定（poolSlug + walletAddr + label） |
| `/api/me/miners/[id]` | DELETE | 必须 | 删除绑定（级联删 snapshots） |
| `/api/me/miners/[id]/history` | GET | 必须 | 时序数据（query: `?from=&to=&granularity=`） |

### 新增 — 预警

| 路由 | 方法 | 鉴权 | 说明 |
|---|---|---|---|
| `/api/me/alerts` | GET | 必须 | 列规则 |
| `/api/me/alerts` | POST | 必须 | 创建规则 |
| `/api/me/alerts/[id]` | PUT/DELETE | 必须 | 修改 / 删除 |
| `/api/me/notifications` | GET | 必须 | 列通知（paginated） |
| `/api/me/notifications/[id]/read` | POST | 必须 | 标记已读 |

---

## 关键流程

### 1. 注册流程

```
浏览器                  Next.js Route                 Postgres
   │ POST /api/auth/register     │                          │
   │ {username, password, email?}│                          │
   │──────────────────────────►  │                          │
   │                              │ 1. Zod 校验输入          │
   │                              │ 2. argon2.hash(password) │
   │                              │ 3. INSERT User           │
   │                              │──────────────────────────►│
   │                              │                          │
   │                              │ 4. INSERT UserConfig     │
   │                              │    (with defaults)       │
   │                              │──────────────────────────►│
   │                              │                          │
   │                              │ 5. 返回 { ok: true }     │
   │ ◄─────────────────────────  │                          │
   │                              │                          │
   │ POST /api/auth/callback/    │                          │
   │   credentials               │   (走 Auth.js 内置)       │
   │ 自动登录并 set JWT cookie    │                          │
```

要点：
- 密码字段在 Zod schema 里有 min(8) + 至少一个数字 + 至少一个字母校验
- 不返回密码错误细节（防枚举），统一 "用户名已存在或注册失败"
- 邮箱在 v1 是可选；v2 启用交易所时强制要求并验证

### 2. 登录态读取（Server Component）

```typescript
// app/(authenticated)/dashboard/page.tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  // 直接用 session.user.id 查数据
  ...
}
```

### 3. 计算器配置同步流程

**登录前**：和现在一样，走 localStorage（零变化）。

**登录后**：

```
[login 成功]
   │
   ▼
GET /api/me/config  ← Auth.js middleware 自动注入 session
   │
   ▼
{ gpuCount: 4, electricityPrice: 0.5, ... }
   │
   ▼
[前端 hydrate]
- 把云端配置写入 React state
- 把云端配置 also 写入 localStorage（保持离线降级可用）
- 设置 dirty=false

[用户改输入]
   │
   ▼
debounce 1.5s
   │
   ▼
PUT /api/me/config { ...完整对象 }
   │
   ▼
[前端] dirty=false, 显示「已保存」

[网络故障]
- 失败重试 3 次（指数退避）
- 仍失败：保留 dirty=true，下次成功时一并提交
- localStorage 继续写入（永不丢）
```

**为什么整对象 PUT 而不是 patch**：字段少（10 个）、整对象幂等、避免并发冲突复杂化。1000 用户的写入量微不足道。

### 4. 矿工数据同步流程（Worker）

```
PM2:worker 启动
   │
   ▼
注册定时任务: 每 5 分钟跑一次 "miner-sync"
   │
   ▼
每次触发：
  1. SELECT * FROM MinerBinding GROUP BY poolSlug
  2. 对每个矿池：
     - 取该矿池的 fetcher（lib/pools/<slug>.ts）
     - 并发调用（带速率限制：每矿池每秒 ≤ 5 个请求）
     - 对每个 binding：抓 hashrate/balance/paid24h
  3. 批量 INSERT 到 MinerSnapshot
  4. 记录任务耗时、失败数到 Redis（用于监控）

并发安全：
  - 用 BullMQ 的 unique job ID 防止重叠执行
  - 单个矿池请求 timeout = 8s，失败的 binding 直接跳过（rawJson 字段记错误）
```

### 5. 价格预警流程（Worker）

```
PM2:worker
   │
   ▼
每 30 秒：
  1. 内部调用 assembleStatsData() 拿最新价格（复用 app/lib/data-sources.ts，零侵入）
  2. SELECT * FROM AlertRule WHERE enabled = true
  3. 对每条规则：
     - 评估是否命中
     - 命中 且 (now - lastFiredAt) > cooldownMin → 触发
  4. 触发动作：
     - INSERT Notification
     - 入队 BullMQ "send-email" 任务
     - UPDATE AlertRule.lastFiredAt
  5. send-email worker 异步处理（重试 3 次）
```

---

## 目录结构调整

```
pearl_compute/
├─ app/
│  ├─ (public)/                          # 新：未登录可访问的路由组
│  │  └─ page.tsx                        # ← 现在的 page.tsx 移过来
│  ├─ (auth)/                            # 新：登录/注册路由组
│  │  ├─ login/page.tsx
│  │  └─ register/page.tsx
│  ├─ (authenticated)/                   # 新：需要登录的路由组
│  │  ├─ dashboard/page.tsx              # 总览
│  │  ├─ miners/page.tsx                 # 矿工绑定管理
│  │  ├─ alerts/page.tsx                 # 预警规则
│  │  └─ settings/page.tsx               # 账号设置
│  ├─ api/
│  │  ├─ stats/route.ts                  # 不动
│  │  ├─ pools/route.ts                  # 不动
│  │  ├─ chart/route.ts                  # 不动
│  │  ├─ auth/
│  │  │  ├─ [...nextauth]/route.ts       # 新：Auth.js catch-all
│  │  │  └─ register/route.ts            # 新
│  │  └─ me/
│  │     ├─ config/route.ts              # 新
│  │     ├─ profile/route.ts             # 新
│  │     ├─ miners/route.ts              # 新
│  │     ├─ miners/[id]/route.ts         # 新
│  │     ├─ miners/[id]/history/route.ts # 新
│  │     ├─ alerts/route.ts              # 新
│  │     ├─ alerts/[id]/route.ts         # 新
│  │     └─ notifications/route.ts       # 新
│  ├─ lib/
│  │  ├─ data-sources.ts                 # 不动
│  │  ├─ cache.ts                        # 不动
│  │  ├─ db.ts                           # 新：Prisma client 单例
│  │  ├─ password.ts                     # 新：argon2 包装
│  │  ├─ validators/                     # 新：Zod schemas
│  │  ├─ pools/                          # 新：每家矿池的 per-miner fetcher
│  │  │  ├─ index.ts                     # 注册表：slug → fetcher
│  │  │  ├─ pearlfortune.ts              # 占位（等用户给文档）
│  │  │  └─ ...
│  │  └─ jobs/                           # 新：BullMQ 任务定义
│  │     ├─ queue.ts                     # 队列实例
│  │     ├─ miner-sync.ts                # 拉矿池数据
│  │     ├─ alert-check.ts               # 预警评估
│  │     └─ send-email.ts                # 邮件发送
│  ├─ components/
│  │  ├─ ...（现有组件不动）
│  │  ├─ AuthGate.tsx                    # 新：登录前/后切换显示
│  │  └─ MinerBindingList.tsx            # 新
│  └─ middleware.ts                       # 新：Auth.js 中间件，保护 (authenticated) 路由组
├─ worker/                                 # 新：独立 worker 进程入口
│  └─ index.ts                            # PM2 启动它；注册所有 BullMQ workers
├─ prisma/
│  ├─ schema.prisma                       # 新
│  └─ migrations/                         # 新（git 跟踪）
├─ auth.ts                                  # 新：Auth.js v5 配置（providers, callbacks, session）
├─ ecosystem.config.js                     # 新：PM2 配置（web + worker）
├─ .env.example                            # 新
└─ ...（其他不动）
```

---

## 关键技术细节

### Auth.js v5 配置要点

```typescript
// auth.ts 草图
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/app/lib/db'
import { verifyPassword } from '@/app/lib/password'

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },         // 不走 database session
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      async authorize(c) {
        const user = await prisma.user.findUnique({ where: { username: c.username } })
        if (!user || !(await verifyPassword(c.password, user.passwordHash))) return null
        return { id: user.id, name: user.username, email: user.email }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.uid = user.id
      return token
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string
      return session
    },
  },
  pages: { signIn: '/login' },
})
```

**关键决策**：
- **JWT session**：免去每次请求查库；缺点是登出后旧 JWT 仍能用到过期。配 7 天过期 + 改密码时让用户主动登出所有设备（v1.5 加）
- **不用 Prisma adapter**：Credentials Provider 配 JWT 不需要 session 表，没必要引入 adapter 的复杂度
- **middleware 保护**：`(authenticated)/*` 路由统一在 `middleware.ts` 检查 session，未登录 redirect 到 `/login?from=...`

### Prisma + Supabase 连接

Supabase 提供 3 种连接：
- **Direct** (5432)：直连 Postgres，迁移用
- **Session Mode** (6543, port-X)：兼容性最好，但每个 Prisma client 占连接
- **Transaction Mode** (6543)：PgBouncer transaction pooling，**Prisma 必须加 `?pgbouncer=true&connection_limit=1`**

```env
# .env
DATABASE_URL="postgres://...@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgres://...@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

`schema.prisma` 里同时声明 `url` 和 `directUrl`（如上 schema 草图所示）。`prisma migrate` 走 `directUrl`，app 走 `url`。

### Prisma client 单例（Next.js dev 热重载坑）

```typescript
// app/lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ['warn', 'error'] })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### Argon2 参数

```typescript
// app/lib/password.ts
import argon2 from 'argon2'

const OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16,    // 64 MB
  timeCost: 3,
  parallelism: 1,
}

export const hashPassword = (p: string) => argon2.hash(p, OPTIONS)
export const verifyPassword = (p: string, hash: string) => argon2.verify(hash, p)
```

64MB × 1000 用户 ≈ 单次哈希 ~80ms，足够安全 + 服务器扛得住。

### BullMQ + PM2 两进程模式

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'pearl-web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      env: { PORT: 3000, NODE_ENV: 'production' },
    },
    {
      name: 'pearl-worker',
      script: 'worker/index.js',          // tsc 编译后的产物
      env: { NODE_ENV: 'production' },
      instances: 1,                        // worker 单实例，避免重复任务
    },
  ],
}
```

Worker 启动脚本注册所有 BullMQ workers + repeat job：

```typescript
// worker/index.ts
import { Worker, Queue } from 'bullmq'

const conn = { host: '127.0.0.1', port: 6379 }
const minerSyncQueue = new Queue('miner-sync', { connection: conn })

await minerSyncQueue.add('tick', {}, {
  repeat: { every: 5 * 60_000 },      // 每 5 分钟
  jobId: 'miner-sync-repeat',          // 唯一，防重复
})

new Worker('miner-sync', async () => { /* ... */ }, { connection: conn, concurrency: 1 })
// 同理：alert-check, send-email
```

### 矿池 per-miner 适配器模式

每家矿池 API 格式不同，统一抽象：

```typescript
// app/lib/pools/index.ts
export interface MinerFetcher {
  slug: string
  fetch(walletAddr: string): Promise<MinerSnapshotData>
}

export interface MinerSnapshotData {
  hashrateHps?: bigint
  balanceGrains?: bigint
  paid24hGrains?: bigint
  workerCount?: number
  rawJson: unknown
}

const REGISTRY: Record<string, MinerFetcher> = {}
export function register(f: MinerFetcher) { REGISTRY[f.slug] = f }
export function getFetcher(slug: string) { return REGISTRY[slug] }
```

每家矿池一个文件实现 `MinerFetcher`，在 `index.ts` 顶部 import 时自动注册。Sprint 1 先实现 1-2 家（等用户给文档）。

---

## v1 Sprint 拆分

每个 Sprint 是一次独立计划 + 实施 + 验证 + 提交。

### Sprint 1：基础设施 + 注册登录（最大块，约 2-3 天）

1. 装依赖：`prisma @prisma/client next-auth@beta argon2 zod bullmq`
2. 配 `.env.example`，本地开发用 `.env.local`（Supabase 免费实例）
3. `prisma init` + 写 schema + `prisma migrate dev`
4. `app/lib/db.ts`、`app/lib/password.ts`、`app/lib/validators/`
5. `auth.ts` + `app/api/auth/[...nextauth]/route.ts`
6. `app/api/auth/register/route.ts`
7. `app/(auth)/login/page.tsx` + `app/(auth)/register/page.tsx`（最简表单 UI）
8. `middleware.ts` 保护 `/dashboard` 雏形
9. 单测：password.ts、register 接口

**验证标准**：本地能注册 → 登出 → 登录 → 看到一个空 dashboard 页

### Sprint 2：配置云端同步（约 1-2 天）

1. `/api/me/config` GET/PUT
2. 改造 `useLocalStorage.ts` → `useSyncedConfig.ts`：登录后走云端，未登录走 localStorage
3. dashboard 集成计算器组件（直接复用 MinerCalculator）
4. 单测 + 端到端验证

**验证标准**：登录后改电价 → 刷新 → 值还在；登出后 → 看到默认值（不再读云端）

### Sprint 3：矿工绑定 + 后台同步（约 3-4 天）

1. 用户给的第一家矿池：实现 `MinerFetcher`
2. PM2 worker 进程脚手架 + `worker/index.ts`
3. miner-sync repeat job
4. `/api/me/miners` CRUD + history
5. UI：绑定列表 + 添加表单 + 简单趋势图
6. 端到端：注册 → 绑定 → 等 5 分钟 → 看到第一条 snapshot

**验证标准**：本地起 web + worker，能看到自己绑定的矿工实时数据

### Sprint 4：价格预警（约 2-3 天）

1. AlertRule CRUD
2. alert-check repeat job
3. Resend 邮件接入
4. send-email worker
5. UI：alerts 页面 + notifications 下拉
6. 端到端：建一条「PRL > $1.0」规则 → mock 价格触发 → 收到邮件 + 站内通知

**验证标准**：能收到测试预警邮件，cooldown 生效

### v1.5（可选，看用户反馈）

- MinerSnapshot 降采样任务（防数据库爆炸）
- 改密码 / 找回密码
- 多语言登录页
- API 限流（防注册爆破）

---

## 安全注意事项专章

1. **密码哈希**：Argon2id 强制 64MB 内存成本；绝不接受明文密码（前端也走 HTTPS POST，不做客户端哈希）
2. **SQL 注入**：Prisma 全参数化，零拼字符串
3. **CSRF**：Auth.js v5 内置（POST 走 form CSRF token）；自定义的 `/api/me/*` 全走 JSON + Same-Origin 默认拒绝跨域
4. **会话固定**：JWT secret 通过 `AUTH_SECRET` 环境变量；定期轮换（v1.5 加文档）
5. **密码强度**：Zod 强制 min(8) + 大小写数字混合
6. **注册速率**：v1.5 加 IP 维度的注册限流（5 次/小时）
7. **错误信息**：登录失败统一 "用户名或密码错误"，注册时不暴露邮箱/用户名是否已存在
8. **HTTPS only**：cookie 标 `secure` + `httpOnly` + `sameSite=lax`
9. **依赖**：定期 `npm audit`，CI 加 dependabot
10. **日志脱敏**：worker 抓矿池数据时绝不打印 walletAddr 全文（mask: `0xABC***XYZ`）

**v2 启用交易所接入前必须额外做的**（已在 v2 中标注，此处提示，避免遗忘）：
- API Secret AES-256-GCM 加密（key 在环境变量，绝不入库）
- 每次调用前校验 IP 白名单（Cloudflare egress IP 列表）
- 提币必须二次确认（邮箱验证码 + 30 秒延时）
- 每笔操作写审计日志（不可篡改，append-only）
- 用户协议明确免责，注册时必须显式勾选

---

## 风险与未决事项

| 风险 | 影响 | 缓解 |
|---|---|---|
| Supabase 免费档限制（500MB / 5GB 流量 / 项目 7 天无活动暂停） | 1000 用户 + 高频 snapshot 会超 | v1.5 降采样；监控用量；准备付费档预算 ($25/月) |
| 矿池 API 不稳定 / 限流 / 改字段 | snapshot 拉失败 | 每个 fetcher 独立 try-catch；rawJson 兜底；监控失败率 |
| BullMQ + Redis 单点 | Redis 挂 → 后台任务全停 | 1Panel 装 Redis 持久化（RDB）；任务定义幂等可重放 |
| PM2 worker 进程崩溃 | 后台任务停 | PM2 自动重启；BullMQ stuck job 自动 retry |
| 用户密码丢失 | 找不回 | v1.5 加邮箱找回密码流程；现在先文档提示「邮箱选填，但建议填，否则忘密码无法找回」 |
| 单进程不能水平扩展 | 流量上来撑不住 | 1000 用户不会到这一步；v2 再考虑 |

**未决等用户输入**：
- 矿池 per-miner API 文档（用户答应整理后给）
- Resend / Brevo 哪个（v1 实现时再确认；接口几乎一样，到时 5 分钟切换）
- 第一个 Sprint 启动时间

---

## 验证（本设计文档本身的）

设计文档不需要"测试"，但开始 Sprint 1 之前必须确认：

1. ✅ 用户对 Schema 满意（特别是字段命名、AlertType 枚举值、要不要现在加 ExchangeCredential 占位）
2. ✅ 用户对目录结构没意见（特别是路由组划分、`worker/` 顶层目录的位置）
3. ✅ 用户已注册 Supabase 账号，并能给我一个 ap-southeast-1 项目的 connection string（可以是测试项目）
4. ✅ 用户给出至少 1 家矿池的 per-miner API 文档

---

## 不在 v1 范围内（明确排除）

- 交易所 API 接入（v2）
- 实时挖矿数据 WebSocket 推送（v2，初期用前端轮询即可）
- 移动 App（前端响应式已够用）
- 国际化扩展到日韩越语等（v1 仅中英）
- 社交 / 评论 / 邀请码（不在产品定位内）
- 付费会员（用户明确说 v1 免费）
- OAuth 第三方登录（Google / Apple）（v2 视用户反馈加）
- Web3 钱包登录（用户明确 PRL 暂无成熟钱包，搁置）

---

## 下一步

1. 用户审本文档（重点：Schema、Sprint 拆分、Resend 是否同意）
2. 用户提供：
   - Supabase 项目 connection string（或确认我帮你建一个）
   - 至少 1 家矿池的 per-miner API 文档
3. 同意后开 Sprint 1 的独立计划，开始实施

> 文档版本：v0.1 (2026-06-12)
> 后续修订记录在本文件顶部
