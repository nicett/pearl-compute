/**
 * 矿池适配器统一接口
 *
 * 每个矿池软件平台（herominers / nodejs-pool / open-ethereum-pool 等）
 * 实现一个 fetcher，把外部矿池 API 的差异屏蔽掉，统一映射到 MinerSnapshotData
 */

export interface PoolInfo {
  /** 我们项目内的 slug（白名单 key） */
  slug: string;
  /** 平台标识：决定用哪个 fetcher */
  platform: 'herominers';
  /** 平台子域 / 端点 */
  subdomain: string;
  /** 给用户看的名字 */
  displayName: string;
  /** 钱包地址正则；可选 */
  addressRegex?: RegExp;
}

/** 与 MinerSnapshot 表字段对齐的数据 */
export interface MinerSnapshotData {
  hashrateHps: bigint | null;
  balanceGrains: bigint | null;
  paid24hGrains: bigint | null;
  workerCount: number | null;
  /** 已经裁剪过的 JSON（去掉 charts / payments 等冗余） */
  rawJson: unknown;
}

export interface MinerFetcher {
  readonly platform: PoolInfo['platform'];
  /**
   * 拉取某个 walletAddr 在 pool 下的实时数据
   * 失败需 throw，由 caller 决定是 retry 还是降级
   */
  fetch(pool: PoolInfo, walletAddr: string): Promise<MinerSnapshotData>;
}
