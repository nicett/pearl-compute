'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MiningInputs, PriceSource, SyncStatus, NetworkStats, PriceHistoryPoint } from '../types';

interface SyncState {
  syncStatus: SyncStatus;
  lastSyncTs: number | null;
  countdown: number;
  isStale: boolean;
  allPrices: PriceSource[];
  priceSource: string | null;
  selectedPriceSource: string;
  networkStats: NetworkStats;
  priceHistory: PriceHistoryPoint[];
}

interface SyncActions {
  handleSelectPrice: (name: string, price: number) => void;
}

const POLL_INTERVAL_SEC = 20;
const CACHE_KEY = 'miner_calc_cache';
const PRICE_SOURCE_KEY = 'miner_calc_price_source';

interface StatsApiResponse {
  error?: string;
  stale?: boolean;
  lastSyncTime?: number;
  lastSuccessfulFetchTime?: number;
  priceSource?: string;
  exchangeRate?: number | null;
  coins?: Array<{ price?: number }>;
  prices?: {
    pearlOtc?: { price?: number };
    safetrade?: { price?: number };
    okx?: { price?: number };
  };
  networkStats?: NetworkStats;
}

interface ChartApiResponse {
  data?: Array<{
    time: number;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number | null;
  }>;
}

/**
 * API 同步 Hook
 * 管理实时数据同步、倒计时、价格来源
 *
 * 设计：
 * - 主 effect 只在 mount 时跑一次（空依赖）
 * - 通过 ref 持有最新的依赖函数（selectedPriceSource、onInputsUpdate 等），
 *   避免切换价格源 → 函数重建 → setInterval 反复重建的级联问题
 * - 倒计时与定时刷新独立在一个 setInterval(1000ms) 中，
 *   计数器到 0 时触发一次 fetch；fetchingRef 保护并发
 */
