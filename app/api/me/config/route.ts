/**
 * 用户计算器配置 - 云端同步
 *
 * - GET: 拿当前用户的配置；首次访问会自动用默认值 upsert 一条记录
 * - PUT: 整对象更新（前端 debounce 后整对象发送，避免 PATCH 并发冲突）
 *
 * 鉴权：从 session 拿 user.id；未登录返回 401
 */
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { userConfigUpsertSchema } from '@/app/lib/validators/config';

export const runtime = 'nodejs';

const UNAUTHORIZED = NextResponse.json({ error: '未登录' }, { status: 401 });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return UNAUTHORIZED;

  // 用 upsert 避免首次登录时记录不存在 —— 注册时其实已经 create 过，但保险起见
  const config = await prisma.userConfig.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id },
    update: {},
  });

  // 不返回 userId / updatedAt（前端用不到，且 updatedAt 不该跟 React state）
  const { userId: _u, updatedAt: _t, ...payload } = config;
  return NextResponse.json(payload);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return UNAUTHORIZED;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  const parsed = userConfigUpsertSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? '字段校验失败' }, { status: 400 });
  }

  await prisma.userConfig.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ ok: true });
}
