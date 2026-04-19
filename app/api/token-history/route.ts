import { isChainKey } from "@/lib/chains";
import { refreshTokenHistoryToToday } from "@/lib/sync-token-history";
import { readTokenHistory } from "@/lib/token-history-store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Returns persisted token history and ensures daily refresh (UTC) on the server.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const chainParam = (searchParams.get("chain") ?? "eth").toLowerCase();
    if (!isChainKey(chainParam)) {
      return NextResponse.json({ error: "Invalid chain" }, { status: 400 });
    }

    const payload = await refreshTokenHistoryToToday(chainParam);
    if (payload) {
      return NextResponse.json(payload);
    }
    const fallback = await readTokenHistory(chainParam);
    if (fallback) {
      return NextResponse.json(fallback);
    }
    return NextResponse.json(
      { error: "No token history yet. Configure historical providers (ALCHEMY_API_KEY for eth/polygon, MORALIS_API_KEY for moralis chains) and restart the server." },
      { status: 503 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
