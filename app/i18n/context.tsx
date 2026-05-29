'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import en from './locales/en.json';
import zh from './locales/zh.json';

type Locale = 'en' | 'zh';

interface I18nContextType {
  locale: Locale;
  t: (key: string) => string;
  setLocale: (locale: Locale) => void;
}

const locales: Record<Locale, Record<string, string>> = { en, zh };

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  // 从本地存储加载语言设置
  useEffect(() => {
    try {
      const savedLocale = localStorage.getItem('pearl_locale') as Locale;
      if (savedLocale && (savedLocale === 'en' || savedLocale === 'zh')) {
        setLocale(savedLocale);
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  // 保存语言设置
  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    try {
      localStorage.setItem('pearl_locale', newLocale);
    } catch (e) {
      // Ignore
    }
  };

  // 翻译函数
  const t = (key: string): string => {
    return locales[locale][key] || locales['en'][key] || key;
  };

  return (
    <I18nContext.Provider value={{ locale, t, setLocale: handleSetLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
