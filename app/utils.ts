import { Currency, Locale } from './types';
import { calcYieldPerTH as calcYieldPerTHPrecise } from './math';

/** Pearl 网络区块间隔（秒） */
export const BLOCK_TIME_SEC = 124.77;

/**
 * 格式化数字（千分位 + 固定小数位）
 */
export function formatNumber(num: number, decimals = 2): string {
  if (!isFinite(num)) return '--';
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * 格式化金额（带货币符号）
 */
export function formatCurrency(num: number, currency: Currency, decimals = 2): string {
  const symbol = currency === 'USD' ? '$' : '￥';
  return `${symbol}${formatNumber(num, decimals)}`;
}

/**
 * 从 Unix 时间戳（秒）格式化为本地时间显示
 */
export function formatSyncTime(unixSec: number, locale: Locale): string {
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
  if (diffSec < 60) return `${timeStr} (${diffSec}s ago)`;
  if (diffMin < 60) return `${timeStr} (${diffMin}m ago)`;
  if (diffHour < 24) return `${timeStr} (${diffHour}h ago)`;
  return date.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 从网络哈希率字符串解析 TH 值
 * 支持 EH/TH/GH/MH 单位
 */
export function parseNetworkHashrate(hashStr: string): number {
  const match = hashStr.match(/([\d.]+)\s*(EH|TH|GH|MH)/i);
  if (!match) {
    if (hashStr) console.warn(`[parseNetworkHashrate] 无法解析: "${hashStr}"，使用默认值`);
    return 19.86 * 1000000; // 默认值
  }

  const value = parseFloat(match[1]);
  if (isNaN(value)) {
    console.warn(`[parseNetworkHashrate] parseFloat 返回 NaN: "${match[1]}"`);
    return 19.86 * 1000000;
  }

  const unit = match[2].toUpperCase();
  const multipliers: Record<string, number> = {
    EH: 1000000,
    TH: 1,
    GH: 0.001,
    MH: 0.000001,
  };
  return value * (multipliers[unit] || 1);
}

/**
 * 计算每 TH 时产（使用 mathjs 精确计算）
 */
export const calcYieldPerTH = calcYieldPerTHPrecise;
