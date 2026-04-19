import { loadGlobalStatsAndLeaderboard } from "@/lib/burn-analytics-store";
import { isChainKey } from "@/lib/chains";
import { hasSupabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chainParam = (searchParams.get("chain") ?? "").toLowerCase();
    const requestedLimit = Number.parseInt(searchParams.get("limit") ?? "25", 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 25;

    if (!isChainKey(chainParam)) {
      return NextResponse.json({ error: "Invalid chain" }, { status: 400 });
    }

    if (!hasSupabaseAdmin()) {
      return NextResponse.json({ leaderboard: [], error: "Supabase is not configured" }, { status: 503 });
    }

    const payload = await loadGlobalStatsAndLeaderboard(chainParam, limit);
    return NextResponse.json({ leaderboard: payload.leaderboard });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
