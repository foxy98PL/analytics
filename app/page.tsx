import { BurnDashboard } from "@/components/BurnDashboard";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage: `
            linear-gradient(rgba(125,211,252,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(167,139,250,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
        }}
      />
      <div
        className="pointer-events-none absolute -left-24 -top-20 h-[460px] w-[460px] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(34,211,238,0.22) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-20 top-12 h-[380px] w-[380px] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-[300px] w-[60vw] -translate-x-1/2 blur-3xl"
        style={{
          background: "radial-gradient(ellipse, rgba(56,189,248,0.14) 0%, transparent 70%)",
        }}
      />

      <main className="relative z-10 mx-auto flex min-h-screen w-[min(80%,1600px)] flex-col px-4 pb-16 pt-10 max-lg:w-[94%] sm:px-6 sm:pt-14 lg:px-8">
        <header className="mb-10 rounded-3xl border border-sky-300/20 bg-gradient-to-br from-sky-500/[0.10] via-indigo-500/[0.07] to-violet-500/[0.08] p-6 shadow-[0_22px_80px_-40px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:mb-12 sm:p-8">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200/90 sm:text-sm">
            On-chain
          </p>
          <h1 className="font-sans text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl sm:leading-[1.04]">
            <span className="text-white">XEN </span>
            <span className="bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 bg-clip-text text-transparent">
              BURN
            </span>
            <span className="text-white"> </span>
            <span className="text-slate-100">Analytics</span>
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Explore wallet burn history, daily burn clusters, and USD estimates on top of
            historical XEN price <data value="" className=""></data>
          </p>
        </header>

        <section className="flex-1" aria-label="Chart and burns">
          <BurnDashboard />
        </section>
      </main>
    </div>
  );
}
