# Pearl Compute — PRL 矿工一站式平台

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)](https://www.prisma.io/)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-latest-000)](https://ui.shadcn.com/)

珍珠链（PRL）矿工的一站式工具：收益计算器、实时挖矿数据、行情盘口。

> **分支**：`self-hosted`，面向 Node.js 自托管部署（如阿里云 ECS）。
> Cloudflare Pages 版本停留在 `master`，仅含纯计算器（无用户体系）。

---

## ✨ 功能

### 公开（无需登录）

- 💰 **多源币价聚合**：Pearl OTC（成交价）、SafeTrade（USDT 行情）、OKX Web3，自动失败降级
- 🧮 **收益计算器**：日收益、回本天数、关机价、年化 ROI、安全边际（mathjs BigNumber 避免浮点误差）
- 📊 **K 线图表**：SafeTrade 数据源，15 分钟周期，过去 24 小时
- 🏊 **矿池信息**：从 PRLScan 抓取的实时矿池算力、出块、收益率
- 🌓 **国际化与主题**：中/英双语 + 明暗主题切换

### 登录后

- 🔐 **账号体系**：用户名/密码注册（Argon2id 哈希）、JWT session、路由保护
- ☁️ **配置云端同步**：计算器参数跨设备保留，登出/换浏览器不丢
- ⛏️ **矿工绑定与监控**：绑定 HeroMiners 矿池 + 钱包地址，每 5 分钟后台同步算力 / 余额 / 收益，前端 10 秒刷新展示，按 worker 维度分行
- 📈 **专业行情页**：
  - 蜡烛图，**7 个周期** (1m / 5m / 15m / 1h / 4h / 1d / 1w)，绿涨红跌
  - 成交量副图（与主图共用时间轴）
  - 实时订单簿（asks / bids 左右分列，深度阶梯条），**5 秒刷新**
  - 最近成交流水，每 5 秒滚动
- 📚 **历史降采样**：超过 7 天的 snapshot 每小时只保留 1 条，超过 90 天自动删除（防数据库爆炸）

---

## 🏗 架构

```
浏览器
  │ HTTPS
  ▼
┌─────────────────────────────────────┐
│ Next.js 14 (App Router, PM2:web)    │
│  • Auth.js v5 (JWT session)         │
│  • Server Components                 │
│  • Route Handlers /api/**           │
└─────┬─────────┬──────────┬──────────┘
      │         │          │
      ▼         ▼          ▼
┌──────────┐ ┌──────┐ ┌──────────────────┐
│PostgreSQL│ │Redis │ │ 外部数据源        │
│ • User   │ │•缓存│ │ • Pearl OTC      │
│ • Config │ │•队列│ │ • SafeTrade      │
│ • Miner  │ └──────┘ │ • PRLScan        │
│ • Snap…  │    ▲      │ • HeroMiners     │
└──────────┘    │      │ • OKX            │
      ▲         │      └──────────────────┘
      │  ┌──────┴──────────────────────┐         ▲
      └──┤ BullMQ Worker (PM2:worker)  ├─────────┘
         │ • miner-sync       5 min    │
         │ • market-sync      5 sec    │
         │ • kline-sync       60 sec   │
         │ • snapshot-prune   24 h     │
         └─────────────────────────────┘
```

**两个 PM2 进程**：`web`（Next.js）和 `worker`（BullMQ 后台任务），共享 Redis + Postgres。

---

## 🚀 快速开始

### 前置条件

| 服务 | 用途 |
|---|---|
| Node.js 20 LTS | 运行时 |
| PostgreSQL 16 | 用户 / 配置 / 矿工历史数据 |
| Redis 7+ | 缓存 + BullMQ 任务队列 |

> 推荐用 Docker 起 PG + Redis，两条 `docker run` 即可。开发期可指向局域网内一台机器。

### 安装

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env`（**Prisma CLI / worker 都读 `.env`**）和 `.env.local`（**Next.js dev 读 `.env.local`**）：

```env
DATABASE_URL="postgresql://pearl:pwd@host:5432/pearl_compute?schema=public"
DIRECT_URL="postgresql://pearl:pwd@host:5432/pearl_compute?schema=public"
REDIS_URL="redis://host:6379"
AUTH_SECRET="..."  # openssl rand -base64 32
```

### 数据库初始化

```bash
npx prisma migrate deploy   # 生产
# 或者本地开发：
npx prisma migrate dev
```

### 启动

需要**两个进程**：

```bash
# Terminal 1 — Web (Next.js)
npm run dev          # 开发模式，http://localhost:3000
# 或生产：
npm run build && npm start

# Terminal 2 — Worker (BullMQ)
npm run worker       # tsx 直跑（开发）
# 或生产：
npm run worker:build && npm run worker:start
```

### 测试

```bash
npm test           # Jest 80 个单测
npm run test:watch
```

---

## 🗂 项目结构

```
.
├── app/                              # Next.js App Router
│   ├── (auth)/                       # 登录 / 注册（公开）
│   ├── (authenticated)/              # 需登录路由组
│   │   ├── dashboard/                # 计算器（带 AppShell）
│   │   ├── miners/                   # 矿工绑定与展示
│   │   └── market/                   # 行情页（K 线 + 订单簿 + 成交流）
│   ├── api/
│   │   ├── auth/                     # Auth.js + 注册接口
│   │   ├── chart/                    # K 线（按 ?period=N 参数）
│   │   ├── stats/ pools/             # 既有公开接口
│   │   ├── market/snapshot/          # 行情快照（仅读 Redis）
│   │   └── me/                       # 用户私有：config, miners
│   ├── components/
│   │   ├── layout/                   # AppShell / UserMenu
│   │   ├── market/                   # CandlestickChart, OrderBook, TradeFeed, ...
│   │   ├── miners/                   # MinerCard, AddMinerForm, ...
│   │   └── (计算器子组件)             # MetricsRow, ResultHero, ShutdownGauge, ...
│   ├── hooks/                        # useMiningCalculator, useSyncedConfig, ...
│   ├── lib/
│   │   ├── data-sources.ts           # 上游 fetcher（OTC / SafeTrade / OKX / 节点）
│   │   ├── cache.ts                  # 通用 Redis 缓存
│   │   ├── market-cache.ts           # 行情专用 Redis 读写
│   │   ├── pools/                    # 矿池适配器（herominers）
│   │   ├── validators/               # Zod schemas
│   │   ├── db.ts                     # Prisma 单例
│   │   └── password.ts               # Argon2id 包装
│   ├── i18n/ theme/                  # 国际化 / 主题（context）
│   ├── math.ts utils.ts types.ts     # 计算 / 工具 / 类型
│   └── globals.css                   # shadcn token + 双主题 CSS 变量
├── components/ui/                    # shadcn 标准组件（button/card/input/select/...）
├── lib/utils.ts                      # cn() 工具
├── prisma/
│   ├── schema.prisma                 # User / UserConfig / MinerBinding /
│   │                                 # MinerSnapshot / AlertRule / Notification
│   └── migrations/                   # 已应用的迁移
├── worker/
│   ├── index.ts                      # 进程入口（注册所有 repeat job）
│   ├── jobs/
│   │   ├── miner-sync.ts             # 5 min: 拉用户绑定的矿工数据
│   │   ├── market-sync.ts            # 5 s: 拉 SafeTrade depth/trades/ticker
│   │   ├── kline-sync.ts             # 60 s: 拉 7 个周期 K 线
│   │   └── snapshot-prune.ts         # 24 h: 历史降采样
│   └── lib/redis.ts                  # BullMQ 连接配置
├── auth.ts auth.config.ts            # Auth.js v5 配置（Edge / Node 拆分）
├── middleware.ts                     # 路由级鉴权
├── docs/                             # 设计文档（v1-platform-design.md 等）
└── __tests__/                        # Jest 单测（math 100% 覆盖）
```

---

## 🌐 数据源

| 数据 | 来源 | 频率 | 缓存 |
|---|---|---|---|
| PRL 实时价格 | Pearl OTC + SafeTrade + OKX | 用户进页 | Redis 20s |
| 全网算力 / 出块 | PRLScan API | 用户进页 | Redis 20s |
| 矿池列表 | PRLScan API | 用户进页 | Redis 60s |
| 用户矿工数据 | HeroMiners `stats_address` | worker 5min | Postgres 时序表 |
| 行情订单簿 / 成交 | SafeTrade depth / trades | worker 5s | Redis 30s |
| K 线 7 周期 | SafeTrade k-line | worker 60s | Redis 10min |

---

## 🔧 技术栈

- **框架**：Next.js 14（App Router）+ TypeScript 5
- **样式**：Tailwind CSS 3 + shadcn/ui（Radix 原语）+ Inter 字体
- **认证**：Auth.js v5（NextAuth）+ Argon2id
- **数据库**：PostgreSQL 16 + Prisma 6
- **缓存 & 队列**：Redis 7 + BullMQ
- **图表**：lightweight-charts 5（K 线 / 蜡烛 / 成交量）+ Chart.js 4（饼图 / 柱状）
- **数值**：mathjs（BigNumber）
- **测试**：Jest 30 + React Testing Library
- **部署**：Node.js 自托管 + PM2

---

## 📦 部署生产

详细部署文档暂未编写，关键要点：

1. **服务器**：1 台 Linux（推荐 2 vCPU + 4GB RAM 起步），跑 web + worker 两个 PM2 进程
2. **数据库**：本地 PG 或托管（Supabase 同区域 ap-southeast-1 推荐）
3. **Redis**：本地或托管，需启用持久化（RDB + AOF）
4. **反向代理**：Nginx 转 80/443 → 3000；记得加 WS upgrade（虽然目前不用）
5. **环境变量**：上面 4 个必填；`AUTH_SECRET` 必须强随机
6. **数据库迁移**：`npx prisma migrate deploy`（不要用 `migrate dev`）
7. **PM2 配置**：`pm2 start npm --name pearl-web -- start` 和 `pm2 start npm --name pearl-worker -- run worker:start`，**记得 `pm2 save && pm2 startup`** 让重启自动恢复

---

## 📄 License

私有项目。
