"use client";

import type { ChainKey } from "@/lib/chains";
import { ACTIVE_CHAIN_KEYS, CHAIN_CONFIGS } from "@/lib/chains";
import { useMemo, useState } from "react";

type WalletBurnResponse = {
  chain: ChainKey;
  byDay: { txCount: number }[];
  totals: { xen: number; usd: number };
  transfers: { hash: string }[];
  error?: string;
};

type ChainWalletRow = {
  chain: ChainKey;
  burnedXen: number;
  burnedUsd: number;
  txCount: number;
  activeDays: number;
};

const ADDR = /^0x[a-fA-F0-9]{40}$/;

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

export function WalletMultiChainSummary() {
  const [address, setAddress] = useState("");
  const [rows, setRows] = useState<ChainWalletRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const totals = useMemo(() => {
    if (!rows?.length) return { burnedXen: 0, burnedUsd: 0, txCount: 0, activeDays: 0, activeChains: 0 };
    return {
      burnedXen: rows.reduce((sum, row) => sum + row.burnedXen, 0),
      burnedUsd: rows.reduce((sum, row) => sum + row.burnedUsd, 0),
      txCount: rows.reduce((sum, row) => sum + row.txCount, 0),
      activeDays: rows.reduce((sum, row) => sum + row.activeDays, 0),
      activeChains: rows.filter((row) => row.txCount > 0).length,
    };
  }, [rows]);

  async function handleSubmit() {
    const normalized = address.trim();
    setError(null);
    if (!ADDR.test(normalized)) {
      setRows(null);
      setError("Please enter a valid address: 0x + 40 hex chars.");
      return;
    }

    setLoading(true);
    try {
      const chainResults = await Promise.all(
        ACTIVE_CHAIN_KEYS.map(async (chain) => {
          const res = await fetch("/api/wallet-burns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: normalized, chain }),
          });
          const json = (await res.json()) as WalletBurnResponse;
          if (!res.ok || json.error) {
            throw new Error(json.error ?? `Cannot fetch burn data for ${chain}.`);
          }

          return {
            chain,
            burnedXen: json.totals.xen,
            burnedUsd: json.totals.usd,
            txCount: json.transfers.length,
            activeDays: json.byDay.length,
          } satisfies ChainWalletRow;
        })
      );

      setRows(chainResults.sort((a, b) => b.burnedUsd - a.burnedUsd));
    } catch (e) {
      setRows(null);
      setError(e instanceof Error ? e.message : "Unknown error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="enterprise-panel rounded-[1.85rem] p-5 sm:p-7">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="enterprise-kicker text-xs text-slate-400">Wallet summary</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-50">Burn summary for a single wallet</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300/82">A single wallet can burn on multiple networks, so the totals below aggregate across the full active chain set.</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-xs uppercase tracking-[0.14em] text-slate-400">Wallet address</span>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="0x..."
            className="w-full rounded-2xl border border-white/12 bg-zinc-950/60 px-4 py-3 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-lime-300/60 focus:ring-4 focus:ring-lime-300/10"
          />
        </label>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-2xl border border-lime-300/45 bg-lime-300 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Loading..." : "Look up burns"}
        </button>
      </div>

      {error && <p className="mt-4 rounded-xl border border-red-500/30 bg-red-950/35 px-3 py-2 text-sm text-red-300">{error}</p>}

      {rows && (
        <div className="mt-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="metric-card rounded-2xl p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Burned USD</p>
              <p className="mt-1 font-mono text-slate-50">{formatUsd(totals.burnedUsd)}</p>
            </div>
            <div className="metric-card rounded-2xl p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Burned XEN</p>
              <p className="mt-1 font-mono text-slate-50">{formatXen(totals.burnedXen)}</p>
            </div>
            <div className="metric-card rounded-2xl p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Transactions</p>
              <p className="mt-1 font-mono text-slate-50">{formatXen(totals.txCount)}</p>
            </div>
            <div className="metric-card rounded-2xl p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Active days</p>
              <p className="mt-1 font-mono text-slate-50">{formatXen(totals.activeDays)}</p>
            </div>
            <div className="metric-card rounded-2xl p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-300">Active networks</p>
              <p className="mt-1 font-mono text-slate-50">{formatXen(totals.activeChains)}</p>
            </div>
          </div>

          <div className="table-shell overflow-hidden rounded-[1.6rem]">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-950/90">
                <tr className="border-b border-white/10 text-xs uppercase tracking-[0.12em] text-slate-300/80">
                  <th className="px-4 py-3">Network</th>
                  <th className="px-4 py-3">Burned XEN</th>
                  <th className="px-4 py-3">Burned USD</th>
                  <th className="px-4 py-3">Transactions</th>
                  <th className="px-4 py-3">Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {rows.map((row) => (
                  <tr key={row.chain}>
                    <td className="px-4 py-3">{CHAIN_CONFIGS[row.chain].label}</td>
                    <td className="px-4 py-3 font-mono">{formatXen(row.burnedXen)}</td>
                    <td className="px-4 py-3 font-mono">{formatUsd(row.burnedUsd)}</td>
                    <td className="px-4 py-3 font-mono">{formatXen(row.txCount)}</td>
                    <td className="px-4 py-3 font-mono">{formatXen(row.activeDays)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}