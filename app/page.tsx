import MinerCalculator from './MinerCalculator';

// 服务器端预取数据
async function getInitialData() {
  try {
    // 直接调用 API 路由的逻辑，而不是通过 HTTP 请求
    // 这样可以避免服务器端请求自己的问题
    const { GET } = await import('./api/stats/route');
    const response = await GET();
    const data = await response.json();

    const coinData = data.coins?.[0] || {};

    // 计算每 TH 时产
    const blockReward = parseFloat(coinData.reward) || 2681.69;
    const blockTimeSec = 124.77;

    let networkHashrateTH = 19.86 * 1000000;
    if (coinData.network_hash) {
      const match = coinData.network_hash.match(/([\d.]+)\s*(EH|TH|GH|MH)/i);
      if (match) {
        const value = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        const multipliers: Record<string, number> = {
          EH: 1000000,
          TH: 1,
          GH: 0.001,
          MH: 0.000001,
        };
        networkHashrateTH = value * (multipliers[unit] || 1);
      }
    }

    const blocksPerHour = 3600 / blockTimeSec;
    const globalHourlyOutput = blocksPerHour * blockReward;
    const yieldPerTH = globalHourlyOutput / networkHashrateTH;

    return {
      hashrateYield: yieldPerTH > 0 && isFinite(yieldPerTH) ? yieldPerTH : 0.003896,
      coinPrice: coinData.price || 0.18,
      exchangeRate: data.exchangeRate || 6.80,
      priceSource: data.priceSource || 'unknown',
    };
  } catch (error) {
    console.error('Failed to fetch initial data:', error);
    // 返回默认值
    return {
      hashrateYield: 0.003896,
      coinPrice: 0.18,
      exchangeRate: 6.80,
      priceSource: 'unknown',
    };
  }
}

export default async function Home() {
  const initialData = await getInitialData();

  return <MinerCalculator initialData={initialData} />;
}
