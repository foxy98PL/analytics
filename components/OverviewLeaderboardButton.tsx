"use client";

import { useMemo, useState } from "react";

type Row = {
  walletAddress: string;
  burnedUsd: number;
  burnedXen: number;
  txCount: number;
};

type RawStatsWithLeaderboard = {
  leaderboard?: Row[];
  error?: string;
};

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function formatXen(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

function shortAddress(a: string): string {
  if (!a.startsWith("0x") || a.length < 14) return a;
  return `${a.slice(0, 8)}...${a.slice(-6)}`;
}

export function OverviewLeaderboardButton({
  title = "Top wallets",
  buttonLabel = "Leaderboard",
  initialLimit = 25,
}: {
  title?: string;
  buttonLabel?: string;
  initialLimit?: 25 | 50;
}) {
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState<25 | 50>(initialLimit);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  async function loadRows(nextLimit: 25 | 50) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/raw-stats?leaderboard=1&limit=${nextLimit}`);
      const json = (await res.json()) as RawStatsWithLeaderboard;
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Failed to load leaderboard");
      }
      setRows(json.leaderboard ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function openModal() {
    setOpen(true);
    await loadRows(limit);
  }

  async function onLimitChange(next: 25 | 50) {
    setLimit(next);
    await loadRows(next);
  }

  const caption = useMemo(() => `${rows.length} rows`, [rows.length]);

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-xl border border-lime-300/35 bg-lime-300/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-lime-200 transition hover:bg-lime-300/20"
      >
        {buttonLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="table-shell w-full max-w-4xl rounded-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
              <div>
                <h3 className="text-base font-semibold text-zinc-100 sm:text-lg">{title}</h3>
                <p className="text-xs text-zinc-400">{caption}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onLimitChange(25)}
                  className={`rounded-lg border px-2.5 py-1 text-xs ${
                    limit === 25
                      ? "border-lime-300/45 bg-lime-300/12 text-lime-200"
                      : "border-white/15 bg-white/[0.03] text-zinc-300"
                  }`}
                >
                  Top 25
                </button>
                <button
                  type="button"
                  onClick={() => onLimitChange(50)}
                  className={`rounded-lg border px-2.5 py-1 text-xs ${
                    limit === 50
                      ? "border-lime-300/45 bg-lime-300/12 text-lime-200"
                      : "border-white/15 bg-white/[0.03] text-zinc-300"
                  }`}
                >
                  Top 50
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-white/15 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-300"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="max-h-[66vh] overflow-auto">
              {loading && <p className="px-5 py-4 text-sm text-zinc-300">Loading leaderboard...</p>}
              {error && <p className="px-5 py-4 text-sm text-red-300">{error}</p>}
              {!loading && !error && (
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="sticky top-0 bg-zinc-950/95">
                    <tr className="border-b border-white/10 text-xs uppercase tracking-[0.12em] text-zinc-400">
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Wallet</th>
                      <th className="px-4 py-3">Burned USD</th>
                      <th className="px-4 py-3">Burned XEN</th>
                      <th className="px-4 py-3">Tx</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-200">
                    {rows.map((row, idx) => (
                      <tr key={`${row.walletAddress}-${idx}`} className="hover:bg-white/[0.03]">
                        <td className="px-4 py-3 font-mono text-zinc-400">#{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-zinc-100" title={row.walletAddress}>
                          {shortAddress(row.walletAddress)}
                        </td>
                        <td className="px-4 py-3 font-mono text-lime-200">{formatUsd(row.burnedUsd)}</td>
                        <td className="px-4 py-3 font-mono">{formatXen(row.burnedXen)}</td>
                        <td className="px-4 py-3 font-mono">{formatXen(row.txCount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
