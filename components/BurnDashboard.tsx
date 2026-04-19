"use client";

import type { DayBurnSummary } from "@/lib/burn-types";
import type { ChainKey } from "@/lib/chains";
import { CHAIN_CONFIGS, txExplorerUrl } from "@/lib/chains";
import { Fragment, useCallback, useMemo, useState } from "react";
import { TokenPriceChart } from "./TokenPriceChart";

type ApiOk = {
  byDay: DayBurnSummary[];
  totals: { xen: number; usd: number };
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

function formatDay(dayKey: string) {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  });
}

export function BurnDashboard({ chain }: { chain: ChainKey }) {
  const chainCfg = CHAIN_CONFIGS[chain];
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ApiOk | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const loadBurns = useCallback(async () => {
    setErr(null);
    setLoading(true);
    setData(null);
    setSelectedDayKey(null);
    try {
      const res = await fetch("/api/wallet-burns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: input.trim(), chain }),
      });
      const json = (await res.json()) as ApiOk;
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Failed to fetch burn data");
      }
      setData(json);
      setSelectedDayKey(json.byDay?.[0]?.dayKey ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [chain, input]);

  const dailyBurns = useMemo(() => {
    if (!data?.byDay?.length) return [];
    return data.byDay.map((d) => ({
      dayKey: d.dayKey,
      totalXen: d.totalXen,
      txCount: d.txCount,
      totalUsd: d.txs.reduce((sum, tx) => sum + tx.usdValue, 0),
      txs: d.txs.map((tx) => ({
        ...tx,
        timeLabel: new Date(tx.timestamp).toLocaleString("en-US", {
          dateStyle: "short",
          timeStyle: "short",
          timeZone: "UTC",
        }),
        shortHash: `${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}`,
      })),
    }));
  }, [data]);

  const toggleDay = useCallback((dayKey: string) => {
    setSelectedDayKey((prev) => (prev === dayKey ? null : dayKey));
  }, []);

  return (
    <div className="flex w-full flex-col gap-8">
      <section className="enterprise-panel rounded-[1.9rem] p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="enterprise-kicker text-xs text-slate-400">Wallet lookup</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-50">{chainCfg.label}</h2>
          </div>
          <span className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 font-mono text-xs text-slate-200">
            Token: {chainCfg.tokenAddress.slice(0, 8)}...{chainCfg.tokenAddress.slice(-6)}
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-xs uppercase tracking-[0.14em] text-slate-400">Wallet address</span>
            <input
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="0x..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full rounded-2xl border border-white/12 bg-zinc-950/60 px-4 py-3 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-lime-300/60 focus:ring-4 focus:ring-lime-300/10"
            />
          </label>
          <button
            type="button"
            onClick={loadBurns}
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-2xl border border-lime-300/45 bg-lime-300 px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Loading..." : "Load burns"}
          </button>
        </div>

        {err && <p className="mt-3 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-300">{err}</p>}

        {data && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="metric-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Total burned XEN</p>
              <p className="mt-1 font-mono text-xl text-slate-50">{formatXen(data.totals.xen)}</p>
            </div>
            <div className="metric-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Total burned USD</p>
              <p className="mt-1 font-mono text-xl text-slate-50">{formatUsd(data.totals.usd)}</p>
            </div>
            <div className="metric-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-300">Burn days</p>
              <p className="mt-1 font-mono text-xl text-slate-50">{dailyBurns.length}</p>
            </div>
          </div>
        )}
      </section>

      <TokenPriceChart chain={chain} burnByDay={data?.byDay ?? null} />

      {dailyBurns.length > 0 && (
        <section className="table-shell overflow-hidden rounded-[1.8rem]">
          <div className="border-b border-white/10 px-4 py-3 sm:px-5">
            <h2 className="text-base font-semibold text-slate-100 sm:text-lg">Daily burn summary</h2>
          </div>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950/95">
                <tr className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-300/80">
                  <th className="w-12 px-4 py-3"></th>
                  <th className="px-4 py-3">Day (UTC)</th>
                  <th className="px-4 py-3">Burned XEN</th>
                  <th className="px-4 py-3">Burned USD</th>
                  <th className="px-4 py-3">Tx</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {dailyBurns.map((d, idx) => {
                  const selected = selectedDayKey === d.dayKey;
                  return (
                    <Fragment key={d.dayKey}>
                      <tr className={`border-b border-white/5 ${idx % 2 === 0 ? "bg-white/[0.025]" : "bg-white/[0.01]"}`}>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleDay(d.dayKey)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] text-xs"
                          >
                            {selected ? "-" : "+"}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono">{formatDay(d.dayKey)}</td>
                        <td className="px-4 py-3 font-mono">{formatXen(d.totalXen)}</td>
                        <td className="px-4 py-3 font-mono">{formatUsd(d.totalUsd)}</td>
                        <td className="px-4 py-3">{d.txCount}</td>
                      </tr>
                      {selected && (
                        <tr className="bg-slate-950/40">
                          <td colSpan={5} className="px-4 pb-4 pt-1">
                            <div className="max-h-[260px] overflow-auto rounded-xl border border-white/10 bg-black/15">
                              {d.txs.map((tx, txIndex) => (
                                <div
                                  key={`${d.dayKey}-${tx.hash}`}
                                  className={`grid grid-cols-[170px_1fr_1fr_1.2fr] gap-2 px-3 py-2 text-xs ${txIndex % 2 === 0 ? "bg-white/[0.02]" : "bg-white/[0.01]"}`}
                                >
                                  <span className="font-mono text-slate-300">{tx.timeLabel}</span>
                                  <span className="font-mono text-slate-100">{formatXen(tx.xenAmount)}</span>
                                  <span className="font-mono text-slate-100">{formatUsd(tx.usdValue)}</span>
                                  <a href={txExplorerUrl(chain, tx.hash)} target="_blank" rel="noopener noreferrer" className="truncate font-mono text-lime-200 underline">
                                    {tx.shortHash}
                                  </a>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
