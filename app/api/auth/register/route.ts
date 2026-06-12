/**
 * 用户注册接口
 *
 * Auth.js v5 本身不管注册（Credentials Provider 只验密码），
 * 因此需要自定义接口：校验输入 → Argon2 哈希 → 写入 User + UserConfig。
 *
 * 安全要点：
 * - 用户名/邮箱重复时返回模糊错误（防枚举）
 * - 仅返回 { ok: true }，不返回 user.id 等任何内部信息
 * - 不在此处自动登录；前端拿到 ok 后跳转 /login 或直接调用 signIn
 */
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/app/lib/db';
import { hashPassword } from '@/app/lib/password';
import { registerInputSchema } from '@/app/lib/validators/auth';

export const runtime = 'nodejs'; // argon2 是 native module，不能跑在 edge

const GENERIC_ERROR = '注册失败，请检查输入或稍后重试';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  const parsed = registerInputSchema.safeParse(body);
  if (!parsed.success) {
    // 把 Zod 第一条错误透传给前端，便于用户修正
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? GENERIC_ERROR }, { status: 400 });
  }

  const { username, password, email } = parsed.data;

  try {
    const passwordHash = await hashPassword(password);

    // 同时创建 User + UserConfig（事务）
    await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        config: { create: {} }, // 走 schema 的 default 值
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    // P2002 = unique constraint violation（username 或 email 已被占用）
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      // 返回 409 + 模糊错误：不告诉攻击者具体哪个字段冲突
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 409 });
    }
    console.error('[register] unexpected error:', e);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
  }
}
