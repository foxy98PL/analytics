export type AssetTransfer = {
  blockNum: string;
  hash: string;
  from: string;
  to: string;
  value: number;
  asset: string | null;
  category: string;
  rawContract?: { value?: string; address?: string; decimal?: string };
  metadata?: { blockTimestamp?: string };
};

export type BurnTransferPublic = {
  chain: string;
  hash: string;
  blockNum: string;
  timestamp: string;
  dayKey: string;
  xenAmount: number;
  usdValue: number;
};

export type DayBurnSummary = {
  dayKey: string;
  totalXen: number;
  txCount: number;
  txs: { chain: string; hash: string; xenAmount: number; usdValue: number; timestamp: string }[];
};
