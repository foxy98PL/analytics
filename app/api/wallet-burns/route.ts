import {
  loadGlobalStatsAndLeaderboard,
  persistWalletIfIncreased,
} from "@/lib/burn-analytics-store";
import { fetchXenBurnsForWallet } from "@/lib/fetch-xen-burns";
import { hasSupabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ADDR = /^0x[a-fA-F0-9]{40}$/;

export async function GET() {
  try {
    if (!hasSupabaseAdmin()) {
      return NextResponse.json({ global: null, leaderboard: [] });
    }

    const { global, leaderboard } = await loadGlobalStatsAndLeaderboard(10);
    return NextResponse.json({ global, leaderboard });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { address?: string };
    const address = body.address?.trim();
    if (!address || !ADDR.test(address)) {
      return NextResponse.json(
        { error: "Provide a valid wallet address (0x + 40 hex chars)." },
        { status: 400 }
      );
    }

    const result = await fetchXenBurnsForWallet(address);

    if (!hasSupabaseAdmin()) {
      return NextResponse.json({
        ...result,
        sync: { updated: false, reason: "supabase_not_configured" },
        global: null,
        leaderboard: [],
      });
    }

    const sync = await persistWalletIfIncreased({
      address,
      transfers: result.transfers,
      byDay: result.byDay,
      totals: result.totals,
    });

    const { global, leaderboard } = await loadGlobalStatsAndLeaderboard(10);

    return NextResponse.json({
      ...result,
      sync,
      global,
      leaderboard,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
