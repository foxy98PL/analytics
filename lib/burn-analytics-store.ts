import type { BurnTransferPublic, DayBurnSummary } from "./burn-types";
import { getSupabaseAdmin } from "./supabase-server";

export type GlobalStats = {
  burnedXen: number;
  burnedUsd: number;
  txCount: number;
  wallets: number;
};

export type LeaderboardRow = {
  walletAddress: string;
  burnedUsd: number;
  burnedXen: number;
  txCount: number;
};

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function upsertWallet(address: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const normalized = address.toLowerCase();

  const { data, error } = await supabase
    .from("wallets")
    .upsert(
      {
        wallet_address: normalized,
        last_refreshed_at: new Date().toISOString(),
      },
      { onConflict: "wallet_address" }
    )
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Failed to upsert wallet");
  }
  return String(data.id);
}

async function getCurrentTotalXen(walletId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("wallet_totals")
    .select("total_burned_xen")
    .eq("wallet_id", walletId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return num(data?.total_burned_xen);
}

async function upsertTransactions(walletId: string, transfers: BurnTransferPublic[]) {
  if (transfers.length === 0) return;
  const supabase = getSupabaseAdmin();

  const rows = transfers.map((t) => ({
    wallet_id: walletId,
    tx_hash: t.hash.toLowerCase(),
    occurred_at: t.timestamp,
    block_num: Number.parseInt(t.blockNum, 16),
    xen_amount: t.xenAmount,
    usd_value: t.usdValue,
  }));

  for (const part of chunk(rows, 500)) {
    const { error } = await supabase
      .from("wallet_burn_transactions")
      .upsert(part, { onConflict: "wallet_id,tx_hash,occurred_at,xen_amount" });

    if (error) {
      throw new Error(error.message);
    }
  }
}

async function upsertDaily(walletId: string, byDay: DayBurnSummary[]) {
  const supabase = getSupabaseAdmin();
  if (byDay.length === 0) return;

  const rows = byDay.map((d) => ({
    wallet_id: walletId,
    day_utc: d.dayKey,
    burned_xen: d.totalXen,
    burned_usd: d.txs.reduce((sum, tx) => sum + tx.usdValue, 0),
    tx_count: d.txCount,
    first_tx_at: d.txs[d.txs.length - 1]?.timestamp ?? null,
    last_tx_at: d.txs[0]?.timestamp ?? null,
  }));

  for (const part of chunk(rows, 500)) {
    const { error } = await supabase
      .from("wallet_daily_burns")
      .upsert(part, { onConflict: "wallet_id,day_utc" });
    if (error) {
      throw new Error(error.message);
    }
  }
}

async function upsertTotals(
  walletId: string,
  totals: { xen: number; usd: number },
  transfers: BurnTransferPublic[]
) {
  const supabase = getSupabaseAdmin();
  const first = transfers[transfers.length - 1]?.timestamp ?? null;
  const last = transfers[0]?.timestamp ?? null;

  const { error } = await supabase.from("wallet_totals").upsert(
    {
      wallet_id: walletId,
      total_burned_xen: totals.xen,
      total_burned_usd: totals.usd,
      total_tx_count: transfers.length,
      first_burn_at: first,
      last_burn_at: last,
      refreshed_at: new Date().toISOString(),
    },
    { onConflict: "wallet_id" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function persistWalletIfIncreased(input: {
  address: string;
  transfers: BurnTransferPublic[];
  byDay: DayBurnSummary[];
  totals: { xen: number; usd: number };
}): Promise<{ updated: boolean; previousXen: number; currentXen: number }> {
  const walletId = await upsertWallet(input.address);
  const previousXen = await getCurrentTotalXen(walletId);
  const currentXen = input.totals.xen;

  if (previousXen > 0 && currentXen <= previousXen) {
    return { updated: false, previousXen, currentXen };
  }

  await upsertTransactions(walletId, input.transfers);
  await upsertDaily(walletId, input.byDay);
  await upsertTotals(walletId, input.totals, input.transfers);

  return { updated: true, previousXen, currentXen };
}

export async function loadGlobalStatsAndLeaderboard(limit = 10): Promise<{
  global: GlobalStats;
  leaderboard: LeaderboardRow[];
}> {
  const supabase = getSupabaseAdmin();

  const { data: totalsRows, error: totalsError } = await supabase
    .from("wallet_totals")
    .select("wallet_id,total_burned_xen,total_burned_usd,total_tx_count");

  if (totalsError) {
    throw new Error(totalsError.message);
  }

  const { data: walletsRows, error: walletsError } = await supabase
    .from("wallets")
    .select("id,wallet_address")
    .eq("is_active", true);

  if (walletsError) {
    throw new Error(walletsError.message);
  }

  const walletById = new Map<string, string>();
  for (const w of walletsRows ?? []) {
    walletById.set(String(w.id), String(w.wallet_address));
  }

  const rows = (totalsRows ?? []).map((r) => ({
    walletId: String(r.wallet_id),
    burnedXen: num(r.total_burned_xen),
    burnedUsd: num(r.total_burned_usd),
    txCount: num(r.total_tx_count),
  }));

  const global: GlobalStats = {
    burnedXen: rows.reduce((s, r) => s + r.burnedXen, 0),
    burnedUsd: rows.reduce((s, r) => s + r.burnedUsd, 0),
    txCount: rows.reduce((s, r) => s + r.txCount, 0),
    wallets: rows.length,
  };

  const leaderboard: LeaderboardRow[] = rows
    .map((r) => ({
      walletAddress: walletById.get(r.walletId) ?? r.walletId,
      burnedUsd: r.burnedUsd,
      burnedXen: r.burnedXen,
      txCount: r.txCount,
    }))
    .sort((a, b) => b.burnedUsd - a.burnedUsd)
    .slice(0, limit);

  return { global, leaderboard };
}
