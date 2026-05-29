'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
import { useI18n } from './i18n/context';

// 注册 Chart.js 组件
Chart.register(...registerables);

interface InitialData {
  hashrateYield: number;
  coinPrice: number;
  exchangeRate: number;
  priceSource: string;
}

interface Props {
  initialData: InitialData;
}

export default function MinerCalculator({ initialData }: Props) {
  const { t, locale, setLocale } = useI18n();

  // 货币单位跟随语言：英文=USD，中文=CNY
  const currency = locale === 'zh' ? 'CNY' : 'USD';

  // 输入参数状态（使用服务器端预取的数据作为初始值）
  const [inputs, setInputs] = useState({
    gpuCount: 1,
    cardPrice: 5000,
    residualValue: 3800,
    powerCons: 390,
    gpuHashrate: 90,
    hashrateYield: initialData.hashrateYield,
    coinPrice: initialData.coinPrice,
    poolFee: 3.0,
    electricityPrice: 0.70,
    exchangeRate: initialData.exchangeRate,
  });

  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('success');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [priceSource, setPriceSource] = useState<string | null>(initialData.priceSource);
  const [countdown, setCountdown] = useState(10);
  const [isStale, setIsStale] = useState(false);

  // 图表引用
  const compChartRef = useRef<HTMLCanvasElement>(null);
  const projChartRef = useRef<HTMLCanvasElement>(null);
  const compChartInstance = useRef<Chart | null>(null);
  const projChartInstance = useRef<Chart | null>(null);

  // 计算结果状态
  const [results, setResults] = useState({
    singleCardHourlyCoins: 0,
    totalHashrate: 0,
    totalPowerKW: 0,
    totalInvestment: 0,
    totalResidual: 0,
    dailyElecCostRMB: 0,
    dailyGrossUSDT: 0,
    dailyGrossRMB: 0,
    dailyNetRMB: 0,
    costRatio: 0,
    fullDays: 0,
    fullMonths: 0,
    resDays: 0,
    resMonths: 0,
  });

  // 从本地存储加载设置
  useEffect(() => {
    try {
      const savedInputs: Record<string, number> = {};
      ['gpuCount', 'cardPrice', 'residualValue', 'powerCons', 'gpuHashrate', 'poolFee', 'electricityPrice'].forEach((key) => {
        const savedVal = localStorage.getItem(`miner_calc_${key}`);
        if (savedVal !== null) {
          savedInputs[key] = parseFloat(savedVal);
        }
      });
      if (Object.keys(savedInputs).length > 0) {
        setInputs((prev) => ({ ...prev, ...savedInputs }));
      }
    } catch (e) {
      console.warn('读取本地缓存失败', e);
    }
  }, []);

  // 保存设置到本地存储
  const saveSettings = useCallback(() => {
    try {
      // 只保存用户可修改的字段
      ['gpuCount', 'cardPrice', 'residualValue', 'powerCons', 'gpuHashrate', 'poolFee', 'electricityPrice'].forEach((key) => {
        localStorage.setItem(`miner_calc_${key}`, (inputs as any)[key].toString());
      });
    } catch (e) {
      // Ignore Safari private mode quota exceeded etc.
    }
  }, [inputs]);

  // 初始化图表
  useEffect(() => {
    if (!compChartRef.current || !projChartRef.current) return;

    Chart.defaults.font.family = "'Microsoft YaHei', sans-serif";
    Chart.defaults.color = '#6b7280';

    // 饼图
    compChartInstance.current = new Chart(compChartRef.current, {
      type: 'doughnut',
      data: {
        labels: [t('dailyElecCost'), t('dailyNet')],
        datasets: [
          {
            data: [0, 0],
            backgroundColor: ['#ef4444', '#10b981'],
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, padding: 20 },
          },
        },
      },
    });

    // 柱状图
    projChartInstance.current = new Chart(projChartRef.current, {
      type: 'bar',
      data: {
        labels: [`30 ${t('days')}`, `90 ${t('days')}`, `180 ${t('days')}`, `365 ${t('days')}`],
        datasets: [
          {
            label: t('dailyNet'),
            data: [0, 0, 0, 0],
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderRadius: 4,
            order: 2,
          },
          {
            label: t('totalInvestment'),
            data: [0, 0, 0, 0],
            type: 'line',
            borderColor: '#ef4444',
            borderWidth: 2,
            borderDash: [4, 4],
            fill: false,
            pointRadius: 0,
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
          x: { grid: { display: false } },
        },
        plugins: {
          tooltip: { mode: 'index', intersect: false },
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, padding: 15 },
          },
        },
      },
    });

    return () => {
      compChartInstance.current?.destroy();
      projChartInstance.current?.destroy();
    };
  }, []);

  // 计算逻辑
  useEffect(() => {
    saveSettings();

    const {
      gpuCount,
      cardPrice,
      residualValue,
      powerCons,
      gpuHashrate,
      hashrateYield,
      coinPrice,
      poolFee,
      electricityPrice,
      exchangeRate,
    } = inputs;

    const singleCardHourlyCoins = gpuHashrate * hashrateYield;
    const totalHashrate = gpuCount * gpuHashrate;
    const totalPowerKW = (gpuCount * powerCons) / 1000;

    // 根据货币单位计算
    // 用户输入的值直接就是所选货币单位，不做隐式转换
    const isUSD = currency === 'USD';
    const safeRate = exchangeRate > 0 ? exchangeRate : 1; // 防止除零

    // 投资和残值（用户输入的值直接就是所选货币单位）
    const totalInvestment = gpuCount * cardPrice;
    const totalResidual = gpuCount * residualValue;

    // 电费（用户输入的值直接就是所选货币单位的电价）
    const elecPrice = electricityPrice;
    const dailyElecCost = totalPowerKW * 24 * elecPrice;

    // 毛产出（USDT 本身就是 USD，CNY 模式需转换汇率）
    const dailyGrossUSDT =
      totalHashrate * hashrateYield * 24 * (1 - poolFee / 100) * coinPrice;
    const dailyGross = isUSD ? dailyGrossUSDT : dailyGrossUSDT * safeRate;
    const dailyNet = dailyGross - dailyElecCost;

    let costRatio = 0;
    if (dailyGross > 0) costRatio = (dailyElecCost / dailyGross) * 100;
    else if (dailyGross === 0 && dailyElecCost > 0) costRatio = 100;

    const totalRiskExposure = totalInvestment - totalResidual;

    let fullDays = 0;
    let fullMonths = 0;
    let resDays = 0;
    let resMonths = 0;

    if (dailyNet > 0) {
      fullDays = totalInvestment / dailyNet;
      fullMonths = fullDays / 30;
      resDays = Math.max(0, totalRiskExposure) / dailyNet;
      resMonths = resDays / 30;
    }

    setResults({
      singleCardHourlyCoins,
      totalHashrate,
      totalPowerKW,
      totalInvestment,
      totalResidual,
      dailyElecCostRMB: dailyElecCost,
      dailyGrossUSDT,
      dailyGrossRMB: dailyGross,
      dailyNetRMB: dailyNet,
      costRatio,
      fullDays,
      fullMonths,
      resDays,
      resMonths,
    });

    // 更新图表
    if (compChartInstance.current) {
      const compData =
        dailyNet <= 0
          ? [dailyElecCost, 0]
          : [dailyElecCost, dailyNet];
      compChartInstance.current.data.datasets[0].data = compData;
      compChartInstance.current.update();
    }

    if (projChartInstance.current) {
      const projData =
        dailyNet <= 0
          ? [
              dailyNet * 30,
              dailyNet * 90,
              dailyNet * 180,
              dailyNet * 365,
            ]
          : [
              dailyNet * 30,
              dailyNet * 90,
              dailyNet * 180,
              dailyNet * 365,
            ];
      projChartInstance.current.data.datasets[0].data = projData;
      projChartInstance.current.data.datasets[1].data = [
        totalRiskExposure,
        totalRiskExposure,
        totalRiskExposure,
        totalRiskExposure,
      ];
      projChartInstance.current.update();
    }
  }, [inputs, saveSettings]);

  // 处理输入变化
  const handleInputChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setInputs((prev) => ({ ...prev, [field]: numValue }));
  };

  // 从 API 同步数据（静默模式）
  const fetchRealtimeData = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/stats');

      // 即使返回 502，也可能有缓存数据
      const data = await response.json();

      // 检查是否有错误
      if (data.error) {
        console.warn('API returned error:', data.error);
        // 如果有最后同步时间（Unix 时间戳），显示它
        if (data.lastSuccessfulFetchTime) {
          setLastSyncTime(formatSyncTime(data.lastSuccessfulFetchTime));
        }
        setSyncStatus('error');
        setIsStale(true);
        return false;
      }

      // 检查是否使用了过期缓存
      setIsStale(data.stale === true);

      const coinData = data.coins?.[0] || {};
      const price = coinData.price || null;
      const source = data.priceSource || 'unknown';
      const exchangeRate = data.exchangeRate || null;
      const lastSyncTs = data.lastSyncTime || null;

      // 计算每 TH 时产
      const blockReward = parseFloat(coinData.reward) || 2681.69;
      const blockTimeSec = 124.77;

      let networkHashrateTH = 19.86 * 1000000;
      if (coinData.network_hash) {
        const match = coinData.network_hash.match(/([\d.]+)\s*(EH|TH|GH|MH)/i);
        if (match) {
          const value = parseFloat(match[1]);
          const unit = match[2].toUpperCase();
          const multipliers: Record<string, number> = {
            EH: 1000000,
            TH: 1,
            GH: 0.001,
            MH: 0.000001,
          };
          networkHashrateTH = value * (multipliers[unit] || 1);
        }
      }

      const blocksPerHour = 3600 / blockTimeSec;
      const globalHourlyOutput = blocksPerHour * blockReward;
      const yieldPerTH = globalHourlyOutput / networkHashrateTH;

      // 更新输入值
      setInputs((prev) => {
        const newInputs = { ...prev };
        if (yieldPerTH > 0 && isFinite(yieldPerTH)) {
          newInputs.hashrateYield = yieldPerTH;
        }
        if (price) {
          newInputs.coinPrice = price;
        }
        if (exchangeRate) {
          newInputs.exchangeRate = exchangeRate;
        }
        return newInputs;
      });

      if (price) {
        setPriceSource(source);
      }

      // 显示后端同步时间（Unix 时间戳，秒）
      if (lastSyncTs) {
        setLastSyncTime(formatSyncTime(lastSyncTs));
      }

      setSyncStatus('success');
      return true; // 请求成功
    } catch (error) {
      console.error('API Fetch Failed:', error);
      setSyncStatus('error');
      return false; // 请求失败
    }
  }, []);

  // 倒计时逻辑
  useEffect(() => {
    const timer = setInterval(async () => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // 倒计时到 0，发起请求
          fetchRealtimeData().then((success) => {
            if (success) {
              setCountdown(10); // 请求成功后重置倒计时
            }
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchRealtimeData]);

  // 格式化 Unix 时间戳为本地时间显示
  const formatSyncTime = (unixSec: number) => {
    const date = new Date(unixSec * 1000);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    const timeStr = date.toLocaleTimeString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    if (diffSec < 60) return `${timeStr} (${diffSec}s ago)`;
    if (diffMin < 60) return `${timeStr} (${diffMin}m ago)`;
    if (diffHour < 24) return `${timeStr} (${diffHour}h ago)`;
    return date.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 格式化数字
  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString('zh-CN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // 格式化金额（带货币符号）
  const formatCurrency = (num: number, decimals = 2) => {
    const symbol = currency === 'USD' ? '$' : '￥';
    return `${symbol}${formatNumber(num, decimals)}`;
  };

  const isBleeding = results.dailyNetRMB <= 0;

  return (
    <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden flex-grow w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6 sm:px-8 border-b-4 border-blue-500">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {t('title')}{' '}
              <span className="text-blue-400 text-lg align-top">Pro</span>
            </h1>
            <p className="text-gray-300 mt-2 text-sm font-medium">
              {t('subtitle')}
            </p>
          </div>
          <div className="hidden sm:flex sm:flex-col sm:items-end sm:gap-2">
            {/* 语言和货币切换 */}
            <div className="flex items-center gap-2">
              {/* 语言切换 */}
              <button
                onClick={() => setLocale('en')}
                className={`px-2 py-1 text-xs rounded ${
                  locale === 'en'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                EN / $
              </button>
              <button
                onClick={() => setLocale('zh')}
                className={`px-2 py-1 text-xs rounded ${
                  locale === 'zh'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                中文 / ￥
              </button>
            </div>
            <div className="text-gray-500 text-xs text-right">
              {t('storage')}: <span className="text-green-400 font-bold">{t('enabled')}</span>
              <br />
              {t('environment')}: Next.js + Vercel
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Left Column: Inputs */}
        <div className="w-full lg:w-1/3 p-6 sm:p-8 bg-gray-50 border-r border-gray-200">
          {/* 硬件部署参数区 */}
          <h2 className="text-md font-bold text-gray-800 mb-5 pb-2 border-b-2 border-gray-200 flex items-center">
            <svg
              className="w-5 h-5 mr-2 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
              />
            </svg>
            {t('hardware')}
          </h2>
          <div className="space-y-4 mb-10">
            <div className="input-group">
              <label>{t('gpuCount')}</label>
              <input
                type="number"
                value={inputs.gpuCount}
                step="1"
                min="1"
                onChange={(e) => handleInputChange('gpuCount', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="input-group">
                <label>{t('cardPrice')} ({currency})</label>
                <input
                  type="number"
                  value={inputs.cardPrice}
                  step="100"
                  onChange={(e) => handleInputChange('cardPrice', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>{t('residualValue')} ({currency})</label>
                <input
                  type="number"
                  value={inputs.residualValue}
                  step="100"
                  onChange={(e) => handleInputChange('residualValue', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="input-group">
                <label>{t('powerCons')}</label>
                <input
                  type="number"
                  value={inputs.powerCons}
                  step="10"
                  onChange={(e) => handleInputChange('powerCons', e.target.value)}
                />
              </div>
              <div className="input-group">
                <label>{t('gpuHashrate')}</label>
                <input
                  type="number"
                  value={inputs.gpuHashrate}
                  step="1"
                  onChange={(e) => handleInputChange('gpuHashrate', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 网络与市场参数区 */}
          <h2 className="text-md font-bold text-gray-800 mb-5 pb-2 border-b-2 border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
              {t('network')}
            </div>
          </h2>

          {/* 自动同步状态 */}
          <div className="mb-5 relative">
            <div className="w-full bg-gray-50 text-gray-600 font-medium py-2.5 px-4 border border-gray-200 rounded-lg text-sm flex justify-center items-center">
              <svg
                className={`w-4 h-4 mr-2 ${syncStatus === 'error' ? 'text-red-500' : isStale ? 'text-yellow-500' : 'text-green-500'}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>
                {syncStatus === 'error'
                  ? t('syncFailed')
                  : isStale
                  ? `${t('syncFailed')} (${countdown}s)`
                  : `${t('nextSync')}: ${countdown}s`}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1.5 px-1">
              <span
                className={`text-xs text-red-500 ${
                  syncStatus === 'error' ? '' : 'hidden'
                }`}
              >
                ❌ {t('syncError')}
              </span>
              {priceSource && syncStatus === 'success' && (
                <span className="text-xs text-green-600">
                  {t('priceSource')}: {priceSource}
                </span>
              )}
              <span className="text-[10px] text-gray-400 font-mono">
                {lastSyncTime ? `${t('lastSync')}: ${lastSyncTime}` : t('notSynced')}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="input-group relative">
              <div className="flex justify-between items-end mb-1">
                <label className="mb-0 text-indigo-700">
                  {t('hashrateYield')}
                </label>
                <span
                  className="text-xs text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded"
                >
                  {t('singleCardYield')}: {results.singleCardHourlyCoins.toFixed(5)}
                </span>
              </div>
              <input
                type="number"
                value={inputs.hashrateYield.toFixed(6)}
                step="0.000001"
                readOnly
                className="bg-gray-100 cursor-not-allowed"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="input-group">
                <label>{t('coinPrice')}</label>
                <input
                  type="number"
                  value={inputs.coinPrice.toFixed(4)}
                  step="0.001"
                  readOnly
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div className="input-group">
                <label>{t('poolFee')}</label>
                <input
                  type="number"
                  value={inputs.poolFee}
                  step="0.1"
                  onChange={(e) => handleInputChange('poolFee', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="input-group">
                <label>{t('electricityPrice')} ({currency === 'USD' ? 'USD/kWh' : 'CNY/kWh'})</label>
                <input
                  type="number"
                  value={inputs.electricityPrice}
                  step="0.01"
                  onChange={(e) =>
                    handleInputChange('electricityPrice', e.target.value)
                  }
                />
              </div>
              {currency === 'CNY' && (
                <div className="input-group">
                  <label>{t('exchangeRate')}</label>
                  <input
                    type="number"
                    value={inputs.exchangeRate.toFixed(2)}
                    step="0.01"
                    readOnly
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Results & Charts */}
        <div className="w-full lg:w-2/3 p-6 sm:p-8 flex flex-col bg-white">
          {/* 顶层汇总状态条 */}
          <div className="bg-gray-50 border border-gray-200 text-gray-600 text-sm px-5 py-3 rounded-lg mb-8 flex justify-between items-center shadow-sm">
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 uppercase tracking-wider">
                {t('totalHashrate')}
              </span>
              <strong className="text-gray-900 text-lg font-mono">
                {results.totalHashrate.toLocaleString()} TH/s
              </strong>
            </div>
            <div className="w-px h-8 bg-gray-300" />
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 uppercase tracking-wider">
                {t('totalPower')}
              </span>
              <strong className="text-gray-900 text-lg font-mono">
                {results.totalPowerKW.toFixed(2)} kW
              </strong>
            </div>
            <div className="w-px h-8 bg-gray-300" />
            <div className="flex flex-col text-right">
              <span className="text-xs text-gray-400 uppercase tracking-wider">
                {t('totalInvestment')}
              </span>
              <strong className="text-blue-600 text-lg font-mono">
                {formatCurrency(results.totalInvestment)}
              </strong>
            </div>
          </div>

          {/* Section 1: Financial Metrics */}
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <span className="bg-gray-800 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-2">
              1
            </span>{' '}
            {t('section1')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
            <div className="metric-card border-red-500">
              <div className="metric-title">{t('dailyElecCost')}</div>
              <div className="metric-value text-red-600">
                {formatCurrency(results.dailyElecCostRMB)}
              </div>
            </div>
            <div className="metric-card border-yellow-500">
              <div className="metric-title">{t('dailyGross')}</div>
              <div className="metric-value">
                {formatCurrency(results.dailyGrossRMB)}
              </div>
              {currency === 'CNY' && (
                <div className="text-xs text-gray-400 mt-1 font-mono">
                  ${formatNumber(results.dailyGrossUSDT, 4)}
                </div>
              )}
            </div>
            <div className="metric-card border-green-500 relative overflow-hidden">
              <div className="metric-title">{t('dailyNet')}</div>
              <div
                className={`metric-value ${
                  results.dailyNetRMB > 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(results.dailyNetRMB)}
              </div>
            </div>
            <div className="metric-card border-purple-500">
              <div className="metric-title">{t('costRatio')}</div>
              <div
                className={`metric-value ${
                  results.costRatio >= 100 ? 'text-red-600' : ''
                }`}
              >
                {results.costRatio.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Section 2: Payback Period */}
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <span className="bg-gray-800 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-2">
              2
            </span>{' '}
            {t('paybackTitle')}
          </h2>

          {/* Warning Banner */}
          {isBleeding && (
            <div
              className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm mb-6 transition-all"
              role="alert"
            >
              <div className="flex items-center">
                <svg
                  className="h-6 w-6 text-red-500 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p>
                  <strong className="font-bold">{t('bleedingWarning')}：</strong>{' '}
                  {t('bleedingMessage')}
                </p>
              </div>
            </div>
          )}

          <div
            className={`bg-gray-50 p-5 rounded-xl border border-gray-200 mb-10 shadow-inner ${
              isBleeding ? 'opacity-30 pointer-events-none' : ''
            }`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Full Payback */}
              <div>
                <h3 className="font-bold text-gray-800 mb-1">
                  {t('fullPayback')}
                </h3>
                <p className="text-xs text-gray-500 mb-4 border-b border-gray-200 pb-2">
                  {t('fullPaybackDesc')}
                </p>
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl font-black text-blue-600 tracking-tighter">
                    {isBleeding ? '-' : formatNumber(results.fullDays, 1)}
                  </span>
                  <span className="text-gray-600 font-bold">{t('days')}</span>
                  {!isBleeding && (
                    <span className="text-gray-400 text-sm ml-2 font-medium">
                      ({t('about')} {formatNumber(results.fullMonths, 1)} {t('months')})
                    </span>
                  )}
                </div>
              </div>

              {/* Residual Payback */}
              <div className="relative md:pl-8 md:border-l border-gray-200">
                <h3 className="font-bold text-gray-800 mb-1 flex items-center">
                  {t('residualPayback')}{' '}
                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded uppercase font-bold">
                    {t('recommended')}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mb-4 border-b border-gray-200 pb-2">
                  {t('residualPaybackDesc')}
                </p>
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl font-black text-green-600 tracking-tighter">
                    {isBleeding ? '-' : formatNumber(results.resDays, 1)}
                  </span>
                  <span className="text-gray-600 font-bold">{t('days')}</span>
                  {!isBleeding && (
                    <span className="text-gray-400 text-sm ml-2 font-medium">
                      ({t('about')} {formatNumber(results.resMonths, 1)} {t('months')})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Charts */}
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <span className="bg-gray-800 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-2">
              3
            </span>{' '}
            {t('chartTitle')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow">
            {/* Pie Chart */}
            <div className="bg-white p-4 border border-gray-100 rounded-xl shadow-sm flex flex-col hover:shadow-md transition-shadow">
              <h3 className="text-sm font-bold text-center text-gray-600 mb-4">
                {t('pieChart')}
              </h3>
              <div className="relative flex-grow min-h-[220px]">
                <canvas ref={compChartRef} />
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-white p-4 border border-gray-100 rounded-xl shadow-sm flex flex-col hover:shadow-md transition-shadow">
              <h3 className="text-sm font-bold text-center text-gray-600 mb-4">
                {t('barChart')}
              </h3>
              <div className="relative flex-grow min-h-[220px]">
                <canvas ref={projChartRef} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 p-4 text-center text-xs text-gray-400">
        <p>{t('footer')}</p>
      </div>
    </div>
  );
}
