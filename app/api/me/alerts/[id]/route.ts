/**
 * 单个 AlertRule 操作 — PUT 更新（含 toggle enabled）、DELETE
 */
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { alertRuleUpdateSchema } from '@/app/lib/validators/alert';

export const runtime = 'nodejs';

const UNAUTHORIZED = NextResponse.json({ error: '未登录' }, { status: 401 });

export async function PUT(request: Request, context: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return UNAUTHORIZED;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  const parsed = alertRuleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? '字段校验失败' }, { status: 400 });
  }

  // updateMany 在 where 里同时校验 userId，防越权
  const result = await prisma.alertRule.updateMany({
    where: { id: context.params.id, userId: session.user.id },
    data: parsed.data,
  });

  if (result.count === 0) {
    return NextResponse.json({ error: '不存在或无权修改' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return UNAUTHORIZED;

  const result = await prisma.alertRule.deleteMany({
    where: { id: context.params.id, userId: session.user.id },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: '不存在或无权删除' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
