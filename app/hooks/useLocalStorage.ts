'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * 通用 localStorage Hook，支持 SSR 安全
 * @param key localStorage 键名
 * @param fields 要读写的字段列表
 * @returns [values, saveOne, saveAll]
 */
export function useLocalStorage<T extends Record<string, number>>(
  keyPrefix: string,
  fields: (keyof T)[],
  defaults: T
): [T, (field: keyof T, value: number) => void] {
  const [values, setValues] = useState<T>(defaults);

  // 从 localStorage 加载
  useEffect(() => {
    try {
      const saved: Partial<T> = {};
      let hasSaved = false;
      for (const field of fields) {
        const savedVal = localStorage.getItem(`${keyPrefix}_${String(field)}`);
        if (savedVal !== null) {
          saved[field] = parseFloat(savedVal) as T[typeof field];
          hasSaved = true;
        }
      }
      if (hasSaved) {
        setValues((prev) => ({ ...prev, ...saved }));
      }
    } catch (e) {
      // Safari private mode etc.
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 保存单个字段
  const saveOne = useCallback(
    (field: keyof T, value: number) => {
      try {
        localStorage.setItem(`${keyPrefix}_${String(field)}`, value.toString());
      } catch (e) {
        // Ignore quota exceeded
      }
    },
    [keyPrefix]
  );

  return [values, saveOne];
}
