import { fetchTokenHistorical } from "./alchemy-historical";
import { mergeTokenHistory } from "./token-history-store";
import type { TokenHistoryPayload } from "./token-types";
import type { HistoricalRequestBody } from "./alchemy-historical";

/** Alchemy: 1d interval is limited to 365 days / 365 points per request. */
const MAX_CHUNK_DAYS = 364;

type BaseBody = Pick<
  HistoricalRequestBody,
  "network" | "address" | "interval" | "withMarketData"
>;

export async function fetchHistoricalChunked(
  base: BaseBody,
  startTime: string,
  endTime: string
): Promise<TokenHistoryPayload> {
  const end = new Date(endTime);
  let cursor = new Date(startTime);

  if (cursor >= end) {
    throw new Error("startTime must be before endTime");
  }

  let acc: TokenHistoryPayload | null = null;

  while (cursor < end) {
    const windowEnd = new Date(cursor);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + MAX_CHUNK_DAYS);
    if (windowEnd > end) {
      windowEnd.setTime(end.getTime());
    }

    const chunk = await fetchTokenHistorical({
      ...base,
      startTime: cursor.toISOString(),
      endTime: windowEnd.toISOString(),
    });

    acc = acc ? mergeTokenHistory(acc, chunk) : chunk;

    cursor = new Date(windowEnd);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    cursor.setUTCHours(0, 0, 0, 0);
  }

  if (!acc) {
    throw new Error("No chunks returned");
  }

  return acc;
}
