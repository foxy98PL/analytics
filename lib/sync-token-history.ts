import {
  mergeTokenHistory,
  readTokenHistory,
  writeTokenHistory,
} from "./token-history-store";
import { fetchHistoricalChunked } from "./fetch-historical-chunked";
import type { TokenHistoryPayload } from "./token-types";

export const TOKEN_CONFIG = {
  network: "eth-mainnet" as const,
  address: "0x06450dEe7FD2Fb8E39061434BAbCFC05599a6Fb8",
  interval: "1d" as const,
  initialStartTime: "2022-01-01T00:00:00Z",
  initialEndTime: "2026-07-01T00:00:00Z",
};

function nextUtcDayIso(iso: string): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function utcDayStart(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
  );
}

/** True if we already have a daily candle for today's UTC date. */
function hasCandleThroughToday(stored: TokenHistoryPayload): boolean {
  if (stored.data.length === 0) return false;
  const last = stored.data[stored.data.length - 1]!;
  const lastDay = utcDayStart(new Date(last.timestamp));
  const todayStart = utcDayStart(new Date());
  return lastDay.getTime() >= todayStart.getTime();
}

/**
 * First server start: pull full history [2022, 2026-07) window and persist.
 */
export async function syncTokenHistoryOnStartup(): Promise<void> {
  const existing = await readTokenHistory();
  if (existing && existing.data.length > 0) {
    return;
  }

  const payload = await fetchHistoricalChunked(
    {
      network: TOKEN_CONFIG.network,
      address: TOKEN_CONFIG.address,
      interval: TOKEN_CONFIG.interval,
      withMarketData: true,
    },
    TOKEN_CONFIG.initialStartTime,
    TOKEN_CONFIG.initialEndTime
  );

  await writeTokenHistory(payload);
}

/**
 * Append daily candles from the day after the last saved point through "now".
 * Safe to call on each request; no-ops when already up to date for today (UTC).
 */
export async function refreshTokenHistoryToToday(): Promise<TokenHistoryPayload | null> {
  let stored = await readTokenHistory();
  if (!stored || stored.data.length === 0) {
    await syncTokenHistoryOnStartup();
    stored = await readTokenHistory();
    if (!stored) return null;
  }

  if (hasCandleThroughToday(stored)) {
    return stored;
  }

  const last = stored.data[stored.data.length - 1]!;
  const startTime = nextUtcDayIso(last.timestamp);
  const endTime = new Date().toISOString();

  if (new Date(startTime) >= new Date(endTime)) {
    return stored;
  }

  const chunk = await fetchHistoricalChunked(
    {
      network: TOKEN_CONFIG.network,
      address: TOKEN_CONFIG.address,
      interval: TOKEN_CONFIG.interval,
      withMarketData: true,
    },
    startTime,
    endTime
  );

  const merged = mergeTokenHistory(stored, chunk);
  await writeTokenHistory(merged);
  return merged;
}
