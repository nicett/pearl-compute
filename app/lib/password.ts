/**
 * 密码哈希工具 — Argon2id
 *
 * OWASP 推荐参数（2025）：t=3, m=2^16 (64MB), p=1
 * 单次哈希 ~80ms，足以抵抗 GPU 暴力破解，又不会拖垮 1000 用户量级的服务器。
 */
import argon2 from 'argon2';

const OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16,
  timeCost: 3,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, OPTIONS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, plain).catch(() => false);
}
