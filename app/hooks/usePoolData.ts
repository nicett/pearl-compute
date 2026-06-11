'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { PoolData } from '../types';

interface UsePoolDataReturn {
  pools: PoolData[];
  loading: boolean;
  error: boolean;
  selectedPool: string | null;
  selectPool: (slug: string | null) => void;
}

/**
 * 矿池数据 Hook
 * 获取矿池列表，管理矿池选择状态
 */
export function usePoolData(
  onPoolChange: (pool: PoolData | null) => void
): UsePoolDataReturn {
  const [pools, setPools] = useState<PoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedPool, setSelectedPool] = useState<string | null>(() => {
    // 从 localStorage 恢复选择
    try {
      return localStorage.getItem('miner_calc_selectedPool') || null;
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('[usePoolData] read selectedPool failed:', e);
      return null;
    }
  });

  const onPoolChangeRef = useRef(onPoolChange);
  onPoolChangeRef.current = onPoolChange;

  // 获取矿池列表
  const fetchPools = useCallback(async () => {
    try {
      const response = await fetch(`/api/pools?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.error) {
        console.warn('Pools API error:', data.error);
        setError(true);
        return;
      }

      if (data.pools) {
        setPools(data.pools);
        setError(false);
      }
    } catch (err) {
      console.error('Failed to fetch pools:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始获取 + 定时刷新
  useEffect(() => {
    fetchPools();
    const interval = setInterval(fetchPools, 60000); // 每分钟刷新
    return () => clearInterval(interval);
  }, [fetchPools]);

  // 选择矿池
  const selectPool = useCallback((slug: string | null) => {
    setSelectedPool(slug);
    try {
      if (slug) {
        localStorage.setItem('miner_calc_selectedPool', slug);
      } else {
        localStorage.removeItem('miner_calc_selectedPool');
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('[usePoolData] write selectedPool failed:', e);
    }
  }, []);

  // 根据 slug 获取矿池
  // 当矿池列表加载完成或选择变化时，通知父组件
  useEffect(() => {
    if (loading) return;

    if (selectedPool) {
      const pool = pools.find((p) => p.slug === selectedPool);
      onPoolChangeRef.current(pool || null);
    } else {
      onPoolChangeRef.current(null);
    }
  }, [pools, selectedPool, loading]);

  return {
    pools,
    loading,
    error,
    selectedPool,
    selectPool,
  };
}
