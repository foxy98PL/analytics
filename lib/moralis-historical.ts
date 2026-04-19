import { getChainConfig, type ChainKey } from "./chains";
import type { TokenHistoryPayload } from "./token-types";

type MoralisOhlcvRow = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type MoralisOhlcvResponse = {
  cursor: string | null;
  pairAddress?: string;
  tokenAddress?: string;
  currency?: string;
  result?: MoralisOhlcvRow[];
};

const MORALIS_BASE = "https://deep-index.moralis.io/api/v2.2";
const DEFAULT_FROM_UNIX = 1577836800; // 2020-01-01T00:00:00Z

function toUnixSeconds(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

export type MoralisHistoricalParams = {
  chain: ChainKey;
  fromIso: string;
  toIso: string;
  limit?: number;
};

export async function fetchMoralisHistorical({
  chain,
  fromIso,
  toIso,
  limit = 1000,
}: MoralisHistoricalParams): Promise<TokenHistoryPayload> {
  const cfg = getChainConfig(chain);
  if (cfg.historyProvider !== "moralis") {
    throw new Error(`Chain ${chain} is not configured for Moralis historical data.`);
  }

  const apiKey = process.env.MORALIS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("MORALIS_API_KEY is not set");
  }

  const pairAddress = process.env[`MORALIS_PAIR_${chain.toUpperCase()}`]?.trim() || cfg.moralisPairAddress;
  if (!pairAddress) {
    throw new Error(`Missing Moralis pair address for ${chain}. Set MORALIS_PAIR_${chain.toUpperCase()}.`);
  }

  const moralisChain = cfg.moralisChain || chain;
  const fromDate = Math.max(DEFAULT_FROM_UNIX, toUnixSeconds(fromIso));
  const toDate = toUnixSeconds(toIso);
  if (fromDate > toDate) {
    return {
      network: moralisChain,
      address: cfg.tokenAddress,
      currency: "usd",
      data: [],
    };
  }

  let cursor: string | null = null;
  const rows: MoralisOhlcvRow[] = [];
  let tokenAddress = cfg.tokenAddress;
  let currency = "usd";

  do {
    const url = new URL(`${MORALIS_BASE}/pairs/${pairAddress}/ohlcv`);
    url.searchParams.set("chain", moralisChain);
    url.searchParams.set("timeframe", "1d");
    url.searchParams.set("currency", "usd");
    url.searchParams.set("fromDate", String(fromDate));
    url.searchParams.set("toDate", String(toDate));
    url.searchParams.set("limit", String(limit));
    if (cursor) {
      url.searchParams.set("cursor", cursor);
    }

    const res = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "X-API-Key": apiKey,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Moralis OHLCV failed ${res.status}: ${text}`);
    }

    const json = (await res.json()) as MoralisOhlcvResponse;
    if (json.result?.length) {
      rows.push(...json.result);
    }
    if (json.tokenAddress) {
      tokenAddress = json.tokenAddress;
    }
    if (json.currency) {
      currency = json.currency;
    }

    cursor = json.cursor;
  } while (cursor);

  const byTs = new Map<string, MoralisOhlcvRow>();
  for (const row of rows) {
    byTs.set(row.timestamp, row);
  }

  const sorted = [...byTs.values()].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return {
    network: moralisChain,
    address: tokenAddress,
    currency,
    data: sorted.map((row) => ({
      timestamp: row.timestamp,
      value: String(row.close),
      totalVolume: row.volume != null ? String(row.volume) : undefined,
    })),
  };
}
