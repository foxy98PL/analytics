import { WalletMultiChainSummary } from "@/components/WalletMultiChainSummary";
import { NetworkBreakdownTable } from "@/components/NetworkBreakdownTable";
import { ACTIVE_CHAIN_KEYS, CHAIN_CONFIGS } from "@/lib/chains";
import { loadRawStatsAllChains } from "@/lib/burn-analytics-store";
import { hasSupabaseAdmin } from "@/lib/supabase-server";
import Link from "next/link";

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

type OverviewChainRow = {
  chain: (typeof ACTIVE_CHAIN_KEYS)[number];
  burnedXen: number;
  burnedUsd: number;
  txCount: number;
  wallets: number;
  avgUsdPerTx: number;
};

export default async function Home() {
  const payload = hasSupabaseAdmin() ? await loadRawStatsAllChains() : null;

  const allRows = payload?.chains ?? ACTIVE_CHAIN_KEYS.map((chain) => ({
    chain,
    burnedXen: 0,
    burnedUsd: 0,
    txCount: 0,
    wallets: 0,
    avgUsdPerTx: 0,
  }));

  // Only show chains that are enabled in chain-config.json
  const chains = allRows.filter((r) => ACTIVE_CHAIN_KEYS.includes(r.chain));

  const totals = payload?.totals ?? { burnedXen: 0, burnedUsd: 0, txCount: 0, wallets: 0 };
  const topChain = chains.reduce<(typeof chains)[number] | null>((best, row) => {
    if (!best || row.burnedUsd > best.burnedUsd) return row;
    return best;
  }, null);

  return (
    <main className="mx-auto w-full max-w-[1520px] px-4 py-8 sm:px-6 lg:px-10">
      <section className="enterprise-hero mb-8 overflow-hidden rounded-[2rem] p-7 sm:p-9">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_380px]">
          <div>
            <p className="enterprise-kicker text-[11px] text-zinc-400">XEN burn command center</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-tight text-slate-50 sm:text-5xl">
              Total XEN burned across all active networks
            </h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-slate-200/82">
              Cross-chain burn volume, network contribution, and wallet-level drill-down in one clean dashboard.
            </p>
          </div>

          <div className="enterprise-panel-soft rounded-[1.75rem] p-5">
            <p className="enterprise-kicker text-[11px] text-slate-400">Snapshot</p>
            <div className="mt-5 space-y-4">
              <div className="flex items-end justify-between gap-4 border-b border-white/8 pb-3">
                <div>
                  <p className="text-sm text-slate-400">Active chains</p>
                  <p className="mt-1 text-3xl font-semibold text-slate-50">{chains.length}</p>
                </div>
                <p className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-xs text-slate-300">
                  updated now
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Leading network</p>
                <p className="mt-1 text-lg font-medium text-slate-100">
                  {topChain ? CHAIN_CONFIGS[topChain.chain].label : "No data"}
                </p>
                <p className="mt-1 font-mono text-sm text-[#c7e7de]">
                  {topChain ? formatUsd(topChain.burnedUsd) : formatUsd(0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!payload && (
        <p className="mb-8 rounded-2xl border border-amber-300/25 bg-amber-950/25 px-4 py-3 text-sm text-amber-100/90 backdrop-blur-xl">
          Supabase is not configured — global statistics are empty.
        </p>
      )}

      <section className="mb-8 grid auto-rows-[minmax(120px,auto)] grid-cols-1 gap-4 lg:grid-cols-12">
        <article className="enterprise-panel rounded-[1.8rem] p-6 lg:col-span-4">
          <p className="enterprise-kicker text-xs text-slate-400">Total burned USD</p>
          <p className="mt-3 text-4xl font-semibold text-slate-50 sm:text-5xl">{formatUsd(totals.burnedUsd)}</p>
        </article>

        <article className="enterprise-panel-soft rounded-[1.8rem] p-6 lg:col-span-4">
          <p className="enterprise-kicker text-xs text-slate-400">Top network</p>
          {topChain && (
            <>
              <p className="mt-3 text-2xl font-semibold text-slate-50">{CHAIN_CONFIGS[topChain.chain].label}</p>
              <p className="mt-2 font-mono text-sm text-lime-200">{formatUsd(topChain.burnedUsd)}</p>
              <p className="mt-4 text-sm leading-6 text-slate-300/78">Highest burn contribution in the current active network set.</p>
            </>
          )}
        </article>

        <article className="enterprise-panel-soft rounded-[1.8rem] p-6 lg:col-span-4">
          <p className="enterprise-kicker text-xs text-slate-400">Avg cost / tx</p>
          <p className="mt-3 text-3xl font-semibold text-slate-50">
            {totals.txCount > 0 ? formatUsd(totals.burnedUsd / totals.txCount) : formatUsd(0)}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300/78">Global average burn cost across all active networks.</p>
        </article>
      </section>

      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="enterprise-kicker text-xs text-slate-400">By network</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-50">XEN burned per chain</h2>
          </div>
          <p className="text-sm text-slate-400/90">Direct entry points into each chain dashboard.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {chains.map((row) => (
            <Link
              key={row.chain}
              href={`/chain/${row.chain}`}
              className="enterprise-panel-soft group rounded-[1.5rem] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="enterprise-kicker text-[11px] text-slate-400">{CHAIN_CONFIGS[row.chain].label}</p>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">open</span>
              </div>
              <p className="mt-4 font-mono text-lg text-slate-100">{formatXen(row.burnedXen)} XEN</p>
              <p className="mt-1 font-mono text-sm text-lime-200">{formatUsd(row.burnedUsd)}</p>
              <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4 text-xs text-slate-400">
                <span>{formatXen(row.txCount)} tx</span>
                <span>{formatXen(row.wallets)} wallets</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-4">
          <p className="enterprise-kicker text-xs text-slate-400">Raw statistics</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-50">Full breakdown by network</h2>
          <p className="mt-2 text-sm text-slate-400/85">Kliknij wiersz sieci, aby otworzyc leaderboard top walleti.</p>
        </div>
        <NetworkBreakdownTable rows={chains as OverviewChainRow[]} />
      </section>

      {/* Wallet lookup */}
      <WalletMultiChainSummary />
    </main>
  );
}

