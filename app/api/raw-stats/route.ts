import { loadOverviewLeaderboard, loadRawStatsAllChains } from "@/lib/burn-analytics-store";
import { hasSupabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeLeaderboard = searchParams.get("leaderboard") === "1";
    const requestedLimit = Number.parseInt(searchParams.get("limit") ?? "25", 10);
    const limit = Number.isFinite(requestedLimit) ? requestedLimit : 25;

    if (!hasSupabaseAdmin()) {
      return NextResponse.json({
        chains: [],
        totals: null,
        leaderboard: [],
        error: "Supabase is not configured",
      });
    }

    const payload = await loadRawStatsAllChains();
    if (!includeLeaderboard) {
      return NextResponse.json(payload);
    }

    const leaderboard = await loadOverviewLeaderboard(limit);
    return NextResponse.json({
      ...payload,
      leaderboard,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
