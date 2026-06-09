# Pearl Compute 核心开发指南 (AI Development Guide)

这份文档是当前项目的统一规范指南，AI 在每次介入开发时必须严格遵守并调用参考。

## 一、 核心理念与原则 (User Global Rules)

1. **简洁至上**：恪守 KISS（Keep It Simple, Stupid）原则，崇尚简洁与可维护性，避免过度工程化与不必要的防御性设计。
2. **深度分析**：立足于第一性原理（First Principles Thinking）剖析问题，并善用工具以提升效率。
3. **事实为本**：以事实为最高准则。若有任何谬误，恳请坦率斧正，助我精进。

## 二、 开发工作流 (Workflow)

1. **渐进式开发**：通过多轮对话迭代，明确并实现需求。在着手任何设计或编码工作前，必须完成前期调研并厘清所有疑点。
2. **结构化流程**：严格遵循“构思方案 → 提请审核 → 分解为具体任务”的作业顺序。
3. **输出规范**：
   - 所有回复、思考过程及任务清单，均须使用**中文**。
   - 包含或体现固定指令所代表的结构：`Implementation Plan, Task List and Thought in Chinese`。

## 三、 项目技术规范 (Tech Stack & Configs)

### 1. 核心技术栈
- **框架**：Next.js (App Router, React 18) 
- **语言**：TypeScript 5 (Strict Mode 开启)
- **样式**：TailwindCSS 3.4
- **计算与图表**：Chart.js, Lightweight Charts, Mathjs
- **包管理器**：npm

### 2. UI 与样式规范 (Tailwind)
- **字体**：默认统一使用定制等宽字体 `"IBM Plex Mono"`。
- **色彩系统**：基于深色模式设计
  - `surface`: 默认背景色（#141414 等变体）
  - `edge`: 边框与边缘颜色（#222222 等变体）
  - `muted`: 次要文本/弱化元素（#666666 等变体）
  - `accent`: 亮色高亮（#00e5ff 等赛博青蓝色调）
- **动画与动效**：系统预设了 `pulse-slow`, `scan`, `float-slow`, `float-slow-reverse` 等关键帧动画，需积极利用以增强页面微交互。
- **主题**：启用 Dark Mode (`class` 策略)。

### 3. 工程化与部署
- **路径别名**：基于项目根目录 `@/*` 进行绝对路径引用。
- **测试框架**：Jest + React Testing Library (jsdom)，使用 `npm run test`。
- **构建部署**：基于 Cloudflare Pages (`@cloudflare/next-on-pages` 与 `wrangler`)。使用 `npm run build:cf` 或 `npm run deploy:cf` 编译与部署。

## 四、 页面与交互准则 (Aesthetics & UX)
- **卓越视觉体验**：摒弃平庸的开发视角，设计必须追求“极其高级”。运用精细的调色、暗黑模式玻璃拟态、流畅渐变和微动画给用户带来强烈的视觉冲击 (WOW 级体验)。
- **真实场景演示**：杜绝使用粗糙的占位符（Placeholder）。如需配图，务必使用图像生成工具制作实际演示图片。
- **SEO 友好**：所有新页面应配置正确的标题、描述、语义化 HTML 结构及唯一 ID 标识。

---

*提示：任何后续的代码编写、重构或系统设计，AI 都必须无条件遵循本指南的规定，以保持代码和体验的高度一致性。*
