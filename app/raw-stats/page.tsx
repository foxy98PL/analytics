import { RawStatsPanel } from "@/components/RawStatsPanel";

export default function RawStatsPage() {
  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10">
      <header className="mb-8 rounded-3xl border border-white/15 bg-black/25 p-6 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-300/80">Raw Analytics</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-50">Burned XEN and USD by chain</h2>
        <p className="mt-2 max-w-3xl text-slate-300/85">This view shows database-first metrics and lets you verify totals without extra API token usage.</p>
      </header>
      <RawStatsPanel />
    </main>
  );
}
