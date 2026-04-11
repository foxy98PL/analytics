export type TokenHistoryPoint = {
  value: string;
  timestamp: string;
  marketCap?: string;
  totalVolume?: string;
};

export type TokenHistoryPayload = {
  network: string;
  address: string;
  currency: string;
  data: TokenHistoryPoint[];
};
