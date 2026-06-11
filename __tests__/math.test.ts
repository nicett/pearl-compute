import {
  calcSingleCardHourly,
  calcDailyCoinOutput,
  calcDailyElecCost,
  calcDailyGrossUSDT,
  calcDailyNet,
  calcCostRatio,
  calcPaybackDays,
  calcEfficiency,
  calcShutdownPrice,
  calcDailyROI,
  calcAnnualizedROI,
  calcYearlyROI,
  calcProfitMultiple,
  calcSafetyMargin,
  calcChangePercent,
  calcYieldPerTH,
} from '../app/math';

describe('calcSingleCardHourly', () => {
  it('单卡每小时产币 = 算力 × 每TH每小时产币', () => {
    expect(calcSingleCardHourly(2, 0.001)).toBeCloseTo(0.002, 10);
  });

  it('零算力返回 0', () => {
    expect(calcSingleCardHourly(0, 0.001)).toBe(0);
  });

  it('零产币率返回 0', () => {
    expect(calcSingleCardHourly(2, 0)).toBe(0);
  });
});

describe('calcDailyCoinOutput', () => {
  it('日产币 = 总算力 × 产币率 × 24 × (1 - 手续费%)', () => {
    // 1000 TH × 0.001 × 24 × (1 - 0.01) = 23.76
    expect(calcDailyCoinOutput(1000, 0.001, 1)).toBeCloseTo(23.76, 10);
  });

  it('手续费为 0', () => {
    expect(calcDailyCoinOutput(1000, 0.001, 0)).toBeCloseTo(24, 10);
  });

  it('手续费 100% 时产币 = 0', () => {
    expect(calcDailyCoinOutput(1000, 0.001, 100)).toBeCloseTo(0, 10);
  });

  it('零总算力', () => {
    expect(calcDailyCoinOutput(0, 0.001, 1)).toBe(0);
  });
});

describe('calcDailyElecCost', () => {
  it('日电费 = 功率(kW) × 24 × 电价', () => {
    // 1 kW × 24h × 0.5 元/kWh = 12
    expect(calcDailyElecCost(1, 0.5)).toBeCloseTo(12, 10);
  });

  it('零功率返回 0', () => {
    expect(calcDailyElecCost(0, 0.5)).toBe(0);
  });

  it('零电价返回 0', () => {
    expect(calcDailyElecCost(1, 0)).toBe(0);
  });
});

describe('calcDailyGrossUSDT', () => {
  it('日毛产出 = 产币量 × 币价', () => {
    expect(calcDailyGrossUSDT(10, 0.18)).toBeCloseTo(1.8, 10);
  });

  it('零币价返回 0', () => {
    expect(calcDailyGrossUSDT(10, 0)).toBe(0);
  });
});

describe('calcDailyNet', () => {
  it('日净 = 毛产出 - 电费（正收益）', () => {
    expect(calcDailyNet(100, 60)).toBeCloseTo(40, 10);
  });

  it('电费 > 毛产出时为负数（亏损）', () => {
    expect(calcDailyNet(50, 80)).toBeCloseTo(-30, 10);
  });

  it('收支平衡时为 0', () => {
    expect(calcDailyNet(100, 100)).toBeCloseTo(0, 10);
  });
});

describe('calcCostRatio', () => {
  it('电费占比 = 电费 / 毛产出 × 100', () => {
    expect(calcCostRatio(30, 100)).toBeCloseTo(30, 10);
  });

  it('毛产出为 0 时返回 0（避免除零）', () => {
    expect(calcCostRatio(30, 0)).toBe(0);
  });

  it('电费超过毛产出时可大于 100%', () => {
    expect(calcCostRatio(150, 100)).toBeCloseTo(150, 10);
  });
});

describe('calcPaybackDays', () => {
  it('回本天数 = 投资 / 日净', () => {
    expect(calcPaybackDays(1000, 10)).toBeCloseTo(100, 10);
  });

  it('日净为 0 时返回 Infinity（永不回本）', () => {
    expect(calcPaybackDays(1000, 0)).toBe(Infinity);
  });

  it('日净为负时返回 Infinity（亏损）', () => {
    expect(calcPaybackDays(1000, -10)).toBe(Infinity);
  });

  it('小日净返回大天数', () => {
    expect(calcPaybackDays(10000, 0.01)).toBeCloseTo(1000000, 5);
  });
});

describe('calcEfficiency', () => {
  it('性价比 = 算力 / 价格', () => {
    expect(calcEfficiency(100, 5)).toBeCloseTo(20, 10);
  });

  it('零价格返回 0（避免除零）', () => {
    expect(calcEfficiency(100, 0)).toBe(0);
  });
});

describe('calcShutdownPrice', () => {
  it('关机币价 = 日电费 / 有效产币量', () => {
    // 电费 5 USD / 日产 10 币 = 0.5 USD/币
    expect(calcShutdownPrice(5, 10)).toBeCloseTo(0.5, 10);
  });

  it('零产币量返回 0', () => {
    expect(calcShutdownPrice(5, 0)).toBe(0);
  });

  it('零电费返回 0（理想情况）', () => {
    expect(calcShutdownPrice(0, 10)).toBeCloseTo(0, 10);
  });
});

describe('calcDailyROI', () => {
  it('日 ROI = 日净 / 投资 × 100', () => {
    expect(calcDailyROI(10, 1000)).toBeCloseTo(1, 10);
  });

  it('投资为 0 时返回 0', () => {
    expect(calcDailyROI(10, 0)).toBe(0);
  });

  it('日 ROI 可以为负（亏损）', () => {
    expect(calcDailyROI(-10, 1000)).toBeCloseTo(-1, 10);
  });
});

