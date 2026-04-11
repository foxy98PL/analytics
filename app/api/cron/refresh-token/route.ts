import { refreshTokenHistoryToToday } from "@/lib/sync-token-history";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Optional daily job (e.g. Vercel Cron). In production, set CRON_SECRET and send:
 * Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && !secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 }
    );
  }

  if (secret) {
    const auth = request.headers.get("authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const payload = await refreshTokenHistoryToToday();
    return NextResponse.json({
      ok: true,
      points: payload?.data.length ?? 0,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
