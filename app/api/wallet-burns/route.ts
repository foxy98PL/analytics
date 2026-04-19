import {
  loadGlobalStatsAndLeaderboard,
  persistWalletIfIncreased,
} from "@/lib/burn-analytics-store";
import { CHAIN_KEYS, isChainKey, type ChainKey } from "@/lib/chains";
import { fetchXenBurnsForWallet } from "@/lib/fetch-xen-burns";
import { hasSupabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ADDR = /^0x[a-fA-F0-9]{40}$/;

function resolveChain(input: string | null | undefined): ChainKey {
  const value = (input ?? "eth").toLowerCase();
  if (isChainKey(value)) return value;
  throw new Error(`Invalid chain. Allowed: ${CHAIN_KEYS.join(", ")}`);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chain = resolveChain(searchParams.get("chain"));

    if (!hasSupabaseAdmin()) {
      return NextResponse.json({ chain, global: null, leaderboard: [] });
    }

    const { global, leaderboard } = await loadGlobalStatsAndLeaderboard(chain, 10);
    return NextResponse.json({ chain, global, leaderboard });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { address?: string; chain?: string };
    const chain = resolveChain(body.chain);
    const address = body.address?.trim();
    if (!address || !ADDR.test(address)) {
      return NextResponse.json(
        { error: "Provide a valid wallet address (0x + 40 hex chars)." },
        { status: 400 }
      );
    }

    const result = await fetchXenBurnsForWallet(chain, address);

    if (!hasSupabaseAdmin()) {
      return NextResponse.json({
        chain,
        ...result,
        sync: { updated: false, reason: "supabase_not_configured" },
        global: null,
        leaderboard: [],
      });
    }

    const sync = await persistWalletIfIncreased({
      address,
      chain,
      transfers: result.transfers,
      byDay: result.byDay,
      totals: result.totals,
    });

    const { global, leaderboard } = await loadGlobalStatsAndLeaderboard(chain, 10);

    return NextResponse.json({
      chain,
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
