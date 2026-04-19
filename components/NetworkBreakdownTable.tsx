"use client";

import type { ChainKey } from "@/lib/chains";
import { CHAIN_CONFIGS } from "@/lib/chains";
import { useMemo, useState } from "react";

type ChainRow = {
  chain: ChainKey;
  burnedXen: number;
  burnedUsd: number;
  txCount: number;
  wallets: number;
  avgUsdPerTx: number;
};

type LeaderboardRow = {
  walletAddress: string;
  burnedUsd: number;
  burnedXen: number;
  txCount: number;
  chain: ChainKey;
};

type LeaderboardResponse = {
  leaderboard?: LeaderboardRow[];
  error?: string;
};

function formatXen(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function shortAddress(a: string): string {
  if (!a.startsWith("0x") || a.length < 14) return a;
  return `${a.slice(0, 8)}...${a.slice(-6)}`;
}

export function NetworkBreakdownTable({ rows }: { rows: ChainRow[] }) {
  const [open, setOpen] = useState(false);
  const [selectedChain, setSelectedChain] = useState<ChainKey | null>(null);
  const [limit, setLimit] = useState<25 | 50>(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);

  const selectedLabel = selectedChain ? CHAIN_CONFIGS[selectedChain].label : "";
  const caption = useMemo(() => `${leaderboard.length} rows`, [leaderboard.length]);

  async function loadLeaderboard(chain: ChainKey, nextLimit: 25 | 50) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/raw-stats/leaderboard?chain=${chain}&limit=${nextLimit}`);
      const json = (await res.json()) as LeaderboardResponse;
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Failed to load leaderboard");
      }
      setLeaderboard(json.leaderboard ?? []);
    } catch (e) {
      setLeaderboard([]);
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function onRowClick(chain: ChainKey) {
    setSelectedChain(chain);
    setLimit(25);
    setOpen(true);
    await loadLeaderboard(chain, 25);
  }

  async function onLimitChange(next: 25 | 50) {
    if (!selectedChain) return;
    setLimit(next);
    await loadLeaderboard(selectedChain, next);
  }

  return (
    <>
      <div className="table-shell overflow-hidden rounded-[1.6rem]">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-zinc-950/84">
            <tr className="border-b border-white/10 text-xs uppercase tracking-[0.12em] text-zinc-300/85">
              <th className="px-4 py-3">Network</th>
              <th className="px-4 py-3">Burned XEN</th>
              <th className="px-4 py-3">Burned USD</th>
              <th className="px-4 py-3">Transactions</th>
              <th className="px-4 py-3">Wallets</th>
              <th className="px-4 py-3">Avg USD / Tx</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-zinc-200">
            {rows.map((row) => (
              <tr
                key={row.chain}
                className="cursor-pointer hover:bg-white/[0.04]"
                onClick={() => onRowClick(row.chain)}
                title={`Open ${CHAIN_CONFIGS[row.chain].label} leaderboard`}
              >
                <td className="px-4 py-3 font-medium">{CHAIN_CONFIGS[row.chain].label}</td>
                <td className="px-4 py-3 font-mono">{formatXen(row.burnedXen)}</td>
                <td className="px-4 py-3 font-mono">{formatUsd(row.burnedUsd)}</td>
                <td className="px-4 py-3 font-mono">{formatXen(row.txCount)}</td>
                <td className="px-4 py-3 font-mono">{formatXen(row.wallets)}</td>
                <td className="px-4 py-3 font-mono">{formatUsd(row.avgUsdPerTx)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && selectedChain && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="table-shell w-full max-w-4xl rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
              <div>
                <h3 className="text-base font-semibold text-zinc-100 sm:text-lg">{selectedLabel} leaderboard</h3>
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
                    {leaderboard.map((row, idx) => (
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
