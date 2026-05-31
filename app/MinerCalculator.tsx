'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
import { useI18n } from './i18n/context';
import { useTheme } from './theme/context';

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
  const { theme, resolvedTheme, setTheme } = useTheme();

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
  const [lastSyncTs, setLastSyncTs] = useState<number | null>(null);
  const [priceSource, setPriceSource] = useState<string | null>(initialData.priceSource);
  const [countdown, setCountdown] = useState(10);
  const [isStale, setIsStale] = useState(false);

  // 多价格来源（可扩展数组，每项 { name, price }）
  const [allPrices, setAllPrices] = useState<Array<{ name: string; price: number }>>([]);

  // 图表引用
  const compChartRef = useRef<HTMLCanvasElement>(null);
  const projChartRef = useRef<HTMLCanvasElement>(null);
  const compChartInstance = useRef<Chart | null>(null);
  const projChartInstance = useRef<Chart | null>(null);

  // 效能分析 - 运行周期（月）
  const [effMonths, setEffMonths] = useState(6); // 默认 6 个月

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
    costEff: 0,
    powerEff: 0,
    longTermEff: 0,
    longTermElecCost: 0,
    shutdownPrice: 0,
    dailyROI: 0,
    annualizedROI: 0,
    yearlyROI: 0,
    profitMultiple: 0,
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
    Chart.defaults.color = resolvedTheme === 'dark' ? '#94a3b8' : '#6b7280';

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
            label: t('cumulativeNet'),
            data: [0, 0, 0, 0],
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderRadius: 4,
            order: 2,
          },
          {
            label: t('depreciationExposure'),
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
          y: { beginAtZero: true, grid: { color: resolvedTheme === 'dark' ? '#334155' : '#f3f4f6' } },
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

  // 语言切换时更新图表标签
  useEffect(() => {
    if (compChartInstance.current) {
      compChartInstance.current.data.labels = [t('dailyElecCost'), t('dailyNet')];
      compChartInstance.current.update('none');
    }
    if (projChartInstance.current) {
      projChartInstance.current.data.labels = [`30 ${t('days')}`, `90 ${t('days')}`, `180 ${t('days')}`, `365 ${t('days')}`];
      projChartInstance.current.data.datasets[0].label = t('cumulativeNet');
      projChartInstance.current.data.datasets[1].label = t('depreciationExposure');
      projChartInstance.current.update('none');
    }
  }, [t]);

  // 主题切换时更新图表颜色
  useEffect(() => {
    Chart.defaults.color = resolvedTheme === 'dark' ? '#94a3b8' : '#6b7280';
    if (projChartInstance.current) {
      if (projChartInstance.current.options.scales?.y?.grid) {
        projChartInstance.current.options.scales.y.grid.color = resolvedTheme === 'dark' ? '#334155' : '#f3f4f6';
      }
      projChartInstance.current.update('none');
    }
    if (compChartInstance.current) {
      compChartInstance.current.update('none');
    }
  }, [resolvedTheme]);

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

    // 效能分析
    // 1. 性价比：算力 / 价格 (TH/货币，越高越好)
    const costEff = cardPrice > 0 ? gpuHashrate / cardPrice : 0;

    // 2. 能效比：算力 / 功耗 (TH/W，越高越好)
    const powerEff = powerCons > 0 ? gpuHashrate / powerCons : 0;

    // 3. 长期运营性价比：算力 / (采购价 + 周期电费)
    const totalHours = effMonths * 30 * 24; // 月 → 小时
    const powerKW = powerCons / 1000;
    const longTermElecCost = powerKW * totalHours * elecPrice;
    const longTermTotal = cardPrice + longTermElecCost;
    const longTermEff = longTermTotal > 0 ? gpuHashrate / longTermTotal : 0;

    // 关机币价（USDT）：每日电费 = 每日毛产出时的币价
    // dailyElecCost = totalHashrate * hashrateYield * 24 * (1 - poolFee/100) * shutdownPrice
    const effectiveYield = totalHashrate * hashrateYield * 24 * (1 - poolFee / 100);
    // CNY 模式需将电费转换为 USD，与币价（USDT）单位一致
    const dailyElecCostUSD = isUSD ? dailyElecCost : dailyElecCost / safeRate;
    const shutdownPrice = effectiveYield > 0 ? dailyElecCostUSD / effectiveYield : 0;

    // 投资回报率指标
    const dailyROI = totalInvestment > 0 ? (dailyNet / totalInvestment) * 100 : 0;
    const annualizedROI = dailyROI * 365;
    const annualNet = dailyNet * 365;
    const depreciation = totalInvestment - totalResidual;
    const yearlyROI = totalInvestment > 0 ? ((annualNet - depreciation) / totalInvestment) * 100 : 0;
    const profitMultiple = totalInvestment > 0 ? annualNet / totalInvestment : 0;

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
      costEff,
      powerEff,
      longTermEff,
      longTermElecCost,
      shutdownPrice,
      dailyROI,
      annualizedROI,
      yearlyROI,
      profitMultiple,
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
      const projData = [dailyNet * 30, dailyNet * 90, dailyNet * 180, dailyNet * 365];
      projChartInstance.current.data.datasets[0].data = projData;
      projChartInstance.current.data.datasets[1].data = [
        totalRiskExposure,
        totalRiskExposure,
        totalRiskExposure,
        totalRiskExposure,
      ];
      projChartInstance.current.update();
    }
  }, [inputs, saveSettings, effMonths]);

  // 处理输入变化
  const handleInputChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setInputs((prev) => ({ ...prev, [field]: numValue }));
  };

  // 从 API 同步数据（静默模式）
  const fetchRealtimeData = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`/api/stats?t=${Date.now()}`);

      // 即使返回 502，也可能有缓存数据
      const data = await response.json();

      // 检查是否有错误
      if (data.error) {
        console.warn('API returned error:', data.error);
        // 如果有最后同步时间（Unix 时间戳），显示它
        if (data.lastSuccessfulFetchTime) {
          setLastSyncTs(data.lastSuccessfulFetchTime);
        }
        setSyncStatus('error');
        setIsStale(true);
        return false;
      }

      // 检查是否使用了过期缓存
      setIsStale(data.stale === true);

      const coinData = data.coins?.[0] || {};
      const exchangeRate = data.exchangeRate || null;
      const lastSyncTsNew = data.lastSyncTime || null;

      // 解析多价格来源（可扩展）
      const priceList: Array<{ name: string; price: number }> = [];
      if (data.prices?.pearlOtc?.price) {
        priceList.push({ name: 'Pearl OTC', price: data.prices.pearlOtc.price });
      }
      if (data.prices?.safetrade?.price) {
        priceList.push({ name: 'SafeTrade', price: data.prices.safetrade.price });
      }
      setAllPrices(priceList);

      // 默认使用 Pearl OTC 价格，回退到第一个可用来源
      const selectedPrice = priceList.find(p => p.name === 'Pearl OTC')?.price
        || priceList[0]?.price
        || coinData.price
        || null;
      const sourceName = priceList.find(p => p.name === 'Pearl OTC')?.name
        || priceList[0]?.name
        || data.priceSource
        || 'unknown';

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

      // 显示后端同步时间（Unix 时间戳，秒）
      if (lastSyncTsNew) {
        setLastSyncTs(lastSyncTsNew);
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
  const fetchingRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1 && !fetchingRef.current) {
          fetchingRef.current = true;
          fetchRealtimeData().then((success) => {
            fetchingRef.current = false;
            setCountdown(10);
          });
          return 0;
        }
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchRealtimeData]);

  // 从 Unix 时间戳计算本地时间显示（每次渲染都重新计算）
  const formatSyncTime = (unixSec: number) => {
    const date = new Date(unixSec * 1000);
    const now = Date.now();
    const diffSec = Math.floor((now - date.getTime()) / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    const timeStr = date.toLocaleTimeString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    if (diffSec < 0) return timeStr;
    if (diffSec < 60) return `${timeStr} (${diffSec}${t('agoS')})`;
    if (diffMin < 60) return `${timeStr} (${diffMin}${t('agoM')})`;
    if (diffHour < 24) return `${timeStr} (${diffHour}${t('agoH')})`;
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
          <div className="flex flex-col items-end gap-2">
            {/* 桌面端：按钮组 */}
            <div className="hidden sm:flex items-center gap-2">
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
              <div className="w-px h-4 bg-gray-600" />
              <button
                onClick={() => setTheme('light')}
                title={t('themeLight')}
                className={`p-1 rounded ${theme === 'light' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" strokeWidth="2" /><path strokeWidth="2" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
              </button>
              <button
                onClick={() => setTheme('dark')}
                title={t('themeDark')}
                className={`p-1 rounded ${theme === 'dark' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
              </button>
              <button
                onClick={() => setTheme('system')}
                title={t('themeSystem')}
                className={`p-1 rounded ${theme === 'system' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="2" /><path strokeWidth="2" d="M8 21h8M12 17v4" /></svg>
              </button>
            </div>
            {/* 手机端：下拉选择 */}
            <div className="flex sm:hidden items-center gap-2">
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value as 'en' | 'zh')}
                className="bg-gray-700 text-gray-200 text-xs px-2 py-1 rounded border-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="en">EN / $</option>
                <option value="zh">中文 / ￥</option>
              </select>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
                className="bg-gray-700 text-gray-200 text-xs px-2 py-1 rounded border-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="light">☀️ {t('themeLight')}</option>
                <option value="dark">🌙 {t('themeDark')}</option>
                <option value="system">💻 {t('themeSystem')}</option>
              </select>
            </div>
            <div className="text-gray-500 dark:text-gray-400 text-xs text-right hidden sm:block">
              {t('storage')}: <span className="text-green-400 font-bold">{t('enabled')}</span>
              <br />
              {t('environment')}: Next.js + Cloudflare Pages
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Left Column: Inputs */}
        <div className="w-full lg:w-1/3 p-6 sm:p-8 bg-gray-50 dark:bg-slate-900 border-r border-gray-200 dark:border-gray-700">
          {/* 硬件部署参数区 */}
          <h2 className="text-md font-bold text-gray-800 dark:text-gray-100 mb-5 pb-2 border-b-2 border-gray-200 dark:border-gray-700 flex items-center">
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

          {/* 硬件效能分析 */}
          <div className="mb-8 p-4 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('efficiencyTitle')}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{t('effHigher')}</span>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3">{t('effSingleCard')}</p>
            <div className="grid grid-cols-3 gap-3 mb-3 items-stretch">
              {/* 性价比 */}
              <div className="group relative text-center p-2 bg-white dark:bg-slate-700 rounded-lg border border-gray-100 dark:border-gray-600">
                <div className="relative h-[2.5rem] flex items-center justify-center mb-1">
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center justify-center gap-1">
                    {t('costEff')}
                    <svg className="w-3 h-3 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 dark:bg-gray-600 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {t('gpuHashrate')} ÷ {t('cardPrice')}
                    <br />{t('costEffDesc')}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-600" />
                  </div>
                </div>
                <div className="text-lg font-black text-indigo-700 dark:text-indigo-400 font-mono">
                  {results.costEff.toFixed(4)}
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500">TH/{currency}</div>
              </div>
              {/* 能效比 */}
              <div className="group relative text-center p-2 bg-white dark:bg-slate-700 rounded-lg border border-gray-100 dark:border-gray-600">
                <div className="relative h-[2.5rem] flex items-center justify-center mb-1">
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center justify-center gap-1">
                    {t('powerEff')}
                    <svg className="w-3 h-3 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 dark:bg-gray-600 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {t('gpuHashrate')} ÷ {t('powerCons')}
                    <br />{t('powerEffDesc')}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-600" />
                  </div>
                </div>
                <div className="text-lg font-black text-indigo-700 dark:text-indigo-400 font-mono">
                  {results.powerEff.toFixed(3)}
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500">TH/W</div>
              </div>
              {/* 长期运营性价比 */}
              <div className="group relative text-center p-2 bg-white dark:bg-slate-700 rounded-lg border border-indigo-200 dark:border-indigo-700">
                <div className="relative h-[2.5rem] flex items-center justify-center mb-1">
                  <div className="text-[9px] text-indigo-500 dark:text-indigo-400 uppercase tracking-wider font-bold flex items-center justify-center gap-1 leading-tight">
                    {t('longTermEff')}
                    <svg className="w-3 h-3 text-indigo-300 dark:text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 dark:bg-gray-600 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {t('gpuHashrate')} ÷ ({t('cardPrice')} + {t('powerCons')}/1000 × {effMonths}{t('months')}×30×24 × {t('electricityPrice')})
                    <br />{t('longTermEffDesc')}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-600" />
                  </div>
                </div>
                <div className="text-lg font-black text-indigo-700 dark:text-indigo-400 font-mono">
                  {results.longTermEff.toFixed(4)}
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500">TH/{currency}</div>
              </div>
            </div>
            {/* 运行周期下拉框 */}
            <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
              <span>{t('effPeriod')}:</span>
              <select
                value={effMonths}
                onChange={(e) => setEffMonths(parseInt(e.target.value))}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-xs bg-white dark:bg-slate-700 dark:text-gray-200 focus:outline-none focus:border-indigo-400"
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12,18,24,30,36].map(m => (
                  <option key={m} value={m}>{m} {t('months')}</option>
                ))}
              </select>
              <span className="text-gray-400">|</span>
              <span>{t('tcoElectricity')}: <strong className="text-gray-700 dark:text-gray-300">{formatCurrency(results.longTermElecCost)}</strong></span>
            </div>
          </div>

          {/* 网络与市场参数区 */}
          <h2 className="text-md font-bold text-gray-800 dark:text-gray-100 mb-5 pb-2 border-b-2 border-gray-200 dark:border-gray-700 flex items-center justify-between">
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
            <div className="w-full bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-medium py-2.5 px-4 border border-gray-200 dark:border-gray-700 rounded-lg text-sm flex justify-center items-center">
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
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                {lastSyncTs ? `${t('lastSync')}: ${formatSyncTime(lastSyncTs)}` : t('notSynced')}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="input-group relative">
              <div className="flex justify-between items-end mb-1">
                <label className="mb-0 text-indigo-700 dark:text-indigo-400">
                  {t('hashrateYield')}
                </label>
                <span
                  className="text-xs text-indigo-500 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded"
                >
                  {t('singleCardYield')}: {results.singleCardHourlyCoins.toFixed(5)}
                </span>
              </div>
              <input
                type="number"
                value={inputs.hashrateYield.toFixed(6)}
                step="0.000001"
                readOnly
                className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
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
                  className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                />
                {/* 多来源价格展示 */}
                {allPrices.length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                    {allPrices.map((p) => (
                      <span key={p.name} className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                        {p.name}: <span className="font-bold text-gray-700 dark:text-gray-300">{p.price.toFixed(4)}</span>
                      </span>
                    ))}
                  </div>
                )}
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
                    className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Results & Charts */}
        <div className="w-full lg:w-2/3 p-6 sm:p-8 flex flex-col bg-white dark:bg-slate-800">
          {/* 顶层汇总状态条 */}
          <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm px-5 py-3 rounded-lg mb-8 flex justify-between items-center shadow-sm">
            <div className="group relative flex flex-col">
              <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
                {t('totalHashrate')}
                <svg className="w-3 h-3 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
              </span>
              <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-800 dark:bg-gray-600 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {t('tipTotalHashrate')}
                <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-800 dark:border-t-gray-600" />
              </div>
              <strong className="text-gray-900 dark:text-gray-100 text-lg font-mono">
                {results.totalHashrate.toLocaleString()} TH/s
              </strong>
            </div>
            <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />
            <div className="group relative flex flex-col">
              <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
                {t('totalPower')}
                <svg className="w-3 h-3 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
              </span>
              <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-800 dark:bg-gray-600 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {t('tipTotalPower')}
                <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-800 dark:border-t-gray-600" />
              </div>
              <strong className="text-gray-900 dark:text-gray-100 text-lg font-mono">
                {results.totalPowerKW.toFixed(2)} kW
              </strong>
            </div>
            <div className="w-px h-8 bg-gray-300 dark:bg-gray-600" />
            <div className="group relative flex flex-col text-right">
              <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center justify-end gap-1">
                {t('totalInvestment')}
                <svg className="w-3 h-3 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
              </span>
              <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 dark:bg-gray-600 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {t('tipTotalInvestment')}
                <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-800 dark:border-t-gray-600" />
              </div>
              <strong className="text-blue-600 dark:text-blue-400 text-lg font-mono">
                {formatCurrency(results.totalInvestment)}
              </strong>
            </div>
          </div>

          {/* Section 1: Financial Metrics */}
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
            <span className="bg-gray-800 dark:bg-gray-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-2">
              1
            </span>{' '}
            {t('section1')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
            <div className="group metric-card border-red-500 relative">
              <div className="absolute top-2 right-2">
                <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {t('tipDailyElecCost')}
                  <div className="absolute top-full right-2 border-4 border-transparent border-t-gray-800" />
                </div>
              </div>
              <div className="metric-title">{t('dailyElecCost')}</div>
              <div className="metric-value text-red-600">
                {formatCurrency(results.dailyElecCostRMB)}
              </div>
            </div>
            <div className="group metric-card border-yellow-500 relative">
              <div className="absolute top-2 right-2">
                <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {t('tipDailyGross')}
                  <div className="absolute top-full right-2 border-4 border-transparent border-t-gray-800" />
                </div>
              </div>
              <div className="metric-title">{t('dailyGross')}</div>
              <div className="metric-value">
                {formatCurrency(results.dailyGrossRMB)}
              </div>
              {currency === 'CNY' && (
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
                  ${formatNumber(results.dailyGrossUSDT, 4)}
                </div>
              )}
            </div>
            <div className="group metric-card border-green-500 relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {t('tipDailyNet')}
                  <div className="absolute top-full right-2 border-4 border-transparent border-t-gray-800" />
                </div>
              </div>
              <div className="metric-title">{t('dailyNet')}</div>
              <div
                className={`metric-value ${
                  results.dailyNetRMB > 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(results.dailyNetRMB)}
              </div>
            </div>
            <div className="group metric-card border-purple-500 relative">
              <div className="absolute top-2 right-2">
                <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {t('tipCostRatio')}
                  <div className="absolute top-full right-2 border-4 border-transparent border-t-gray-800" />
                </div>
              </div>
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
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
            <span className="bg-gray-800 dark:bg-gray-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-2">
              2
            </span>{' '}
            {t('paybackTitle')}
          </h2>

          {/* Warning Banner */}
          {isBleeding && (
            <div
              className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 p-4 rounded shadow-sm mb-6 transition-all"
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
            className={`bg-gray-50 dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-gray-700 mb-10 shadow-inner ${
              isBleeding ? 'opacity-30 pointer-events-none' : ''
            }`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Full Payback */}
              <div className="group relative">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-1">
                  {t('fullPayback')}
                  <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                  <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-800 dark:bg-gray-600 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {t('tipFullPayback')}
                    <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-800 dark:border-t-gray-600" />
                  </div>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                  {t('fullPaybackDesc')}
                </p>
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">
                    {isBleeding ? '-' : formatNumber(results.fullDays, 1)}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300 font-bold">{t('days')}</span>
                  {!isBleeding && (
                    <span className="text-gray-400 dark:text-gray-500 text-sm ml-2 font-medium">
                      ({t('about')} {formatNumber(results.fullMonths, 1)} {t('months')})
                    </span>
                  )}
                </div>
              </div>

              {/* Residual Payback */}
              <div className="group relative md:pl-8 md:border-l border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-1">
                  {t('residualPayback')}{' '}
                  <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] rounded uppercase font-bold">
                    {t('recommended')}
                  </span>
                  <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                  <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-800 dark:bg-gray-600 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    {t('tipResPayback')}
                    <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-800 dark:border-t-gray-600" />
                  </div>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                  {t('residualPaybackDesc')}
                </p>
                <div className="flex items-baseline space-x-2">
                  <span className="text-4xl font-black text-green-600 dark:text-green-400 tracking-tighter">
                    {isBleeding ? '-' : formatNumber(results.resDays, 1)}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300 font-bold">{t('days')}</span>
                  {!isBleeding && (
                    <span className="text-gray-400 dark:text-gray-500 text-sm ml-2 font-medium">
                      ({t('about')} {formatNumber(results.resMonths, 1)} {t('months')})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ROI Metrics */}
            <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Daily ROI */}
                <div className="group metric-card border-blue-500 relative">
                  <div className="absolute top-2 right-2">
                    <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                    <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 dark:bg-gray-600 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-normal w-52 z-10">
                      {t('tipDailyROI')}
                      <div className="absolute top-full right-2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-600" />
                    </div>
                  </div>
                  <div className="metric-title">{t('dailyROI')}</div>
                  <div className={`metric-value ${results.dailyROI >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600'}`}>
                    {isBleeding ? '-' : `${results.dailyROI.toFixed(3)}%`}
                  </div>
                </div>
                {/* Annualized ROI */}
                <div className="group metric-card border-indigo-500 relative">
                  <div className="absolute top-2 right-2">
                    <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                    <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 dark:bg-gray-600 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-normal w-52 z-10">
                      {t('tipAnnualizedROI')}
                      <div className="absolute top-full right-2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-600" />
                    </div>
                  </div>
                  <div className="metric-title">{t('annualizedROI')}</div>
                  <div className={`metric-value ${results.annualizedROI >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600'}`}>
                    {isBleeding ? '-' : `${results.annualizedROI.toFixed(1)}%`}
                  </div>
                </div>
                {/* 1Y ROI */}
                <div className="group metric-card border-teal-500 relative">
                  <div className="absolute top-2 right-2">
                    <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                    <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 dark:bg-gray-600 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-normal w-52 z-10">
                      {t('tipYearlyROI')}
                      <div className="absolute top-full right-2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-600" />
                    </div>
                  </div>
                  <div className="metric-title">{t('yearlyROI')}</div>
                  <div className={`metric-value ${results.yearlyROI >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-red-600'}`}>
                    {isBleeding ? '-' : `${results.yearlyROI.toFixed(1)}%`}
                  </div>
                </div>
                {/* Profit Multiple */}
                <div className="group metric-card border-amber-500 relative">
                  <div className="absolute top-2 right-2">
                    <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                    <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 dark:bg-gray-600 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-normal w-52 z-10">
                      {t('tipProfitMultiple')}
                      <div className="absolute top-full right-2 border-4 border-transparent border-t-gray-800 dark:border-t-gray-600" />
                    </div>
                  </div>
                  <div className="metric-title">{t('profitMultiple')}</div>
                  <div className={`metric-value ${results.profitMultiple >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600'}`}>
                    {isBleeding ? '-' : `${results.profitMultiple.toFixed(2)}x`}
                  </div>
                </div>
              </div>
            </div>

            {/* Shutdown Price Gauge */}
            {results.shutdownPrice > 0 && (() => {
              const sp = results.shutdownPrice;
              const cp = inputs.coinPrice;
              const safetyMargin = ((cp - sp) / sp) * 100;
              const zone = safetyMargin > 20 ? 'safe' : safetyMargin > 0 ? 'warning' : 'danger';
              const zoneColor = zone === 'safe' ? 'text-green-600 dark:text-green-400' : zone === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400';
              const zoneBg = zone === 'safe' ? 'bg-green-500' : zone === 'warning' ? 'bg-yellow-500' : 'bg-red-500';

              // Scale: left = maxPrice (safe), right = 0 (danger)
              const maxPrice = Math.max(cp * 1.1, sp * 2.5);
              // Invert: higher price → left (small pct from right)
              const currentPct = 100 - Math.min((cp / maxPrice) * 100, 100);
              const shutdownPct = 100 - Math.min((sp / maxPrice) * 100, 100);
              const warnPct = 100 - Math.min((sp * 1.2 / maxPrice) * 100, 100);

              return (
                <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="group relative flex items-center gap-1.5">
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{t('shutdownPrice')}</span>
                      <svg className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 cursor-help" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                      <div className="absolute bottom-full left-0 mb-2 px-3 py-2.5 bg-gray-800 dark:bg-gray-600 text-white text-[11px] leading-relaxed rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-normal w-64 z-10">
                        {t('tipShutdownPrice')}
                        <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-800 dark:border-t-gray-600" />
                      </div>
                    </div>
                    <div className={`text-sm font-bold ${zoneColor}`}>
                      {zone === 'danger' ? t('bleedingWarning') : `${safetyMargin > 0 ? '+' : ''}${safetyMargin.toFixed(1)}%`}
                    </div>
                  </div>

                  {/* Gauge Bar */}
                  <div className="relative mx-1" style={{ height: '52px' }}>
                    {/* Background zones */}
                    <div className="absolute inset-0 rounded-lg overflow-hidden">
                      {/* Safe zone: left (high price) → warning boundary */}
                      <div className="absolute inset-y-0 left-0 bg-green-100 dark:bg-green-900/20" style={{ width: `${warnPct}%` }} />
                      {/* Warning zone: warning boundary → shutdown boundary */}
                      <div className="absolute inset-y-0 bg-yellow-200 dark:bg-yellow-900/40" style={{ left: `${warnPct}%`, width: `${shutdownPct - warnPct}%` }} />
                      {/* Danger zone: shutdown boundary → right (low price) */}
                      <div className="absolute inset-y-0 right-0 bg-red-200 dark:bg-red-900/40" style={{ width: `${100 - shutdownPct}%` }} />
                    </div>

                    {/* Current price marker */}
                    <div className="absolute top-0 bottom-0 z-20" style={{ left: `${currentPct}%` }}>
                      <div className={`absolute top-0 bottom-0 w-0.5 ${zoneBg}`} />
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <span className={`text-[11px] font-bold font-mono ${zoneColor} whitespace-nowrap`}>{cp.toFixed(4)}</span>
                        <span className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-current" style={{ color: 'inherit' }} />
                      </div>
                    </div>

                    {/* Shutdown price marker */}
                    <div className="absolute top-0 bottom-0 z-10" style={{ left: `${shutdownPct}%` }}>
                      <div className="absolute top-0 bottom-0 w-0.5 bg-red-500" />
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <span className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[4px] border-l-transparent border-r-transparent border-b-red-500" />
                        <span className="text-[11px] font-mono text-red-600 dark:text-red-400 whitespace-nowrap">{sp.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-between mt-8 text-[11px] text-gray-400 dark:text-gray-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-400 dark:bg-green-500" />
                        <span>{t('zoneSafe')} &gt;20%</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 dark:bg-yellow-500" />
                        <span>{t('zoneCaution')} 0~20%</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400 dark:bg-red-500" />
                        <span>{t('zoneDanger')} &lt;0%</span>
                      </span>
                    </div>
                    <span className="font-mono text-[10px]">
                      {t('shutdownPrice')}: {sp.toFixed(4)} USDT
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Section 3: Charts */}
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
            <span className="bg-gray-800 dark:bg-gray-600 text-white w-6 h-6 rounded-full inline-flex items-center justify-center text-xs mr-2">
              3
            </span>{' '}
            {t('chartTitle')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow">
            {/* Pie Chart */}
            <div className="bg-white dark:bg-slate-700 p-4 border border-gray-100 dark:border-gray-600 rounded-xl shadow-sm flex flex-col hover:shadow-md transition-shadow">
              <h3 className="text-sm font-bold text-center text-gray-600 dark:text-gray-300 mb-4">
                {t('pieChart')}
              </h3>
              <div className="relative flex-grow min-h-[220px]">
                <canvas ref={compChartRef} />
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-white dark:bg-slate-700 p-4 border border-gray-100 dark:border-gray-600 rounded-xl shadow-sm flex flex-col hover:shadow-md transition-shadow">
              <h3 className="text-sm font-bold text-center text-gray-600 dark:text-gray-300 mb-4">
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
      <div className="bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-gray-700 p-4 text-center text-xs text-gray-400 dark:text-gray-500">
        <p>{t('footer')}</p>
      </div>
    </div>
  );
}
