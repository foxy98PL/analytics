import { fetchHistoricalChunked } from "./fetch-historical-chunked";
import { CHAIN_KEYS, type ChainKey, getChainConfig } from "./chains";
import { fetchMoralisHistorical } from "./moralis-historical";
import { getSupabaseAdmin, hasSupabaseAdmin } from "./supabase-server";
import { mergeTokenHistory, readTokenHistory, writeTokenHistory } from "./token-history-store";
import type { TokenHistoryPayload } from "./token-types";

const INITIAL_START_TIME = "2020-01-01T00:00:00Z";

function utcDayIso(iso: string): string {
  const d = new Date(iso);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function asDay(iso: string): string {
  return iso.slice(0, 10);
}

function todayUtcStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

function hasFutureCandles(payload: TokenHistoryPayload): boolean {
  const todayStart = todayUtcStart().getTime();
  return payload.data.some((row) => new Date(row.timestamp).getTime() > todayStart);
}

function pruneFutureCandles(payload: TokenHistoryPayload): TokenHistoryPayload {
  const todayStart = todayUtcStart().getTime();
  const data = payload.data.filter((row) => new Date(row.timestamp).getTime() <= todayStart);
  return {
    ...payload,
    data,
  };
}

async function loadSupabaseHistory(chain: ChainKey): Promise<TokenHistoryPayload | null> {
  if (!hasSupabaseAdmin()) return null;
  const supabase = getSupabaseAdmin();
  const cfg = getChainConfig(chain);

  const { data, error } = await supabase
    .from("token_daily_prices")
    .select("day_utc,price_usd")
    .eq("chain_key", chain)
    .order("day_utc", { ascending: true });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;

  return {
    network: cfg.alchemyNetwork,
    address: cfg.tokenAddress,
    currency: "usd",
    data: data.map((row) => ({
      timestamp: `${String(row.day_utc)}T00:00:00.000Z`,
      value: String(row.price_usd ?? 0),
    })),
  };
}

async function upsertSupabaseHistory(
  chain: ChainKey,
  payload: TokenHistoryPayload,
  options?: { replace?: boolean }
): Promise<void> {
  if (!hasSupabaseAdmin() || payload.data.length === 0) return;

  const supabase = getSupabaseAdmin();
  if (options?.replace) {
    const { error } = await supabase.from("token_daily_prices").delete().eq("chain_key", chain);
    if (error) {
      throw new Error(error.message);
    }
  }

  const rows = payload.data.map((row) => ({
    chain_key: chain,
    token_address: payload.address.toLowerCase(),
    day_utc: asDay(row.timestamp),
    price_usd: Number(row.value) || 0,
    source: getChainConfig(chain).historyProvider,
    refreshed_at: new Date().toISOString(),
  }));

  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const part = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from("token_daily_prices")
      .upsert(part, { onConflict: "chain_key,day_utc" });
    if (error) {
      throw new Error(error.message);
    }
  }
}

async function fetchFullHistory(chain: ChainKey): Promise<TokenHistoryPayload> {
  const cfg = getChainConfig(chain);
  const endTime = new Date().toISOString();

  if (cfg.historyProvider === "moralis") {
    return fetchMoralisHistorical({
      chain,
      fromIso: INITIAL_START_TIME,
      toIso: endTime,
      limit: 1000,
    });
  }

  return fetchHistoricalChunked(
    {
      network: cfg.alchemyNetwork,
      address: cfg.tokenAddress,
      interval: "1d",
      withMarketData: true,
    },
    INITIAL_START_TIME,
    endTime
  );
}

async function appendToToday(chain: ChainKey, stored: TokenHistoryPayload): Promise<TokenHistoryPayload> {
  const cfg = getChainConfig(chain);
  const last = stored.data[stored.data.length - 1]!;
  const startTime = utcDayIso(last.timestamp);
  const endTime = new Date().toISOString();

  if (new Date(startTime) >= new Date(endTime)) {
    return stored;
  }

  const chunk =
    cfg.historyProvider === "moralis"
      ? await fetchMoralisHistorical({
          chain,
          fromIso: startTime,
          toIso: endTime,
          limit: 1000,
        })
      : await fetchHistoricalChunked(
          {
            network: cfg.alchemyNetwork,
            address: cfg.tokenAddress,
            interval: "1d",
            withMarketData: true,
          },
          startTime,
          endTime
        );

  return mergeTokenHistory(stored, chunk);
}

export async function refreshTokenHistoryToToday(chain: ChainKey): Promise<TokenHistoryPayload | null> {
  const cfg = getChainConfig(chain);
  let stored = await loadSupabaseHistory(chain);
  if (!stored) {
    stored = await readTokenHistory(chain);
  }

  if (stored && stored.data.length > 0 && hasFutureCandles(stored)) {
    // Legacy caches could contain prefilled future days; Moralis chains should fully rebuild.
    if (cfg.historyProvider === "moralis") {
      const full = await fetchFullHistory(chain);
      await writeTokenHistory(full, chain);
      await upsertSupabaseHistory(chain, full, { replace: true });
      return full;
    }

    stored = pruneFutureCandles(stored);
  }

  if (!stored || stored.data.length === 0) {
    const full = await fetchFullHistory(chain);
    await writeTokenHistory(full, chain);
    await upsertSupabaseHistory(chain, full, { replace: true });
    return full;
  }

  const refreshed = await appendToToday(chain, stored);
  await writeTokenHistory(refreshed, chain);
  await upsertSupabaseHistory(chain, refreshed);
  return refreshed;
}

export async function syncTokenHistoryOnStartup(): Promise<void> {
  for (const chain of CHAIN_KEYS) {
    try {
      await refreshTokenHistoryToToday(chain);
    } catch (err) {
      console.error(`[token-sync] ${chain} failed:`, err);
    }
  }
}
