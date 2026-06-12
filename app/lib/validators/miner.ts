/**
 * MinerBinding 输入校验
 *
 * - poolSlug：必须在注册表白名单
 * - walletAddr：trim + 通过矿池的 addressRegex 校验
 * - label：可选，长度上限避免滥用
 */
import { z } from 'zod';

import { getPoolBySlug } from '@/app/lib/pools/registry';

export const minerBindingCreateSchema = z
  .object({
    poolSlug: z.string().trim().min(1).max(64),
    walletAddr: z.string().trim().min(8).max(256),
    label: z.string().trim().max(64).optional().or(z.literal('')),
  })
  .refine((data) => getPoolBySlug(data.poolSlug) !== null, {
    message: '不支持的矿池',
    path: ['poolSlug'],
  })
  .refine(
    (data) => {
      const pool = getPoolBySlug(data.poolSlug);
      if (!pool?.addressRegex) return true;
      return pool.addressRegex.test(data.walletAddr);
    },
    { message: '钱包地址格式不正确', path: ['walletAddr'] },
  );

export type MinerBindingCreateInput = z.infer<typeof minerBindingCreateSchema>;
