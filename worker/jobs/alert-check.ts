/**
 * alert-check job
 *
 * 每 30 秒触发：
 * 1. 直接调 assembleStatsData()（复用 data-sources，不走 HTTP）
 * 2. 拿到三个源的当前价
 * 3. 查所有 enabled 的 AlertRule
 * 4. 对每条规则评估命中 + cooldown
 * 5. 命中 → 写 Notification + 更新 lastFiredAt
 *
 * 注：本期不发邮件，只写站内通知（channel: 'inapp'）
 */
import type { Job } from 'bullmq';

import { prisma } from '../../app/lib/db';
import { assembleStatsData } from '../../app/lib/data-sources';
import type { AlertType } from '@prisma/client';

interface PriceSnapshot {
  source: string;
  price: number;
}

/** 从 assembleStatsData 抽出 [{source, price}, ...] */
async function fetchCurrentPrices(): Promise<PriceSnapshot[]> {
  const data = await assembleStatsData();
  if (!data) return [];

  const out: PriceSnapshot[] = [];
  if (data.prices.pearlOtc?.price != null) {
    out.push({ source: 'Pearl OTC', price: data.prices.pearlOtc.price });
  }
  if (data.prices.safetrade?.price != null) {
    out.push({ source: 'SafeTrade', price: data.prices.safetrade.price });
  }
  if (data.prices.okx?.price != null) {
    out.push({ source: 'OKX Web3', price: data.prices.okx.price });
  }
  return out;
}

interface RuleEvalContext {
  prices: PriceSnapshot[];
  now: Date;
}

/** 返回 [hit, matchedSource, matchedPrice]；hit=false 表示未命中 */
function evaluateRule(
  type: AlertType,
  threshold: number,
  priceSource: string | null,
  { prices }: RuleEvalContext,
): { hit: true; source: string; price: number } | { hit: false } {
  // 选要评估的价格源
  const candidates = priceSource ? prices.filter((p) => p.source === priceSource) : prices;
  if (candidates.length === 0) return { hit: false };

  for (const c of candidates) {
    if (type === 'PRICE_ABOVE' && c.price > threshold) {
      return { hit: true, source: c.source, price: c.price };
    }
    if (type === 'PRICE_BELOW' && c.price < threshold) {
      return { hit: true, source: c.source, price: c.price };
    }
    // SHUTDOWN_NEAR: v1.5 实现（需要 UserConfig.electricityPrice 等参数）
  }
  return { hit: false };
}

function formatNotification(
  type: AlertType,
  threshold: number,
  source: string,
  price: number,
): { subject: string; body: string } {
  if (type === 'PRICE_ABOVE') {
    return {
      subject: `PRL 价格突破 $${threshold}`,
      body: `${source} 当前价 $${price.toFixed(4)}，已高于阈值 $${threshold}`,
    };
  }
  if (type === 'PRICE_BELOW') {
    return {
      subject: `PRL 价格跌破 $${threshold}`,
      body: `${source} 当前价 $${price.toFixed(4)}，已低于阈值 $${threshold}`,
    };
  }
  return {
    subject: '预警触发',
    body: `${source} 当前价 $${price.toFixed(4)}`,
  };
}

export async function runAlertCheck(_job: Job) {
  const prices = await fetchCurrentPrices();
  if (prices.length === 0) {
    console.warn('[alert-check] no prices available, skip');
    return { evaluated: 0, fired: 0 };
  }

  const rules = await prisma.alertRule.findMany({ where: { enabled: true } });
  if (rules.length === 0) {
    return { evaluated: 0, fired: 0 };
  }

  const now = new Date();
  const ctx: RuleEvalContext = { prices, now };
  let fired = 0;

  for (const rule of rules) {
    // cooldown 检查
    if (rule.lastFiredAt) {
      const ageMs = now.getTime() - rule.lastFiredAt.getTime();
      if (ageMs < rule.cooldownMin * 60_000) continue;
    }

    const result = evaluateRule(rule.type, rule.threshold, rule.priceSource, ctx);
    if (!result.hit) continue;

    const { subject, body } = formatNotification(rule.type, rule.threshold, result.source, result.price);

    // 写通知 + 更新 lastFiredAt（同事务）
    try {
      await prisma.$transaction([
        prisma.notification.create({
          data: {
            userId: rule.userId,
            channel: 'inapp',
            subject,
            body,
            meta: {
              alertRuleId: rule.id,
              alertType: rule.type,
              threshold: rule.threshold,
              triggeredSource: result.source,
              triggeredPrice: result.price,
            },
          },
        }),
        prisma.alertRule.update({
          where: { id: rule.id },
          data: { lastFiredAt: now },
        }),
      ]);
      fired++;
    } catch (e) {
      console.warn(`[alert-check] rule ${rule.id} fire failed:`, e instanceof Error ? e.message : e);
    }
  }

  if (fired > 0) {
    console.log(`[alert-check] evaluated=${rules.length} fired=${fired}`);
  }
  return { evaluated: rules.length, fired };
}
