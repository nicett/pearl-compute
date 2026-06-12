/**
 * UserConfig 字段的 Zod schema —— 整对象 PUT 用
 *
 * 与 prisma/schema.prisma 的 UserConfig 模型字段对齐
 * （updatedAt 由 Prisma @updatedAt 自动维护，不在 PUT 范围）
 */
import { z } from 'zod';

// 数值字段：非负 + 上界（防止前端发 Infinity / 极端值搞坏数据库）
const positiveNumber = z.number().finite().min(0).max(1e9);

export const userConfigUpsertSchema = z.object({
  gpuCount: positiveNumber.optional(),
  cardPrice: positiveNumber.optional(),
  residualValue: positiveNumber.optional(),
  powerCons: positiveNumber.optional(),
  gpuHashrate: positiveNumber.optional(),
  poolFee: z.number().finite().min(0).max(100).optional(),
  electricityPrice: positiveNumber.optional(),
  selectedPoolSlug: z.string().max(128).nullable().optional(),
  priceSource: z.string().max(64).optional(),
  currency: z.string().max(8).optional(),
});

export type UserConfigUpsert = z.infer<typeof userConfigUpsertSchema>;
