/**
 * 价格预警规则 CRUD
 */
import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { alertRuleCreateSchema } from '@/app/lib/validators/alert';

export const runtime = 'nodejs';

const UNAUTHORIZED = NextResponse.json({ error: '未登录' }, { status: 401 });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return UNAUTHORIZED;

  const rules = await prisma.alertRule.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ rules });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return UNAUTHORIZED;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  const parsed = alertRuleCreateSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? '字段校验失败' }, { status: 400 });
  }

  const { type, threshold, priceSource, enabled, cooldownMin } = parsed.data;

  const rule = await prisma.alertRule.create({
    data: {
      userId: session.user.id,
      type,
      threshold,
      priceSource: priceSource ?? null,
      enabled: enabled ?? true,
      cooldownMin: cooldownMin ?? 60,
    },
  });

  return NextResponse.json(rule);
}
