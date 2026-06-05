'use client';

import { Locale } from '../types';

interface HeaderProps {
  t: (key: string) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  theme: string;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export default function Header({ t, locale, setLocale, theme, setTheme }: HeaderProps) {
  return (
    <div className="bg-surface border-b border-edge p-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-gray-100 tracking-tight flex items-center gap-3">
            <span className="text-accent text-xs font-medium tracking-[0.3em] uppercase">PRL</span>
            <span className="w-px h-4 bg-edge" />
            <span>{t('title')}</span>
          </h1>
          <p className="text-muted text-[10px] tracking-[0.15em] uppercase mt-1.5">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* 桌面端：按钮组 */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => setLocale('en')}
              className={`px-2 py-1 text-[10px] tracking-wider uppercase border transition-colors duration-150 ${
                locale === 'en'
                  ? 'border-accent text-accent bg-accent/5'
                  : 'border-edge text-muted hover:border-edge-light hover:text-gray-300'
              }`}
            >
              EN / $
            </button>
            <button
              onClick={() => setLocale('zh')}
              className={`px-2 py-1 text-[10px] tracking-wider uppercase border transition-colors duration-150 ${
                locale === 'zh'
                  ? 'border-accent text-accent bg-accent/5'
                  : 'border-edge text-muted hover:border-edge-light hover:text-gray-300'
              }`}
            >
              中文 / ￥
            </button>
            <div className="w-px h-4 bg-edge mx-1" />
            <button
              onClick={() => setTheme('light')}
              title={t('themeLight')}
              className={`p-1.5 border transition-colors duration-150 ${
                theme === 'light'
                  ? 'border-accent text-accent bg-accent/5'
                  : 'border-transparent text-muted hover:text-gray-300'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" strokeWidth="2" /><path strokeWidth="2" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
            </button>
            <button
              onClick={() => setTheme('dark')}
              title={t('themeDark')}
              className={`p-1.5 border transition-colors duration-150 ${
                theme === 'dark'
                  ? 'border-accent text-accent bg-accent/5'
                  : 'border-transparent text-muted hover:text-gray-300'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
            </button>
            <button
              onClick={() => setTheme('system')}
              title={t('themeSystem')}
              className={`p-1.5 border transition-colors duration-150 ${
                theme === 'system'
                  ? 'border-accent text-accent bg-accent/5'
                  : 'border-transparent text-muted hover:text-gray-300'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="0" strokeWidth="2" /><path strokeWidth="2" d="M8 21h8M12 17v4" /></svg>
            </button>
          </div>
          {/* 手机端：下拉选择 */}
          <div className="flex sm:hidden items-center gap-2">
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as 'en' | 'zh')}
              className="bg-surface border border-edge text-gray-300 text-[10px] px-2 py-1 focus:outline-none focus:border-accent tracking-wider uppercase"
            >
              <option value="en">EN / $</option>
              <option value="zh">中文 / ￥</option>
            </select>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
              className="bg-surface border border-edge text-gray-300 text-[10px] px-2 py-1 focus:outline-none focus:border-accent tracking-wider uppercase"
            >
              <option value="light">LIGHT</option>
              <option value="dark">DARK</option>
              <option value="system">SYSTEM</option>
            </select>
          </div>
          <div className="text-[9px] text-muted tracking-wider text-right hidden sm:flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="pulse-dot" />
              <span className="uppercase">Live</span>
            </span>
            <span className="text-edge">|</span>
            <span className="uppercase">Next.js + CF Pages</span>
          </div>
        </div>
      </div>
    </div>
  );
}
