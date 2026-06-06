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

/**
 * API 同步 Hook
 * 管理实时数据同步、倒计时、价格来源
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
  const [countdown, setCountdown] = useState(20);
  const [isStale, setIsStale] = useState(false);
  const [allPrices, setAllPrices] = useState<PriceSource[]>([]);
  const [selectedPriceSource, setSelectedPriceSource] = useState<string>('Pearl OTC');
  const [priceSource, setPriceSource] = useState<string | null>(initialPriceSource);
  const [networkStats, setNetworkStats] = useState<NetworkStats>(
    initialNetworkStats || { networkHashrate: 'N/A', networkHashrateTH: 0, blockReward: 0, dailyGlobalOutput: 0, avgBlockTime: 'N/A', hashrateYield: 0 }
  );
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>(initialPriceHistory || []);

  const priceHistoryRef = useRef<PriceHistoryPoint[]>(priceHistory);
  useEffect(() => { priceHistoryRef.current = priceHistory; }, [priceHistory]);

  // 选择价格来源
  const handleSelectPrice = useCallback(
    (name: string, price: number) => {
      setSelectedPriceSource(name);
      onInputsUpdate((prev) => ({ ...prev, coinPrice: price }));
      setPriceSource(name);
      try {
        localStorage.setItem('miner_calc_price_source', name);
      } catch (e) {}
    },
    [onInputsUpdate]
  );

  // 内部：处理后端返回的 JSON 数据
  const processApiData = useCallback((data: any, overrideSource?: string) => {
    setIsStale(data.stale === true);

    const coinData = data.coins?.[0] || {};
    const exchangeRate = data.exchangeRate || null;
    const lastSyncTsNew = data.lastSyncTime || null;

    // 解析多价格来源
    const priceList: PriceSource[] = [];
    if (data.prices?.pearlOtc?.price) {
      priceList.push({ name: 'Pearl OTC', price: data.prices.pearlOtc.price });
    }
    if (data.prices?.safetrade?.price) {
      priceList.push({ name: 'SafeTrade', price: data.prices.safetrade.price });
    }
    if (data.prices?.okx?.price) {
      priceList.push({ name: 'OKX Web3', price: data.prices.okx.price });
    }
    setAllPrices(priceList);

    // 根据用户选中的来源决定价格
    const activeSource = overrideSource || selectedPriceSource;
    const selectedPrice =
      priceList.find((p) => p.name === activeSource)?.price ||
      priceList.find((p) => p.name === 'Pearl OTC')?.price ||
      priceList[0]?.price ||
      coinData.price ||
      null;
    const sourceName =
      priceList.find((p) => p.name === activeSource)?.name ||
      priceList.find((p) => p.name === 'Pearl OTC')?.name ||
      priceList[0]?.name ||
      data.priceSource ||
      'unknown';

    // 使用 API 返回的 hashrateYield
    const yieldPerTH = data.networkStats?.hashrateYield || 0;

    // 更新输入值
    onInputsUpdate((prev) => {
      const newInputs = { ...prev };
      // 只在未选择矿池时更新 yield
      if (!prev.selectedPool && yieldPerTH > 0 && isFinite(yieldPerTH)) {
        newInputs.hashrateYield = yieldPerTH;
      }
      if (selectedPrice) {
        newInputs.coinPrice = selectedPrice;
      }
      if (exchangeRate) {
        newInputs.exchangeRate = exchangeRate;
      }
      return newInputs;
    });

    if (selectedPrice) {
      setPriceSource(sourceName);
    }
    if (lastSyncTsNew) {
      setLastSyncTs(lastSyncTsNew);
    }
    if (data.networkStats) {
      setNetworkStats(data.networkStats);
    }

    return selectedPrice;
  }, [selectedPriceSource, onInputsUpdate]);

  // 从 API 同步数据
  const fetchRealtimeData = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/stats?t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.error) {
        console.warn('API returned error:', data.error);
        if (data.lastSuccessfulFetchTime) {
          setLastSyncTs(data.lastSuccessfulFetchTime);
        }
        setSyncStatus('error');
        setIsStale(true);
        return false;
      }

      const selectedPrice = processApiData(data);

      // 不再在前端累加单点数据
      // 将成功获取的实时数据写入 localStorage 缓存（保留之前缓存的图表数据）
      try {
        const cachedStr = localStorage.getItem('miner_calc_cache');
        const cached = cachedStr ? JSON.parse(cachedStr) : {};
        localStorage.setItem('miner_calc_cache', JSON.stringify({
          ...cached,
          ts: Date.now(),
          apiData: data,
        }));
      } catch (e) {}

      setSyncStatus('success');
      return true;
    } catch (error) {
      console.error('API Fetch Failed:', error);
      setSyncStatus('error');
      return false;
    }
  }, [processApiData]);

  const fetchChartData = useCallback(async () => {
    try {
      const response = await fetch(`/api/chart?t=${Date.now()}`);
      if (!response.ok) return;
      const data = await response.json();
      if (data && data.data && Array.isArray(data.data)) {
        const mapped = data.data.map((p: any) => ({
          ts: p.time,
          price: p.close,
          open: p.open,
          high: p.high,
          low: p.low,
          close: p.close,
          volume: p.volume
        }));
        setPriceHistory(mapped);
        try {
          const cachedStr = localStorage.getItem('miner_calc_cache');
          const cached = cachedStr ? JSON.parse(cachedStr) : { ts: Date.now() };
          cached.priceHistory = mapped;
          localStorage.setItem('miner_calc_cache', JSON.stringify(cached));
        } catch (e) {}
      }
    } catch (e) {
      console.error('Failed to fetch chart data', e);
    }
  }, []);

  // 倒计时和初始化逻辑
  const fetchingRef = useRef(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      let usedCache = false;
      let savedSource = selectedPriceSource;

      // 0. 读取记住的价格来源
      try {
        const saved = localStorage.getItem('miner_calc_price_source');
        if (saved) {
          savedSource = saved;
          setSelectedPriceSource(saved);
          setPriceSource(saved);
        }
      } catch (e) {}

      // 1. 尝试读取本地缓存
      try {
        const cachedStr = localStorage.getItem('miner_calc_cache');
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          const ageMs = Date.now() - cached.ts;
          // 如果缓存是 20 秒内的，则直接使用
          if (ageMs >= 0 && ageMs < 20000) {
            processApiData(cached.apiData, savedSource);
            if (cached.priceHistory && cached.priceHistory.length > 0) {
              setPriceHistory(cached.priceHistory);
              // 如果缓存很久了，可以考虑异步刷新下 chart
              if (ageMs > 300000) { // 5分钟
                 fetchChartData();
              }
            } else {
              fetchChartData();
            }
            setCountdown(20 - Math.floor(ageMs / 1000));
            setSyncStatus('success');
            usedCache = true;
          }
        }
      } catch (e) {
        // ignore parse error
      }

      // 2. 如果没有有效缓存，则立即发起请求（而不是等 20 秒）
      if (!usedCache) {
        fetchingRef.current = true;
        fetchChartData(); // 初始加载图表数据
        fetchRealtimeData()
          .finally(() => {
            fetchingRef.current = false;
            setCountdown(20);
          });
      }
    }

    // 3. 启动定时器：处理后续的倒计时和刷新
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1 && !fetchingRef.current) {
          fetchingRef.current = true;
          fetchRealtimeData()
            .finally(() => {
              fetchingRef.current = false;
              setCountdown(20); // 请求完成后重置倒计时
            });
          return 0; // 请求期间倒计时保持 0
        }
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchRealtimeData, processApiData, fetchChartData]);

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
