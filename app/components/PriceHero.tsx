'use client';

import { PriceSource } from '../types';

interface PriceHeroProps {
  coinPrice: number;
  allPrices: PriceSource[];
  selectedPriceSource: string;
  onSelectPrice: (name: string, price: number) => void;
  priceHistory: { ts: number; price: number }[];
  locale: string;
  setLocale: (locale: 'en' | 'zh') => void;
  theme: string;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  t: (key: string) => string;
}

/**
 * 卡片顶部价格 Hero — Uniswap 风格的大号价格展示
 */
export default function PriceHero({
  coinPrice,
  allPrices,
  selectedPriceSource,
  onSelectPrice,
  priceHistory,
  locale,
  setLocale,
  theme,
  setTheme,
  t,
}: PriceHeroProps) {
  // 计算 24h 变化
  const prices = priceHistory.map((p) => p.price);
  const firstPrice = prices.length > 0 ? prices[0] : 0;
  const changePercent = firstPrice > 0 ? ((coinPrice - firstPrice) / firstPrice) * 100 : 0;
  const isUp = changePercent >= 0;

  return (
    <div className="px-6 pt-5 pb-4">
      {/* 顶栏：标题 + 控制 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-accent text-[10px] font-bold tracking-[0.3em] uppercase">PRL</span>
          <span className="text-muted/30 text-[10px]">MINER</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 语言切换 */}
          <button
            onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
            className="text-[9px] text-muted hover:text-gray-300 tracking-wider uppercase px-1.5 py-0.5 border border-edge hover:border-edge-light transition-colors"
          >
            {locale === 'en' ? 'EN/$' : '中/￥'}
          </button>

          {/* 分隔 */}
          <span className="text-edge text-[9px]">│</span>

          {/* 主题三态切换 */}
          <div className="flex items-center border border-edge">
            <button
              onClick={() => setTheme('light')}
              title={t('themeLight')}
              className={`px-1.5 py-0.5 text-[9px] transition-colors duration-150 ${
                theme === 'light'
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:text-gray-300'
              }`}
            >
              ☀
            </button>
            <button
              onClick={() => setTheme('dark')}
              title={t('themeDark')}
              className={`px-1.5 py-0.5 text-[9px] transition-colors duration-150 border-x border-edge ${
                theme === 'dark'
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:text-gray-300'
              }`}
            >
              ☾
            </button>
            <button
              onClick={() => setTheme('system')}
              title={t('themeSystem')}
              className={`px-1.5 py-0.5 text-[9px] transition-colors duration-150 ${
                theme === 'system'
                  ? 'bg-accent/10 text-accent'
                  : 'text-muted hover:text-gray-300'
              }`}
            >
              ◉
            </button>
          </div>
        </div>
      </div>

      {/* 价格展示 */}
      <div className="flex items-end gap-3 mb-3" suppressHydrationWarning>
        <span className="text-3xl font-bold text-gray-100 font-mono tracking-tight" suppressHydrationWarning>
          ${coinPrice.toFixed(4)}
        </span>
        <span className={`text-sm font-mono font-bold mb-0.5 ${isUp ? 'text-emerald-400' : 'text-red-400'}`} suppressHydrationWarning>
          {isUp ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
        </span>
      </div>

      {/* 多源切换 */}
      {allPrices.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allPrices.map((p) => {
            const isSelected = p.name === selectedPriceSource;
            return (
              <button
                key={p.name}
                onClick={() => onSelectPrice(p.name, p.price)}
                className={`text-[9px] px-2 py-1 border transition-colors duration-150 font-mono tracking-wider ${
                  isSelected
                    ? 'border-accent text-accent bg-accent/5'
                    : 'border-edge text-muted hover:border-edge-light hover:text-gray-300'
                }`}
              >
                {p.name}: ${p.price.toFixed(4)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
