'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * SSR 安全的持久化输入 Hook
 *
 * 使用模式：
 *   const [inputs, setInputs, hydrated] = usePersistedInputs(
 *     'miner_calc',
 *     defaults,
 *     ['gpuCount', 'cardPrice', ...]  // 要持久化的字段子集
 *   );
 *
 * - 服务端渲染时返回 defaults，避免 hydration mismatch
 * - 客户端 mount 后异步从 localStorage 读取并合并
 * - 后续 inputs 变化自动同步到 localStorage（仅 `persistFields` 指定的字段）
 * - 在首次水合完成前，不会触发保存（避免默认值覆盖已存的用户配置）
 */
export function usePersistedInputs<T extends object>(
  keyPrefix: string,
  defaults: T,
  persistFields: (keyof T)[]
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [inputs, setInputs] = useState<T>(defaults);
  const [hydrated, setHydrated] = useState(false);
  const fieldsRef = useRef(persistFields);

  // 客户端 mount 时读取已保存的值
  useEffect(() => {
    try {
      const loaded: Partial<T> = {};
      for (const field of fieldsRef.current) {
        const raw = localStorage.getItem(`${keyPrefix}_${String(field)}`);
        if (raw !== null) {
          const num = parseFloat(raw);
          if (!isNaN(num)) {
            (loaded as Record<string, number>)[String(field)] = num;
          }
        }
      }
      if (Object.keys(loaded).length > 0) {
        setInputs((prev) => ({ ...prev, ...loaded }));
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[usePersistedInputs] read failed:', e);
      }
    } finally {
      setHydrated(true);
    }
  }, [keyPrefix]);

  // inputs 变化时回写（水合完成后才生效）
  useEffect(() => {
    if (!hydrated) return;
    try {
      for (const field of fieldsRef.current) {
        const value = inputs[field];
        if (value != null) {
          localStorage.setItem(`${keyPrefix}_${String(field)}`, String(value));
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[usePersistedInputs] write failed:', e);
      }
    }
  }, [inputs, hydrated, keyPrefix]);

  return [inputs, setInputs, hydrated];
}
