/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // === 字体 ===
      // 默认 sans 给所有文本用，mono 给数字 / 哈希 / 钱包地址用
      fontFamily: {
        sans: ['Inter', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },

      // === 圆角（告别零圆角，引入现代柔和形态） ===
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },

      // === 颜色（双主题 token；通过 CSS 变量切换） ===
      // dark 是默认值；light 在 globals.css 里通过 :root 重写
      colors: {
        // 背景层级
        base: 'rgb(var(--bg-base) / <alpha-value>)',
        card: 'rgb(var(--bg-card) / <alpha-value>)',
        elevated: 'rgb(var(--bg-elevated) / <alpha-value>)',
        input: 'rgb(var(--bg-input) / <alpha-value>)',

        // 边框
        subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
        line: 'rgb(var(--border-default) / <alpha-value>)',

        // 文字
        primary: 'rgb(var(--text-primary) / <alpha-value>)',
        secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
        tertiary: 'rgb(var(--text-tertiary) / <alpha-value>)',

        // 品牌（紫色）
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          hover: 'rgb(var(--brand-hover) / <alpha-value>)',
          soft: 'rgb(var(--brand) / 0.12)',
        },

        // 状态（涨 / 跌 / 警告）
        success: 'rgb(var(--success) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
      },

      // === 阴影（dark 几乎不用；light 用低饱和软阴影） ===
      boxShadow: {
        card: '0 1px 3px rgb(0 0 0 / 0.04), 0 1px 2px rgb(0 0 0 / 0.02)',
        elevated: '0 4px 12px rgb(0 0 0 / 0.06), 0 2px 4px rgb(0 0 0 / 0.04)',
        focus: '0 0 0 3px rgb(124 58 237 / 0.25)',
      },

      // === 动画（保留 pulse-slow） ===
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
