# 珍珠链算力计算器 (Pearl Compute)

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-orange)](https://pages.cloudflare.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)

珍珠链（PRL）矿工收益与回本计算器。支持实时币价、全网算力、矿池切换、关机价、K 线图等功能。基于 Next.js 14 App Router + Cloudflare Pages Edge Runtime 构建。

## ✨ 功能

- 💰 **多源币价聚合**：Pearl OTC（成交价）、SafeTrade（USDT 市场）、OKX Web3（外部市场），自动失败降级
- ⛏️ **矿池数据**：从 PRLScan 抓取实时矿池算力、出块、收益率
- 📊 **K 线图表**：基于 SafeTrade 历史数据，15 分钟周期，覆盖近 25 小时
- 🧮 **金融计算**：日收益、回本天数、关机价、年化 ROI、安全边际（mathjs BigNumber 避免浮点误差）
- 🌓 **国际化与主题**：中/英双语 + 明暗主题切换，配置持久化到 localStorage
- 📱 **响应式 UI**：移动端适配，防横向滚动

## 🚀 快速开始

### 本地开发

```bash
npm install
npm run dev        # http://localhost:3000
```

### 测试

```bash
npm test           # 运行 Jest 单元测试
npm run test:watch # 监听模式
```

### 构建与部署

```bash
npm run build      # 标准 Next.js 构建（用于本地验证）
npm run build:cf   # 构建 Cloudflare Pages 产物（.vercel/output/static）
npm run deploy:cf  # 部署到 Cloudflare Pages
```

> ⚠️ **重要**：推送到 `master` 分支会通过 Cloudflare Pages 的自动构建钩子触发线上重新部署，提交前请确保改动已经过本地验证。

## 🗂️ 项目结构

```
app/
├── api/                  # Edge Runtime API 路由
│   ├── stats/route.ts    # 聚合：币价 + 全网算力（缓存 20s）
│   ├── pools/route.ts    # 矿池列表（缓存 60s）
│   └── chart/route.ts    # K 线历史（缓存 60s）
├── components/           # UI 组件（HardwareInputs / PriceChart 等）
├── hooks/                # 自定义 Hook
│   ├── useMiningCalculator.ts  # 核心金融计算入口
│   ├── useRealtimeSync.ts      # 20s 轮询同步
│   ├── usePoolData.ts          # 矿池数据
│   ├── useChartManager.ts      # Chart.js 管理
│   └── useLocalStorage.ts      # SSR 安全的 localStorage
├── i18n/                 # 中英双语 (zh.json / en.json)
├── theme/                # 明暗主题
├── math.ts               # 金融计算原子函数（BigNumber）
├── utils.ts              # 工具函数（格式化等）
├── types.ts              # 共享类型定义
├── MinerCalculator.tsx   # 主页面组件
└── page.tsx              # 入口
__tests__/                # Jest 单元测试
```

## 🌐 数据源

| 数据 | 数据源 | 备注 |
|---|---|---|
| PRL 价格（首选）| Pearl OTC `/api/stats/settlements` | 最新成交价 |
| PRL 价格（备选）| SafeTrade `/api/v2/trade/public/tickers/prlusdt` | USDT 行情 |
| PRL 价格（备选）| OKX Web3 行情 | 外部参考 |
| 网络算力 / 出块 | PRLScan API | |
| K 线历史 | SafeTrade `/api/v2/trade/public/markets/prlusdt/k-line` | 15min × 100 |

API 路由统一在 Edge Runtime 运行，并使用 `caches.default`（Cloudflare Edge Cache）做服务端缓存，TTL 见各路由顶部常量。

## ☁️ Cloudflare Pages 部署细节

- 构建命令：`npm run build:cf`
- 输出目录：`.vercel/output/static`
- 兼容性标志：`nodejs_compat`（见 `wrangler.toml`）
- 所有 API 路由均使用 `export const runtime = 'edge'`
- **限制**：
  - 不能使用 `cache: 'no-store'`（Cloudflare Workers Runtime 不支持）
  - 不能使用 Node.js 专属 API
  - 默认的 Next Image Optimization 不可用

## 🛠️ 技术栈

- **框架**：Next.js 14 (App Router)
- **语言**：TypeScript 5
- **样式**：Tailwind CSS 3
- **图表**：Chart.js 4 + lightweight-charts 5
- **数值**：mathjs (BigNumber)
- **测试**：Jest 30 + React Testing Library
- **部署**：Cloudflare Pages + Edge Runtime

## 📄 License

私有项目。
