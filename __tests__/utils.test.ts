import {
  formatNumber,
  formatCurrency,
  parseNetworkHashrate,
  calcYieldPerTH,
} from '../app/utils';

describe('formatNumber', () => {
  it('should format number with default 2 decimals', () => {
    expect(formatNumber(1234.5678)).toBe('1,234.57');
  });

  it('should format number with specified decimals', () => {
    expect(formatNumber(1234.5678, 4)).toBe('1,234.5678');
  });

  it('should handle zero', () => {
    expect(formatNumber(0)).toBe('0.00');
  });

  it('should handle negative numbers', () => {
    expect(formatNumber(-1234.56)).toBe('-1,234.56');
  });
});

describe('formatCurrency', () => {
  it('should format USD currency', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('should format CNY currency', () => {
    expect(formatCurrency(1234.56, 'CNY')).toBe('￥1,234.56');
  });

  it('should handle zero', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });
});

describe('parseNetworkHashrate', () => {
  it('should parse EH/s', () => {
    expect(parseNetworkHashrate('21.06 EH/s')).toBe(21060000);
  });

  it('should parse TH/s', () => {
    expect(parseNetworkHashrate('1000 TH/s')).toBe(1000);
  });

  it('should parse GH/s', () => {
    expect(parseNetworkHashrate('1000 GH/s')).toBe(1);
  });

  it('should parse MH/s', () => {
    expect(parseNetworkHashrate('1000000 MH/s')).toBe(1);
  });

  it('should return default for invalid input', () => {
    expect(parseNetworkHashrate('')).toBe(19860000);
    expect(parseNetworkHashrate('invalid')).toBe(19860000);
  });

  it('should handle case insensitive', () => {
    expect(parseNetworkHashrate('21.06 eh/s')).toBe(21060000);
  });
});

describe('calcYieldPerTH', () => {
  it('should calculate yield per TH', () => {
    const reward = 2680.75;
    const networkHashrateTH = 21060000; // 21.06 EH/s
    const result = calcYieldPerTH(reward, networkHashrateTH);

    // Expected: (3600/124.77) * 2680.75 / 21060000
    const expected = (3600 / 124.77) * 2680.75 / 21060000;
    expect(result).toBeCloseTo(expected, 6);
  });

  it('should return 0 for zero hashrate', () => {
    expect(calcYieldPerTH(100, 0)).toBe(0);
  });

  it('should return 0 for negative result', () => {
    expect(calcYieldPerTH(-100, 1000)).toBe(0);
  });

  it('should handle normal case', () => {
    const result = calcYieldPerTH(2680, 20000000);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });
});
