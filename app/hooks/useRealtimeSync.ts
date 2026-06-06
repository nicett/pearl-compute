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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('success');
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

  // 选择价格来源
  const handleSelectPrice = useCallback(
    (name: string, price: number) => {
      setSelectedPriceSource(name);
      onInputsUpdate((prev) => ({ ...prev, coinPrice: price }));
      setPriceSource(name);
    },
    [onInputsUpdate]
  );

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
      const selectedPrice =
        priceList.find((p) => p.name === selectedPriceSource)?.price ||
        priceList.find((p) => p.name === 'Pearl OTC')?.price ||
        priceList[0]?.price ||
        coinData.price ||
        null;
      const sourceName =
        priceList.find((p) => p.name === selectedPriceSource)?.name ||
        priceList.find((p) => p.name === 'Pearl OTC')?.name ||
        priceList[0]?.name ||
        data.priceSource ||
        'unknown';

      // 使用 API 返回的 hashrateYield（基于 PRLScan 全网数据）
      // 当用户选择了矿池时，不更新 hashrateYield（由矿池数据决定）
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

      // 更新网络统计
      if (data.networkStats) {
        setNetworkStats(data.networkStats);
      }

      // 客户端累积价格历史（Edge Runtime 无法维持服务端缓冲区）
      if (selectedPrice && selectedPrice > 0) {
        setPriceHistory((prev) => {
          const newPoint: PriceHistoryPoint = {
            ts: Math.floor(Date.now() / 1000),
            price: selectedPrice,
            volume: null,
          };
          const updated = [...prev, newPoint];
          // 保留最近约 24h 的数据（4320 条 @ 20s 间隔）
          return updated.length > 4320 ? updated.slice(updated.length - 4320) : updated;
        });
      }

      setSyncStatus('success');
      return true;
    } catch (error) {
      console.error('API Fetch Failed:', error);
      setSyncStatus('error');
      return false;
    }
  }, [selectedPriceSource, onInputsUpdate]);

  // 倒计时逻辑
  const fetchingRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1 && !fetchingRef.current) {
          fetchingRef.current = true;
          fetchRealtimeData()
            .then(() => {
              fetchingRef.current = false;
              setCountdown(20);
            })
            .catch(() => {
              fetchingRef.current = false;
              setCountdown(20);
            });
          return 0;
        }
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchRealtimeData]);

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
