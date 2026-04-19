"use client";

import type { ChainKey } from "@/lib/chains";
import { CHAIN_CONFIGS } from "@/lib/chains";
import { useEffect, useState } from "react";

type RawStatsResponse = {
  chains: {
    chain: ChainKey;
    burnedXen: number;
    burnedUsd: number;
    txCount: number;
    wallets: number;
    avgUsdPerTx: number;
  }[];
  totals: {
    burnedXen: number;
    burnedUsd: number;
    txCount: number;
    wallets: number;
  } | null;
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

export function RawStatsPanel() {
  const [data, setData] = useState<RawStatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/raw-stats");
        const json = (await res.json()) as RawStatsResponse;
        if (!res.ok || json.error) {
          throw new Error(json.error ?? "Failed to fetch raw stats");
        }
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unknown error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-slate-300/80">Loading raw stats...</p>;
  }

  return (
    <div className="space-y-6">
      {data.totals && (
        <section className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/15 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Total Burned XEN</p>
            <p className="mt-1 font-mono text-lg text-slate-50">{formatXen(data.totals.burnedXen)}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Total Burned USD</p>
            <p className="mt-1 font-mono text-lg text-slate-50">{formatUsd(data.totals.burnedUsd)}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Total Tx</p>
            <p className="mt-1 font-mono text-lg text-slate-50">{formatXen(data.totals.txCount)}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Wallets</p>
            <p className="mt-1 font-mono text-lg text-slate-50">{formatXen(data.totals.wallets)}</p>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-white/15 bg-black/25">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-950/90">
            <tr className="border-b border-white/10 text-xs uppercase tracking-[0.12em] text-slate-300/85">
              <th className="px-4 py-3">Chain</th>
              <th className="px-4 py-3">Burned XEN</th>
              <th className="px-4 py-3">Burned USD</th>
              <th className="px-4 py-3">Tx</th>
              <th className="px-4 py-3">Wallets</th>
              <th className="px-4 py-3">Avg USD / Tx</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-200">
            {data.chains.map((row) => (
              <tr key={row.chain}>
                <td className="px-4 py-3">{CHAIN_CONFIGS[row.chain].label}</td>
                <td className="px-4 py-3 font-mono">{formatXen(row.burnedXen)}</td>
                <td className="px-4 py-3 font-mono">{formatUsd(row.burnedUsd)}</td>
                <td className="px-4 py-3 font-mono">{formatXen(row.txCount)}</td>
                <td className="px-4 py-3 font-mono">{formatXen(row.wallets)}</td>
                <td className="px-4 py-3 font-mono">{formatUsd(row.avgUsdPerTx)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
