'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

import { usePersistedInputs } from './useLocalStorage';

/**
 * 计算器配置 - 登录态感知的持久化 Hook
 *
 * 签名与 usePersistedInputs 一致，可直接替换。
 *
 * 行为：
 * - 未登录：完全退化为 usePersistedInputs（仅 localStorage）
 * - 已登录：
 *   - mount 后 hydrate 完成 → GET /api/me/config 拉云端，覆盖本地
 *   - 用户改值 → debounce 1500ms → PUT /api/me/config
 *   - 同时永远写入 localStorage（离线降级 / 登出仍可用）
 *
 * 冲突策略：Last write wins（不维护版本号）
 *
 * 失败处理：网络失败不阻塞 UI；console.warn 记一条；
 *           下次 mount/change 时会自然重试
 */
export function useSyncedConfig<T extends object>(
  keyPrefix: string,
  defaults: T,
  persistFields: (keyof T)[],
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  // 1. 始终先走 localStorage（SSR 安全 + 离线降级）
  const [inputs, setInputs, localHydrated] = usePersistedInputs(keyPrefix, defaults, persistFields);

  // 2. session 状态：决定是否启用云端
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  // 3. 云端 hydrate：登录后从云端拉一次，覆盖本地
  const [cloudHydrated, setCloudHydrated] = useState(false);
  useEffect(() => {
    // 未登录 / 未水合本地 / 已 hydrate 过云端 — 都不做
    if (!isAuthenticated || !localHydrated || cloudHydrated) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/me/config', { credentials: 'same-origin' });
        if (!res.ok) {
          console.warn(`[useSyncedConfig] GET failed: ${res.status}`);
          return;
        }
        const cloud = (await res.json()) as Record<string, unknown>;
        if (cancelled) return;

        // 仅合入 persistFields 中且为数字的字段（与本地行为对称）
        const merged: Partial<T> = {};
        for (const field of persistFields) {
          const val = cloud[String(field)];
          if (typeof val === 'number' && Number.isFinite(val)) {
            (merged as Record<string, number>)[String(field)] = val;
          }
        }
        if (Object.keys(merged).length > 0) {
          setInputs((prev) => ({ ...prev, ...merged }));
        }
      } catch (e) {
        console.warn('[useSyncedConfig] GET error:', e);
      } finally {
        if (!cancelled) setCloudHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, localHydrated, cloudHydrated, persistFields, setInputs]);

  // 登出时重置 cloudHydrated，下次登录会重新拉
  useEffect(() => {
    if (!isAuthenticated) setCloudHydrated(false);
  }, [isAuthenticated]);

  // 4. 改值后 debounce 1.5s PUT 到云端
  // 只在两个条件都满足时启用：登录 + 云端首拉完成（避免本地默认值在拉到云端前覆盖云端）
  const lastPushedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isAuthenticated || !cloudHydrated) return;

    // 提取当前要 push 的子集（与 persistFields 对齐）
    const payload: Record<string, unknown> = {};
    for (const field of persistFields) {
      const val = (inputs as Record<string, unknown>)[String(field)];
      if (typeof val === 'number' && Number.isFinite(val)) {
        payload[String(field)] = val;
      }
    }
    const serialized = JSON.stringify(payload);
    // 没变就不发
    if (serialized === lastPushedRef.current) return;

    const timer = setTimeout(() => {
      lastPushedRef.current = serialized;
      fetch('/api/me/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: serialized,
      }).catch((e) => {
        console.warn('[useSyncedConfig] PUT error:', e);
        // 失败时清掉 lastPushed，下次改动会重试
        lastPushedRef.current = null;
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [inputs, isAuthenticated, cloudHydrated, persistFields]);

  return [inputs, setInputs, localHydrated];
}
