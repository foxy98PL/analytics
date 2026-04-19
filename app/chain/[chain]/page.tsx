import { BurnDashboard } from "@/components/BurnDashboard";
import { CHAIN_CONFIGS, isChainKey, isChainEnabled } from "@/lib/chains";
import { notFound } from "next/navigation";

export default async function ChainPage({
  params,
}: {
  params: Promise<{ chain: string }>;
}) {
  const { chain } = await params;
  const key = chain.toLowerCase();
  if (!isChainKey(key) || !isChainEnabled(key)) {
    notFound();
  }

  const cfg = CHAIN_CONFIGS[key];

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10">
      <header className="enterprise-hero mb-8 rounded-[2rem] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="enterprise-kicker text-xs text-zinc-400">Chain Dashboard</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-50">{cfg.label}</h2>
            <p className="mt-3 max-w-3xl text-slate-300/84">Track burns, daily USD estimate, and wallet drill-down for this network.</p>
          </div>
          <div className="enterprise-panel-soft rounded-[1.4rem] px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Network scope</p>
            <p className="mt-2 font-mono text-sm text-slate-100">{cfg.tokenAddress.slice(0, 10)}...{cfg.tokenAddress.slice(-8)}</p>
          </div>
        </div>
      </header>
      <BurnDashboard chain={key} />
    </main>
  );
}
