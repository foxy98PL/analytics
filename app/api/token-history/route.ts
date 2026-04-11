import { refreshTokenHistoryToToday } from "@/lib/sync-token-history";
import { readTokenHistory } from "@/lib/token-history-store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Returns persisted token history and ensures daily refresh (UTC) on the server.
 */
export async function GET() {
  try {
    const payload = await refreshTokenHistoryToToday();
    if (payload) {
      return NextResponse.json(payload);
    }
    const fallback = await readTokenHistory();
    if (fallback) {
      return NextResponse.json(fallback);
    }
    return NextResponse.json(
      { error: "No token history yet. Set ALCHEMY_API_KEY and restart the server." },
      { status: 503 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
