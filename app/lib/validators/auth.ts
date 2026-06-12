/**
 * 用户输入校验 schema — Zod
 *
 * 用户名规则：3-32 字符，字母/数字/下划线/连字符
 * 密码规则：8-128 字符，至少含一个字母 + 一个数字（避免 12345678 这种）
 * 邮箱：v1 选填；v2 接交易所时强制要求并验证
 */
import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .min(3, '用户名至少 3 个字符')
  .max(32, '用户名最多 32 个字符')
  .regex(/^[a-zA-Z0-9_-]+$/, '用户名只能包含字母、数字、下划线、连字符');

export const passwordSchema = z
  .string()
  .min(8, '密码至少 8 个字符')
  .max(128, '密码最多 128 个字符')
  .regex(/[a-zA-Z]/, '密码必须含至少一个字母')
  .regex(/[0-9]/, '密码必须含至少一个数字');

export const emailSchema = z.string().trim().toLowerCase().email('邮箱格式不正确');

export const registerInputSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  email: emailSchema.optional(),
});

export const loginInputSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