describe('calcAnnualizedROI', () => {
  it('年化 ROI = 日 ROI × 365', () => {
    expect(calcAnnualizedROI(1)).toBeCloseTo(365, 10);
  });

  it('零日 ROI 返回 0', () => {
    expect(calcAnnualizedROI(0)).toBe(0);
  });

  it('负数年化', () => {
    expect(calcAnnualizedROI(-0.5)).toBeCloseTo(-182.5, 10);
  });
});

describe('calcYearlyROI', () => {
  it('1年 ROI（考虑残值折旧）', () => {
    // 日净 100, 年净 36500, 投资 10000, 残值 2000
    // 折旧 = 10000 - 2000 = 8000
    // 净收益 = 36500 - 8000 = 28500
    // ROI = 28500 / 10000 × 100 = 285
    expect(calcYearlyROI(100, 10000, 2000)).toBeCloseTo(285, 10);
  });

  it('无残值时折旧 = 全部投资', () => {
    // 日净 100, 年净 36500, 投资 10000, 残值 0
    // 净收益 = 36500 - 10000 = 26500, ROI = 265
    expect(calcYearlyROI(100, 10000, 0)).toBeCloseTo(265, 10);
  });

  it('投资为 0 返回 0', () => {
    expect(calcYearlyROI(100, 0, 0)).toBe(0);
  });

  it('收益不足以覆盖折旧时为负', () => {
    // 日净 1, 年净 365, 折旧 1000, ROI = (365 - 1000) / 10000 × 100 = -6.35
    expect(calcYearlyROI(1, 10000, 9000)).toBeCloseTo(-6.35, 10);
  });
});

describe('calcProfitMultiple', () => {
  it('利润倍数 = 年净 / 投资', () => {
    // 日净 100 × 365 = 36500, /10000 = 3.65
    expect(calcProfitMultiple(100, 10000)).toBeCloseTo(3.65, 10);
  });

  it('投资为 0 返回 0', () => {
    expect(calcProfitMultiple(100, 0)).toBe(0);
  });
});

describe('calcSafetyMargin', () => {
  it('安全边际 (%) = (当前价 - 关机价) / 关机价 × 100', () => {
    // (0.18 - 0.10) / 0.10 = 80%
    expect(calcSafetyMargin(0.18, 0.10)).toBeCloseTo(80, 10);
  });

  it('当前价 = 关机价时边际为 0', () => {
    expect(calcSafetyMargin(0.10, 0.10)).toBeCloseTo(0, 10);
  });

  it('当前价低于关机价时边际为负', () => {
    expect(calcSafetyMargin(0.08, 0.10)).toBeCloseTo(-20, 10);
  });

  it('关机价为 0 时返回 0（避免除零）', () => {
    expect(calcSafetyMargin(0.18, 0)).toBe(0);
  });

  it('关机价为负数（理论异常）返回 0', () => {
    expect(calcSafetyMargin(0.18, -1)).toBe(0);
  });
});

describe('calcChangePercent', () => {
  it('涨幅 = (当前 - 之前) / 之前 × 100', () => {
    expect(calcChangePercent(110, 100)).toBeCloseTo(10, 10);
  });

  it('跌幅为负', () => {
    expect(calcChangePercent(90, 100)).toBeCloseTo(-10, 10);
  });

  it('之前为 0 返回 0', () => {
    expect(calcChangePercent(100, 0)).toBe(0);
  });

  it('之前为负返回 0', () => {
    expect(calcChangePercent(100, -50)).toBe(0);
  });

  it('无变化返回 0', () => {
    expect(calcChangePercent(100, 100)).toBeCloseTo(0, 10);
  });
});

describe('calcYieldPerTH', () => {
  it('每 TH 每小时产币 = (3600/124.77) × reward / networkHashrateTH', () => {
    const reward = 2680.75;
    const networkHashrateTH = 21060000;
    const expected = (3600 / 124.77) * reward / networkHashrateTH;
    expect(calcYieldPerTH(reward, networkHashrateTH)).toBeCloseTo(expected, 10);
  });

  it('网络算力为 0 返回 0', () => {
    expect(calcYieldPerTH(2680, 0)).toBe(0);
  });

  it('网络算力为负返回 0', () => {
    expect(calcYieldPerTH(2680, -1)).toBe(0);
  });

  it('reward 为 0 返回 0（产币为 0 被判为非正）', () => {
    expect(calcYieldPerTH(0, 1000)).toBe(0);
  });

  it('reward 为负时结果非正，返回 0', () => {
    expect(calcYieldPerTH(-100, 1000)).toBe(0);
  });
});

describe('精度 — 浮点累积误差检验', () => {
  it('0.1 + 0.2 在 BigNumber 链路下不会引入误差', () => {
    // calcDailyNet(0.3, 0.1) 应该精确 = 0.2，而非 0.19999999999999998
    expect(calcDailyNet(0.3, 0.1)).toBe(0.2);
  });

  it('多次链式计算下日产币精度', () => {
    // 大算力 × 极小 yield，浮点容易丢精度
    const out = calcDailyCoinOutput(1000000, 0.0000001, 0);
    // 1000000 × 0.0000001 × 24 = 2.4
    expect(out).toBeCloseTo(2.4, 10);
  });
});
