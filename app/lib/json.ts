/**
 * BigInt 安全的 JSON 序列化
 *
 * Prisma 返回的 BigInt 字段 JSON.stringify 直接抛错。
 * 这里把 BigInt 转字符串（前端按需 parse 回 BigInt 或当字符串展示）
 */
export function bigintToString<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)),
  ) as T;
}
