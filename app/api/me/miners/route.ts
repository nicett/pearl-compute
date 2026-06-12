/**
 * 矿工绑定 CRUD
 *
 * GET /api/me/miners       — 列出当前用户所有 binding + 每个 binding 的最新 snapshot
 * POST /api/me/miners      — 新增 binding，注册时立即触发一次同步
 */
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { auth } from '@/auth';
import { prisma } from '@/app/lib/db';
import { minerBindingCreateSchema } from '@/app/lib/validators/miner';
import { getPoolBySlug } from '@/app/lib/pools/registry';
import { bigintToString } from '@/app/lib/json';
import { enqueueImmediateSync } from '@/app/lib/queue';

export const runtime = 'nodejs';

const UNAUTHORIZED = NextResponse.json({ error: '未登录' }, { status: 401 });

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return UNAUTHORIZED;

  const bindings = await prisma.minerBinding.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
    include: {
      snapshots: {
        take: 1,
        orderBy: { snapshotAt: 'desc' },
      },
    },
  });

  // 顺便附上矿池显示名，前端不用再查
  const payload = bindings.map((b) => {
    const pool = getPoolBySlug(b.poolSlug);
    return {
      id: b.id,
      poolSlug: b.poolSlug,
      poolDisplayName: pool?.displayName ?? b.poolSlug,
      walletAddr: b.walletAddr,
      label: b.label,
      createdAt: b.createdAt,
      latestSnapshot: b.snapshots[0] ?? null,
    };
  });

  return NextResponse.json(bigintToString({ bindings: payload }));
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

  const parsed = minerBindingCreateSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? '字段校验失败', field: first?.path?.[0] },
      { status: 400 },
    );
  }

  const { poolSlug, walletAddr, label } = parsed.data;

  try {
    const binding = await prisma.minerBinding.create({
      data: {
        userId: session.user.id,
        poolSlug,
        walletAddr,
        label: label || null,
      },
    });

    // 立即入队一次同步（不阻塞响应；失败也无所谓，反正 5min tick 也会跑）
    enqueueImmediateSync(binding.id).catch(() => {});

    return NextResponse.json({
      id: binding.id,
      poolSlug: binding.poolSlug,
      walletAddr: binding.walletAddr,
      label: binding.label,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: '该地址已绑定到此矿池' }, { status: 409 });
    }
    console.error('[miners:POST] unexpected:', e);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
