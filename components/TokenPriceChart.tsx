"use client";

import type { DayBurnSummary } from "@/lib/burn-types";
import type { ChainKey } from "@/lib/chains";
import { txExplorerUrl } from "@/lib/chains";
import type { TokenHistoryPayload } from "@/lib/token-types";
import type { EChartsOption } from "echarts";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";

type Row = {
  t: string;
  price: number;
  marketCap?: number;
  volume?: number;
};

type BurnPoint = {
  t: string;
  price: number;
  burnTotal: number;
  txCount: number;
  dayKey: string;
  txs: DayBurnSummary["txs"];
};

type ScatterDatum = {
  value: [string, number, number, number];
  burnTotal: number;
  burnUsd: number;
  txCount: number;
  txs: DayBurnSummary["txs"];
  t: string;
  price: number;
};

function toRows(payload: TokenHistoryPayload): Row[] {
  return payload.data.map((d) => ({
    t: d.timestamp,
    price: Number(d.value),
    marketCap: d.marketCap != null ? Number(d.marketCap) : undefined,
    volume: d.totalVolume != null ? Number(d.totalVolume) : undefined,
  }));
}

function formatTick(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatUsdPrice(v: number, maxFractionDigits = 18): string {
  if (!Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  const abs = Math.abs(v);
  const capped = Math.min(maxFractionDigits, 24);
  const s = v.toLocaleString("en-US", {
    useGrouping: false,
    maximumFractionDigits: capped,
    minimumFractionDigits: 0,
  });
  if (s.includes("e") || s.includes("E")) {
    const sign = v < 0 ? "-" : "";
    const raw = abs.toFixed(capped).replace(/\.?0+$/, "");
    return sign + raw;
  }
  return s;
}

function formatUsdAxisTick(v: number): string {
  return formatUsdPrice(v, 8);
}

function formatXenHuman(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const CHART_LINE = "#60a5fa";
const CHART_GRID = "rgba(255,255,255,0.06)";
const CHART_AXIS = "#94a3b8";

type RangePreset = "all" | "365d" | "90d" | "30d" | "7d" | "custom";

function indicesForPreset(all: Row[], preset: Exclude<RangePreset, "custom">): {
  start: number;
  end: number;
} {
  const end = all.length - 1;
  if (preset === "all" || all.length === 0) {
    return { start: 0, end };
  }
  const lastMs = new Date(all[end]!.t).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const days = preset === "365d" ? 365 : preset === "90d" ? 90 : preset === "30d" ? 30 : 7;
  const cutoff = lastMs - days * dayMs;
  let start = 0;
  for (let i = 0; i < all.length; i++) {
    if (new Date(all[i]!.t).getTime() >= cutoff) {
      start = i;
      break;
    }
  }
  return { start, end };
}

function burnRadius(total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 6;
  const r = 6 + Math.log10(total + 10) * 2.1;
  return Math.min(16, Math.max(6, r));
}

export type TokenPriceChartProps = {
  chain: ChainKey;
  burnByDay?: DayBurnSummary[] | null;
};

function TokenPriceChartImpl({ chain, burnByDay = null }: TokenPriceChartProps) {
  const [allRows, setAllRows] = useState<Row[] | null>(null);
  const [meta, setMeta] = useState<{ network: string; address: string } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(0);
  const [preset, setPreset] = useState<RangePreset>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/token-history?chain=${chain}`);
        const json = (await res.json()) as TokenHistoryPayload & { error?: string };
        if (!res.ok) {
          throw new Error(json.error ?? res.statusText);
        }
        if ("error" in json && json.error) {
          throw new Error(json.error);
        }
        if (!cancelled) {
          const next = toRows(json as TokenHistoryPayload);
          setAllRows(next);
          setMeta({ network: json.network, address: json.address });
          if (next.length > 0) {
            setStartIndex(0);
            setEndIndex(next.length - 1);
            setPreset("all");
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chain]);

  const visibleRows = useMemo(() => {
    if (!allRows?.length) return [];
    const s = Math.max(0, Math.min(startIndex, allRows.length - 1));
    const e = Math.max(s, Math.min(endIndex, allRows.length - 1));
    return allRows.slice(s, e + 1);
  }, [allRows, startIndex, endIndex]);

  const burnScatterPoints = useMemo((): BurnPoint[] => {
    if (!burnByDay?.length || !allRows?.length) return [];
    const byDay = new Map(burnByDay.map((d) => [d.dayKey, d]));
    const rowByDay = new Map(allRows.map((r) => [r.t.slice(0, 10), r]));
    const out: BurnPoint[] = [];
    for (const [dayKey, row] of rowByDay) {
      const b = byDay.get(dayKey);
      if (!b || b.totalXen <= 0) continue;
      out.push({
        t: row.t,
        price: row.price,
        burnTotal: b.totalXen,
        txCount: b.txCount,
        dayKey,
        txs: b.txs,
      });
    }
    return out;
  }, [burnByDay, allRows]);

  const rangeLabel = useMemo(() => {
    if (!allRows?.length || !visibleRows.length) return null;
    const from = visibleRows[0]!.t;
    const to = visibleRows[visibleRows.length - 1]!.t;
    const opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" };
    return `${new Date(from).toLocaleDateString("en-US", opts)} — ${new Date(to).toLocaleDateString("en-US", opts)}`;
  }, [allRows, visibleRows]);

  const applyPreset = useCallback(
    (p: Exclude<RangePreset, "custom">) => {
      if (!allRows?.length) return;
      const { start, end } = indicesForPreset(allRows, p);
      setStartIndex(start);
      setEndIndex(end);
      setPreset(p);
    },
    [allRows]
  );

  const onDataZoom = useCallback(
    (event: unknown) => {
      if (!allRows?.length) return;

      const payload = event as {
        startValue?: number | string;
        endValue?: number | string;
        batch?: Array<{ startValue?: number | string; endValue?: number | string }>;
      };

      const scope = payload.batch?.[0] ?? payload;
      const rawStart = scope.startValue;
      const rawEnd = scope.endValue;

      const toIndex = (v: number | string | undefined): number | null => {
        if (typeof v === "number" && Number.isFinite(v)) {
          return Math.max(0, Math.min(allRows.length - 1, Math.round(v)));
        }
        if (typeof v === "string") {
          const exact = allRows.findIndex((r) => r.t === v);
          if (exact >= 0) return exact;
          const day = v.slice(0, 10);
          const byDay = allRows.findIndex((r) => r.t.startsWith(day));
          if (byDay >= 0) return byDay;
        }
        return null;
      };

      const s = toIndex(rawStart);
      const e = toIndex(rawEnd);
      if (s == null || e == null) return;

      const ns = Math.min(s, e);
      const ne = Math.max(s, e);
      setStartIndex(ns);
      setEndIndex(ne);
      if (ns === 0 && ne === allRows.length - 1) setPreset("all");
      else setPreset("custom");
    },
    [allRows]
  );

  const zoomIn = useCallback(() => {
    if (!allRows?.length) return;
    const span = endIndex - startIndex + 1;
    if (span <= 4) return;
    const trim = Math.max(1, Math.floor(span * 0.12));
    const ns = startIndex + trim;
    const ne = endIndex - trim;
    if (ns < ne) {
      setStartIndex(ns);
      setEndIndex(ne);
      setPreset("custom");
    }
  }, [allRows?.length, startIndex, endIndex]);

  const zoomOut = useCallback(() => {
    if (!allRows?.length) return;
    const max = allRows.length - 1;
    const span = endIndex - startIndex + 1;
    const grow = Math.max(1, Math.floor(span * 0.2));
    const ns = Math.max(0, startIndex - grow);
    const ne = Math.min(max, endIndex + grow);
    setStartIndex(ns);
    setEndIndex(ne);
    if (ns === 0 && ne === max) setPreset("all");
    else setPreset("custom");
  }, [allRows, startIndex, endIndex]);

  const resetRange = useCallback(() => {
    if (!allRows?.length) return;
    setStartIndex(0);
    setEndIndex(allRows.length - 1);
    setPreset("all");
  }, [allRows]);

  const chartOption = useMemo((): EChartsOption | null => {
    if (!allRows?.length) return null;

    const xData = allRows.map((r) => r.t);
    const lineData = allRows.map((r) => r.price);
    const scatterData: ScatterDatum[] = burnScatterPoints.map((p) => ({
      value: [p.t, p.price, p.burnTotal, p.txCount],
      burnTotal: p.burnTotal,
      burnUsd: p.txs.reduce((sum, tx) => sum + tx.usdValue, 0),
      txCount: p.txCount,
      txs: p.txs,
      t: p.t,
      price: p.price,
    }));

    return {
      backgroundColor: "transparent",
      animationDuration: 360,
      animationDurationUpdate: 220,
      textStyle: { color: CHART_AXIS },
      grid: { top: 20, right: 18, bottom: 84, left: 84 },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: xData,
        axisLabel: {
          color: CHART_AXIS,
          fontSize: 12,
          formatter: (v: string) => formatTick(v),
        },
        axisLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: {
          color: CHART_AXIS,
          fontSize: 12,
          formatter: (v: number) => formatUsdAxisTick(v),
        },
        splitLine: {
          lineStyle: {
            color: CHART_GRID,
            type: "dashed",
          },
        },
      },
      tooltip: {
        trigger: "axis",
        enterable: true,
        backgroundColor: "rgba(15,23,42,0.95)",
        borderColor: "rgba(56,189,248,0.35)",
        textStyle: { color: "#e2e8f0" },
        formatter: (params: unknown) => {
          const list = (Array.isArray(params) ? params : [params]) as Array<{
            seriesType?: string;
            axisValue?: string;
            value?: unknown;
            data?: unknown;
          }>;

          const scatter = list.find((item) => item.seriesType === "scatter");
          const axisVal = scatter?.axisValue ?? list[0]?.axisValue ?? "";
          const ts = axisVal ? new Date(axisVal) : null;

          if (scatter?.data && typeof scatter.data === "object") {
            const item = scatter.data as ScatterDatum;
            const txList = item.txs
              .slice(0, 10)
              .map((tx) => {
                const short = `${tx.hash.slice(0, 12)}…`;
                return `<li style="display:flex;gap:.5rem;align-items:baseline;flex-wrap:wrap;font-size:12px;line-height:1.35;">
                  <a href="${txExplorerUrl(chain, tx.hash)}" target="_blank" rel="noopener noreferrer" style="color:#67e8f9;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;text-decoration:none;">${escapeHtml(short)}</a>
                  <span style="color:#94a3b8;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${formatXenHuman(tx.xenAmount)} XEN</span>
                </li>`;
              })
              .join("");

            return `
              <div style="max-width:min(90vw,360px);padding:10px 12px;">
                <div style="font-size:12px;color:#67e8f9;opacity:.9;">${ts?.toLocaleDateString("en-US", { dateStyle: "full", timeZone: "UTC" }) ?? ""}</div>
                <div style="margin-top:6px;font-size:15px;font-weight:600;color:#f1f5f9;">Burned on this day: ${formatXenHuman(item.burnTotal)} XEN</div>
                <div style="font-size:12px;color:#94a3b8;">${item.txCount} transactions</div>
                <div style="font-size:12px;color:#c4b5fd;">Burned value: ${formatUsdPrice(item.burnUsd, 2)} USD</div>
                <ul style="margin:8px 0 0;max-height:140px;overflow:auto;padding:8px 0 0;border-top:1px solid rgba(255,255,255,.1);list-style:none;">${txList}</ul>
                ${item.txs.length > 10 ? '<div style="font-size:11px;color:#64748b;margin-top:4px;">Full list is available in the table below.</div>' : ""}
                <div style="font-size:12px;color:#94a3b8;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.1);">Day close price: $${formatUsdPrice(item.price)}</div>
              </div>
            `;
          }

          const first = list[0];
          const raw = first?.value;
          const price = typeof raw === "number" ? raw : Number(Array.isArray(raw) ? raw[1] : raw);

          return `
            <div style="padding:8px 10px;">
              <div style="font-size:12px;color:#94a3b8;">${ts?.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) ?? ""}</div>
              <div style="margin-top:4px;font-size:15px;font-weight:600;color:#e0f2fe;">$${formatUsdPrice(price)}</div>
              <div style="font-size:11px;color:#64748b;">Daily close price</div>
            </div>
          `;
        },
      },
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: 0,
          filterMode: "none",
          startValue: allRows[startIndex]?.t,
          endValue: allRows[endIndex]?.t,
          moveOnMouseMove: true,
          zoomOnMouseWheel: true,
        },
        {
          type: "slider",
          xAxisIndex: 0,
          filterMode: "none",
          height: 24,
          bottom: 24,
          brushSelect: true,
          borderColor: "rgba(56,189,248,0.35)",
          backgroundColor: "rgba(255,255,255,0.04)",
          dataBackground: {
            lineStyle: { color: "rgba(96,165,250,0.7)" },
            areaStyle: { color: "rgba(96,165,250,0.2)" },
          },
          fillerColor: "rgba(96,165,250,0.24)",
          handleStyle: { color: "#60a5fa", borderColor: "#67e8f9" },
          textStyle: { color: "#a8a29e" },
          startValue: allRows[startIndex]?.t,
          endValue: allRows[endIndex]?.t,
        },
      ],
      series: [
        {
          type: "line",
          name: "Price",
          smooth: true,
          showSymbol: false,
          symbol: "none",
          lineStyle: { width: 2, color: CHART_LINE },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(96,165,250,0.35)" },
                { offset: 0.55, color: "rgba(96,165,250,0.08)" },
                { offset: 1, color: "rgba(96,165,250,0.0)" },
              ],
            },
          },
          emphasis: { focus: "series" },
          data: lineData,
          z: 2,
        },
        {
          type: "scatter",
          name: "Burns",
          data: scatterData,
          encode: { x: 0, y: 1 },
          symbol: "circle",
          symbolSize: (raw: unknown) => {
            if (!Array.isArray(raw)) return 10;
            const total = Number(raw[2]);
            return burnRadius(total);
          },
          itemStyle: {
            color: "rgba(167,139,250,0.75)",
            borderColor: "rgba(224,231,255,0.7)",
            borderWidth: 1,
            shadowBlur: 8,
            shadowColor: "rgba(167,139,250,0.25)",
          },
          emphasis: {
            scale: 1.04,
            itemStyle: {
              shadowBlur: 10,
              shadowColor: "rgba(167,139,250,0.35)",
            },
          },
          z: 4,
        },
      ],
    } satisfies EChartsOption;
  }, [allRows, burnScatterPoints, chain, startIndex, endIndex]);

  const chartEvents = useMemo(
    () => ({
      datazoom: onDataZoom,
    }),
    [onDataZoom]
  );

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-950/40 px-5 py-4 text-sm text-red-200 backdrop-blur-sm">
        {error}
      </div>
    );
  }

  if (!allRows || allRows.length === 0 || !chartOption) {
    return (
      <div className="flex h-[min(420px,55vh)] w-full flex-col justify-center gap-3 rounded-2xl border border-white/10 bg-stone-900/50 p-6 backdrop-blur-md">
        <div className="h-3 w-1/3 animate-pulse rounded-full bg-white/10" />
        <div className="h-[min(320px,40vh)] w-full animate-pulse rounded-xl bg-white/5" />
        <div className="h-3 w-1/4 animate-pulse rounded-full bg-white/10" />
      </div>
    );
  }

  const presetBtn =
    "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm";
  const presetActive =
    "bg-gradient-to-r from-cyan-300 to-violet-400 text-slate-950 shadow-[0_10px_24px_-14px_rgba(56,189,248,0.95)]";
  const presetIdle =
    "bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10";

  return (
    <div className="flex w-full flex-col gap-4">
      {meta && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
          <span className="font-medium text-slate-200">{meta.network}</span>
          <span className="hidden text-slate-600 sm:inline">·</span>
          <code className="max-w-full truncate rounded-lg bg-slate-950/50 px-2 py-1 font-mono text-xs text-slate-300 ring-1 ring-white/10">
            {meta.address}
          </code>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-sky-300/20 bg-gradient-to-br from-sky-500/[0.08] to-violet-500/[0.08] p-3 ring-1 ring-sky-200/15 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-300/80">
            Range
          </span>
          {(
            [
              ["all", "All"],
              ["365d", "1Y"],
              ["90d", "90D"],
              ["30d", "30D"],
              ["7d", "7D"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={`${presetBtn} ${preset === key ? presetActive : presetIdle}`}
            >
              {label}
            </button>
          ))}
          {preset === "custom" && (
            <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-cyan-200/90">
              custom
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-300/80 sm:mr-1">Timeline</span>
          <button
            type="button"
            title="Zoom in (narrower range)"
            onClick={zoomIn}
            className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-white/5 text-lg font-semibold text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
          >
            +
          </button>
          <button
            type="button"
            title="Zoom out (wider range)"
            onClick={zoomOut}
            className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-white/5 text-lg font-semibold text-slate-200 ring-1 ring-white/10 hover:bg-white/10"
          >
            −
          </button>
          <button
            type="button"
            onClick={resetRange}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-white/10 hover:bg-white/5 hover:text-slate-100"
          >
            Reset
          </button>
        </div>
      </div>

      {rangeLabel && (
        <p className="text-center text-sm text-slate-300/90">
          {rangeLabel}
          <span className="ml-2 text-slate-400/70">
            ({visibleRows.length} {visibleRows.length === 1 ? "day" : "days"})
          </span>
        </p>
      )}

      <div className="relative overflow-hidden rounded-3xl border border-sky-300/20 bg-gradient-to-b from-sky-500/[0.08] to-violet-500/[0.08] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_80px_-12px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56,189,248,0.3), transparent 55%)",
          }}
        />
        <div className="relative h-[min(460px,56vh)] w-full min-h-[300px]">
          <ReactECharts
            option={chartOption}
            style={{ height: "100%", width: "100%" }}
            notMerge={true}
            lazyUpdate={true}
            onEvents={chartEvents}
          />
        </div>

        <p className="relative mt-3 text-center text-xs text-slate-300/75 sm:text-sm">
          Use the slider to choose a range. Hover burn markers to see grouped daily burns and transactions.
        </p>
      </div>

      <p className="text-center text-xs text-slate-300/75">
        Daily price (USD) · markers = days with XEN burns (grouped by day)
      </p>
    </div>
  );
}

export const TokenPriceChart = memo(
  TokenPriceChartImpl,
  (prev, next) => prev.burnByDay === next.burnByDay && prev.chain === next.chain
);
