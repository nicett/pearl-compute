/**
 * AlertRule 输入校验
 *
 * 三种预警类型：
 * - PRICE_ABOVE: 价格 > threshold (USD)
 * - PRICE_BELOW: 价格 < threshold (USD)
 * - SHUTDOWN_NEAR: 当前价距离用户的关机价低于 threshold % （v1.5 实现，本期占位）
 *
 * priceSource: null = 任意数据源命中即触发；指定值时仅匹配该源
 */
import { z } from 'zod';

export const ALERT_TYPES = ['PRICE_ABOVE', 'PRICE_BELOW', 'SHUTDOWN_NEAR'] as const;
export const PRICE_SOURCES = ['Pearl OTC', 'SafeTrade', 'OKX Web3'] as const;

export const alertRuleCreateSchema = z.object({
  type: z.enum(ALERT_TYPES),
  threshold: z.number().finite().min(0).max(1e9),
  priceSource: z.enum(PRICE_SOURCES).nullable().optional(),
  enabled: z.boolean().optional(),
  cooldownMin: z.number().int().min(1).max(1440).optional(), // 1 分钟 ~ 24 小时
});

export const alertRuleUpdateSchema = alertRuleCreateSchema.partial();

export type AlertRuleCreateInput = z.infer<typeof alertRuleCreateSchema>;
export type AlertRuleUpdateInput = z.infer<typeof alertRuleUpdateSchema>;
