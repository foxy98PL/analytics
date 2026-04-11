import type { TokenHistoryPayload } from "./token-types";

const HISTORICAL_URL = (apiKey: string) =>
  `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/historical`;

export type HistoricalRequestBody = {
  network: string;
  address: string;
  startTime: string;
  endTime: string;
  interval: "1d";
  withMarketData: boolean;
};

export async function fetchTokenHistorical(
  body: HistoricalRequestBody
): Promise<TokenHistoryPayload> {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) {
    throw new Error("ALCHEMY_API_KEY is not set");
  }

  const res = await fetch(HISTORICAL_URL(key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Alchemy historical failed ${res.status}: ${text}`);
  }

  return res.json() as Promise<TokenHistoryPayload>;
}