export function useRealtimeSync(
  initialPriceSource: string,
  onInputsUpdate: (updater: (prev: MiningInputs) => MiningInputs) => void,
  initialNetworkStats?: NetworkStats,
  initialPriceHistory?: PriceHistoryPoint[],
  selectedPool?: string | null
): SyncState & SyncActions {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const [lastSyncTs, setLastSyncTs] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(POLL_INTERVAL_SEC);
  const [isStale, setIsStale] = useState(false);
  const [allPrices, setAllPrices] = useState<PriceSource[]>([]);
  const [selectedPriceSource, setSelectedPriceSource] = useState<string>('Pearl OTC');
  const [priceSource, setPriceSource] = useState<string | null>(initialPriceSource);
  const [networkStats, setNetworkStats] = useState<NetworkStats>(
    initialNetworkStats || { networkHashrate: 'N/A', networkHashrateTH: 0, blockReward: 0, dailyGlobalOutput: 0, avgBlockTime: 'N/A', hashrateYield: 0 }
  );
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>(initialPriceHistory || []);

  // ── refs：保持最新值，避免重建定时器和函数 ──
  const selectedPriceSourceRef = useRef(selectedPriceSource);
  const onInputsUpdateRef = useRef(onInputsUpdate);
  const fetchingRef = useRef(false);

  useEffect(() => { selectedPriceSourceRef.current = selectedPriceSource; }, [selectedPriceSource]);
  useEffect(() => { onInputsUpdateRef.current = onInputsUpdate; }, [onInputsUpdate]);

  // 选择价格来源（依赖稳定）
  const handleSelectPrice = useCallback((name: string, price: number) => {
    setSelectedPriceSource(name);
    onInputsUpdateRef.current((prev) => ({ ...prev, coinPrice: price }));
    setPriceSource(name);
    try {
      localStorage.setItem(PRICE_SOURCE_KEY, name);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('[useRealtimeSync] save price source failed:', e);
    }
  }, []);

  // 解析 API 返回数据（无 React 闭包依赖：通过 ref 取最新选源）
  const processApiData = useCallback((data: StatsApiResponse, overrideSource?: string): number | null => {
    setIsStale(data.stale === true);

    const coinData = data.coins?.[0] || {};
    const exchangeRate = data.exchangeRate || null;
    const lastSyncTsNew = data.lastSyncTime || null;

    // 解析多价格来源
    const priceList: PriceSource[] = [];
    if (data.prices?.pearlOtc?.price) priceList.push({ name: 'Pearl OTC', price: data.prices.pearlOtc.price });
    if (data.prices?.safetrade?.price) priceList.push({ name: 'SafeTrade', price: data.prices.safetrade.price });
    if (data.prices?.okx?.price) priceList.push({ name: 'OKX Web3', price: data.prices.okx.price });
    setAllPrices(priceList);

    // 用户选中的源（ref 保证最新）
    const activeSource = overrideSource || selectedPriceSourceRef.current;
    const selectedEntry =
      priceList.find((p) => p.name === activeSource) ||
      priceList.find((p) => p.name === 'Pearl OTC') ||
      priceList[0];
    const selectedPrice = selectedEntry?.price ?? coinData.price ?? null;
    const sourceName = selectedEntry?.name ?? data.priceSource ?? 'unknown';

    // 使用 API 返回的 hashrateYield
    const yieldPerTH = data.networkStats?.hashrateYield || 0;

    // 更新输入值（只覆盖与本次 API 直接相关的字段，避免误覆盖用户手改）
    onInputsUpdateRef.current((prev) => {
      const newInputs = { ...prev };
      // 只在未选择矿池时更新 yield
      if (!prev.selectedPool && yieldPerTH > 0 && isFinite(yieldPerTH)) {
        newInputs.hashrateYield = yieldPerTH;
      }
      // 关键：只在源匹配时才覆盖币价。否则用户切到 SafeTrade 后，下一轮轮询会把价格拽回 Pearl OTC。
      // 当源不匹配时（用户切换过），保留用户当前的价格 prev.coinPrice，由 handleSelectPrice 负责实时更新。
      if (selectedPrice !== null && sourceName === activeSource) {
        newInputs.coinPrice = selectedPrice;
      }
      if (exchangeRate) {
        newInputs.exchangeRate = exchangeRate;
      }
      return newInputs;
    });

    if (selectedPrice !== null) {
      setPriceSource(sourceName);
    }
    if (lastSyncTsNew) {
      setLastSyncTs(lastSyncTsNew);
    }
    if (data.networkStats) {
      setNetworkStats(data.networkStats);
    }

    return selectedPrice;
  }, []);

  // 从 API 同步数据
  const fetchRealtimeData = useCallback(async (overrideSource?: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/stats?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: StatsApiResponse = await response.json();

      if (data.error) {
        if (process.env.NODE_ENV !== 'production') console.warn('[useRealtimeSync] API returned error:', data.error);
        if (data.lastSuccessfulFetchTime) {
          setLastSyncTs(data.lastSuccessfulFetchTime);
        }
        setSyncStatus('error');
        setIsStale(true);
        return false;
      }

      processApiData(data, overrideSource);

      // 将成功获取的实时数据写入 localStorage 缓存
      try {
        const cachedStr = localStorage.getItem(CACHE_KEY);
        const cached = cachedStr ? JSON.parse(cachedStr) : {};
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          ...cached,
          ts: Date.now(),
          apiData: data,
        }));
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') console.warn('[useRealtimeSync] cache write failed:', e);
      }

      setSyncStatus('success');
      return true;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.error('[useRealtimeSync] fetch failed:', error);
      setSyncStatus('error');
      return false;
    }
  }, [processApiData]);

  const fetchChartData = useCallback(async () => {
    try {
      const response = await fetch(`/api/chart?t=${Date.now()}`);
      if (!response.ok) return;
      const data: ChartApiResponse = await response.json();
      if (data && data.data && Array.isArray(data.data)) {
        const mapped: PriceHistoryPoint[] = data.data.map((p) => ({
          ts: p.time,
          price: p.close ?? 0,
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
          volume: p.volume ?? null,
        }));
        setPriceHistory(mapped);
        try {
          const cachedStr = localStorage.getItem(CACHE_KEY);
          const cached = cachedStr ? JSON.parse(cachedStr) : { ts: Date.now() };
          cached.priceHistory = mapped;
          localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
        } catch (e) {
          if (process.env.NODE_ENV !== 'production') console.warn('[useRealtimeSync] chart cache write failed:', e);
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.error('[useRealtimeSync] chart fetch failed:', e);
    }
  }, []);

  // 持有最新 fetch 函数的 ref，给定时器使用，避免每次 fetch 函数重建都重建 setInterval
  const fetchRealtimeDataRef = useRef(fetchRealtimeData);
  const fetchChartDataRef = useRef(fetchChartData);
  useEffect(() => { fetchRealtimeDataRef.current = fetchRealtimeData; }, [fetchRealtimeData]);
  useEffect(() => { fetchChartDataRef.current = fetchChartData; }, [fetchChartData]);

  // ── 初始化 effect（只跑一次） ──
  useEffect(() => {
    let savedSource = selectedPriceSourceRef.current;

    // 读取记住的价格来源
    try {
      const saved = localStorage.getItem(PRICE_SOURCE_KEY);
      if (saved) {
        savedSource = saved;
        setSelectedPriceSource(saved);
        setPriceSource(saved);
        selectedPriceSourceRef.current = saved;
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('[useRealtimeSync] read price source failed:', e);
    }

    // 尝试本地缓存（≤ POLL_INTERVAL_SEC 内的）
    let usedCache = false;
    try {
      const cachedStr = localStorage.getItem(CACHE_KEY);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        const ageMs = Date.now() - cached.ts;
        if (ageMs >= 0 && ageMs < POLL_INTERVAL_SEC * 1000) {
          processApiData(cached.apiData, savedSource);
          if (cached.priceHistory && cached.priceHistory.length > 0) {
            setPriceHistory(cached.priceHistory);
          } else {
            fetchChartDataRef.current();
          }
          setCountdown(POLL_INTERVAL_SEC - Math.floor(ageMs / 1000));
          setSyncStatus('success');
          usedCache = true;
        }
      }
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.warn('[useRealtimeSync] cache read failed:', e);
    }

    // 无有效缓存则立即抓取
    if (!usedCache) {
      fetchingRef.current = true;
      Promise.all([fetchRealtimeDataRef.current(savedSource), fetchChartDataRef.current()])
        .finally(() => {
          fetchingRef.current = false;
          setCountdown(POLL_INTERVAL_SEC);
        });
    }
    // 故意空依赖：mount 时一次性初始化，后续依赖 selectedPriceSource 的变化由 handleSelectPrice 直接处理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 定时器 effect（只跑一次，通过 ref 调用最新函数） ──
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1 && !fetchingRef.current) {
          fetchingRef.current = true;
          Promise.all([fetchRealtimeDataRef.current(), fetchChartDataRef.current()])
            .finally(() => {
              fetchingRef.current = false;
              setCountdown(POLL_INTERVAL_SEC);
            });
          return 0; // 请求期间倒计时保持 0
        }
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return {
    syncStatus,
    lastSyncTs,
    countdown,
    isStale,
    allPrices,
    priceSource,
    selectedPriceSource,
    networkStats,
    priceHistory,
    handleSelectPrice,
  };
}
