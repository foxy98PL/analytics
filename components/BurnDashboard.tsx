"use client";

import type { BurnTransferPublic, DayBurnSummary } from "@/lib/burn-types";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { TokenPriceChart } from "./TokenPriceChart";

type ApiOk = {
  transfers: BurnTransferPublic[];
  byDay: DayBurnSummary[];
  totals: { xen: number; usd: number };
  sync?: { updated: boolean; previousXen?: number; currentXen?: number; reason?: string };
  global?: {
    burnedXen: number;
    burnedUsd: number;
    txCount: number;
    wallets: number;
  } | null;
  leaderboard?: {
    walletAddress: string;
    burnedUsd: number;
    burnedXen: number;
    txCount: number;
  }[];
};

function formatXen(n: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(n);
}

function formatUsd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function txUrl(hash: string) {
  return `https://etherscan.io/tx/${hash}`;
}

function formatDay(dayKey: string) {
  return new Date(`${dayKey}T00:00:00Z`).toLocaleDateString("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  });
}

export function BurnDashboard() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ApiOk | null>(null);
  const [globalData, setGlobalData] = useState<{
    global: NonNullable<ApiOk["global"]> | null;
    leaderboard: NonNullable<ApiOk["leaderboard"]>;
  }>({ global: null, leaderboard: [] });
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/wallet-burns", { method: "GET" });
        const json = (await res.json()) as {
          global?: ApiOk["global"];
          leaderboard?: ApiOk["leaderboard"];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(json.error ?? "Failed to load global stats");
        }
        if (!cancelled) {
          setGlobalData({
            global: json.global ?? null,
            leaderboard: (json.leaderboard ?? []) as NonNullable<ApiOk["leaderboard"]>,
          });
        }
      } catch {
        if (!cancelled) {
          setGlobalData({ global: null, leaderboard: [] });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadBurns = useCallback(async () => {
    setErr(null);
    setLoading(true);
    setData(null);
    setSelectedDayKey(null);
    try {
      const res = await fetch("/api/wallet-burns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: input.trim() }),
      });
      const json = (await res.json()) as ApiOk & { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to fetch burn data");
      }
      if ("error" in json && json.error) {
        throw new Error(json.error);
      }
      setData(json);
      setGlobalData({
        global: json.global ?? null,
        leaderboard: (json.leaderboard ?? []) as NonNullable<ApiOk["leaderboard"]>,
      });
      const firstDay = json.byDay?.[0]?.dayKey ?? null;
      setSelectedDayKey(firstDay);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [input]);

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
        shortHash: `${tx.hash.slice(0, 10)}…${tx.hash.slice(-8)}`,
      })),
    }));
  }, [data]);

  const toggleDay = useCallback((dayKey: string) => {
    setSelectedDayKey((prev) => (prev === dayKey ? null : dayKey));
  }, []);

  return (
    <div className="flex w-full flex-col gap-8">
      <section
        className="rounded-3xl border border-sky-300/20 bg-gradient-to-br from-sky-500/[0.10] via-indigo-500/[0.07] to-violet-500/[0.08] p-5 shadow-[0_18px_70px_-28px_rgba(0,0,0,0.8)] backdrop-blur-xl ring-1 ring-sky-200/15 sm:p-6"
        aria-label="Wallet"
      >
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/90">
          Wallet input
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-xs text-slate-300/90">Wallet address (burn destination → 0x0, ERC-20 XEN)</span>
            <input
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="0x..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full rounded-2xl border border-sky-200/20 bg-slate-950/60 px-4 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-500 outline-none ring-0 transition focus:border-cyan-300/80 focus:ring-4 focus:ring-cyan-400/20"
            />
          </label>
          <button
            type="button"
            onClick={loadBurns}
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_8px_28px_-10px_rgba(56,189,248,0.75)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Loading..." : "Load burns"}
          </button>
        </div>
        {err && (
          <p className="mt-3 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-300" role="alert">
            {err}
          </p>
        )}

        {data && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-cyan-500/16 to-sky-500/12 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-cyan-100/85">
                Total burned (XEN)
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-cyan-100">
                {formatXen(data.totals.xen)}
              </p>
            </div>
            <div className="rounded-2xl border border-violet-300/25 bg-gradient-to-br from-violet-500/16 to-indigo-500/12 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-violet-100/85">
                Estimated value (USD)
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-violet-100">
                {formatUsd(data.totals.usd)}
              </p>
              <p className="mt-2 text-xs leading-snug text-slate-300/80">
                Total = amount × daily chart price. If a day has no exact price, the nearest previous known price is used.
              </p>
            </div>
            <div className="rounded-2xl border border-fuchsia-300/25 bg-gradient-to-br from-fuchsia-500/16 to-pink-500/12 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-fuchsia-100/85">
                Burn days
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-fuchsia-100">
                {dailyBurns.length}
              </p>
            </div>
          </div>
        )}
      </section>

      {globalData.global && (
        <section className="rounded-3xl border border-sky-300/20 bg-gradient-to-br from-cyan-500/[0.10] to-violet-500/[0.08] p-5 ring-1 ring-sky-200/15 backdrop-blur-xl sm:p-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-100 sm:text-lg">Global stats</h2>
              <p className="text-sm text-slate-300/80">Aggregated across all tracked wallets</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-300/80">Burned XEN</p>
              <p className="mt-1 font-mono text-lg text-cyan-100">{formatXen(globalData.global.burnedXen)}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-300/80">Burned USD</p>
              <p className="mt-1 font-mono text-lg text-violet-100">{formatUsd(globalData.global.burnedUsd)}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-300/80">Transactions</p>
              <p className="mt-1 font-mono text-lg text-slate-100">{formatXen(globalData.global.txCount)}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-300/80">Wallets</p>
              <p className="mt-1 font-mono text-lg text-slate-100">{formatXen(globalData.global.wallets)}</p>
            </div>
          </div>
        </section>
      )}

      {globalData.leaderboard.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-sky-300/20 bg-gradient-to-br from-sky-500/[0.08] to-violet-500/[0.08] ring-1 ring-sky-200/15 backdrop-blur-xl">
          <div className="border-b border-white/10 px-4 py-3 sm:px-5">
            <h2 className="text-base font-semibold text-slate-100 sm:text-lg">Leaderboard (USD burned)</h2>
            <p className="text-sm text-slate-300/80">Top wallets by cumulative burned USD</p>
          </div>
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur">
                <tr className="border-b border-white/10 text-xs uppercase tracking-[0.12em] text-slate-300/80">
                  <th className="px-4 py-3 font-medium sm:px-5">#</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Wallet</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Burned USD</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Burned XEN</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Tx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {globalData.leaderboard.map((row, i) => (
                  <tr key={`${row.walletAddress}-${i}`} className="hover:bg-white/[0.04]">
                    <td className="px-4 py-2.5 font-mono text-sm sm:px-5">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs sm:px-5">
                      {row.walletAddress.slice(0, 8)}…{row.walletAddress.slice(-6)}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-violet-100 sm:px-5">
                      {formatUsd(row.burnedUsd)}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums sm:px-5">
                      {formatXen(row.burnedXen)}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-slate-300 sm:px-5">
                      {formatXen(row.txCount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <TokenPriceChart burnByDay={data?.byDay ?? null} />

      {dailyBurns.length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-sky-300/20 bg-gradient-to-br from-sky-500/[0.08] to-violet-500/[0.08] ring-1 ring-sky-200/15 backdrop-blur-xl">
          <div className="border-b border-white/10 px-4 py-3 sm:px-5">
            <h2 className="text-base font-semibold text-slate-100 sm:text-lg">Daily burn summary (USD)</h2>
            <p className="text-sm text-slate-300/80">Single table view · click a day row to expand its transactions</p>
          </div>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur">
                <tr className="border-b border-white/10 text-xs uppercase tracking-[0.14em] text-slate-300/80">
                  <th className="px-4 py-3 font-medium sm:px-5 w-12"></th>
                  <th className="px-4 py-3 font-medium sm:px-5">Day (UTC)</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Burned XEN</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Burned USD</th>
                  <th className="px-4 py-3 font-medium sm:px-5">Tx</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {dailyBurns.map((d, idx) => {
                  const selected = selectedDayKey === d.dayKey;
                  return (
                    <Fragment key={d.dayKey}>
                      <tr
                        className={`border-b border-white/5 transition ${idx % 2 === 0 ? "bg-white/[0.02]" : "bg-white/[0.01]"} ${selected ? "bg-cyan-500/12" : "hover:bg-white/[0.06]"}`}
                      >
                        <td className="px-4 py-3 sm:px-5">
                          <button
                            type="button"
                            onClick={() => toggleDay(d.dayKey)}
                            aria-label={selected ? "Collapse day" : "Expand day"}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 bg-white/5 text-xs text-slate-200 hover:bg-white/10"
                          >
                            {selected ? "−" : "+"}
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-sm sm:px-5">{formatDay(d.dayKey)}</td>
                        <td className="px-4 py-3 font-mono tabular-nums text-sm sm:px-5">{formatXen(d.totalXen)}</td>
                        <td className="px-4 py-3 font-mono tabular-nums text-sm text-violet-100 sm:px-5">{formatUsd(d.totalUsd)}</td>
                        <td className="px-4 py-3 text-sm text-slate-300 sm:px-5">{d.txCount}</td>
                      </tr>

                      {selected && (
                        <tr className="bg-slate-950/45">
                          <td colSpan={5} className="px-4 pb-4 pt-1 sm:px-5">
                            <div className="rounded-xl border border-white/10 bg-slate-950/65 p-3">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-cyan-300/40 bg-cyan-500/15 px-2.5 py-1 text-xs font-medium text-cyan-100">
                                  {formatDay(d.dayKey)}
                                </span>
                                <span className="rounded-full border border-violet-300/40 bg-violet-500/15 px-2.5 py-1 text-xs font-medium text-violet-100">
                                  {formatUsd(d.totalUsd)}
                                </span>
                                <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-200">
                                  {d.txCount} tx
                                </span>
                              </div>

                              <div className="max-h-[260px] overflow-auto rounded-lg border border-white/10">
                                <div className="grid grid-cols-[170px_1fr_1fr_1.2fr] border-b border-white/10 bg-black/20 px-3 py-2 text-xs uppercase tracking-[0.12em] text-slate-400">
                                  <span>Time (UTC)</span>
                                  <span>XEN</span>
                                  <span>USD</span>
                                  <span>Transaction</span>
                                </div>

                                {d.txs.map((tx, txIndex) => (
                                  <div
                                    key={`${d.dayKey}-${tx.hash}`}
                                    className={`grid grid-cols-[170px_1fr_1fr_1.2fr] items-center gap-2 px-3 py-2 text-xs ${txIndex % 2 === 0 ? "bg-white/[0.02]" : "bg-white/[0.01]"}`}
                                  >
                                    <span className="font-mono text-xs text-slate-300">{tx.timeLabel}</span>
                                    <span className="font-mono tabular-nums text-sm text-slate-100">{formatXen(tx.xenAmount)}</span>
                                    <span className="font-mono tabular-nums text-sm text-violet-100">{formatUsd(tx.usdValue)}</span>
                                    <a
                                      href={txUrl(tx.hash)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex max-w-[220px] items-center gap-1 truncate font-mono text-xs text-cyan-300 underline decoration-cyan-400/40 underline-offset-2 hover:text-cyan-200"
                                    >
                                      {tx.shortHash}
                                    </a>
                                  </div>
                                ))}
                              </div>
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
