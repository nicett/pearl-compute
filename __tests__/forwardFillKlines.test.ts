import { forwardFillKlines } from '../app/lib/data-sources';

describe('forwardFillKlines', () => {
  it('返回的 time 严格按 periodSec 步长递增', () => {
    const period = 100;
    const klines = [
      { time: 1000, open: 1, high: 1, low: 1, close: 1.5, volume: 10 },
      { time: 1300, open: 1.6, high: 1.7, low: 1.5, close: 1.65, volume: 5 },
    ];
    const result = forwardFillKlines(klines, 1000, 1400, period);

    expect(result.map((k) => k.time)).toEqual([1000, 1100, 1200, 1300, 1400]);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].time - result[i - 1].time).toBe(period);
    }
  });

  it('缺失时间槽用 lastKnownPrice 前向填充', () => {
    const period = 100;
    const klines = [
      { time: 1000, open: 1, high: 1, low: 1, close: 1.5, volume: 10 },
      { time: 1300, open: 1.6, high: 1.7, low: 1.5, close: 1.65, volume: 5 },
    ];
    const result = forwardFillKlines(klines, 1000, 1300, period);

    // 1100/1200 缺失，应该用前一根 close = 1.5 填充
    expect(result[1].time).toBe(1100);
    expect(result[1].close).toBe(1.5);
    expect(result[1].volume).toBe(0);
    expect(result[2].time).toBe(1200);
    expect(result[2].close).toBe(1.5);
    // 1300 是真实数据
    expect(result[3].close).toBe(1.65);
  });

  it('真实数据点的所有字段被原样保留', () => {
    const period = 100;
    const real = { time: 1000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 99 };
    const result = forwardFillKlines([real], 1000, 1000, period);
    expect(result[0]).toEqual(real);
  });

  it('起止时间不是 periodSec 倍数时，向下取整对齐', () => {
    const period = 100;
    const klines = [{ time: 200, open: 1, high: 1, low: 1, close: 1, volume: 0 }];
    // timeFrom 250 应该对齐到 200, timeTo 380 应该对齐到 300
    const result = forwardFillKlines(klines, 250, 380, period);
    expect(result[0].time).toBe(200);
    expect(result[result.length - 1].time).toBe(300);
  });

  it('空数组直接返回空数组', () => {
    expect(forwardFillKlines([], 0, 1000, 60)).toEqual([]);
  });

  it('单点输入会扩展为对齐到 to 的完整序列', () => {
    const period = 100;
    const klines = [{ time: 0, open: 1, high: 1, low: 1, close: 2, volume: 10 }];
    const result = forwardFillKlines(klines, 0, 300, period);
    expect(result.length).toBe(4); // 0, 100, 200, 300
    expect(result[0]).toEqual(klines[0]);
    // 后续 3 个全部 forward-fill 为 close=2
    for (let i = 1; i < 4; i++) {
      expect(result[i].close).toBe(2);
      expect(result[i].volume).toBe(0);
    }
  });

  it('连续多根真实数据全部保留', () => {
    const period = 100;
    const klines = [
      { time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 },
      { time: 100, open: 2, high: 2, low: 2, close: 2, volume: 2 },
      { time: 200, open: 3, high: 3, low: 3, close: 3, volume: 3 },
    ];
    const result = forwardFillKlines(klines, 0, 200, period);
    expect(result).toEqual(klines);
  });
});
