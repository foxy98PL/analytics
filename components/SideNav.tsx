"use client";

import { ACTIVE_CHAIN_KEYS, CHAIN_CONFIGS } from "@/lib/chains";
import Link from "next/link";
import { usePathname } from "next/navigation";

const overviewLinks = [
  { href: "/", label: "Overview" },
];

const chainLinks = ACTIVE_CHAIN_KEYS.map((chain) => ({ href: `/chain/${chain}`, label: CHAIN_CONFIGS[chain].label }));

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`group flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
        active
          ? "border-lime-300/50 bg-zinc-900 text-zinc-50 shadow-[0_18px_40px_-28px_rgba(166,227,109,0.34)]"
          : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/16 hover:bg-white/[0.06]"
      }`}
    >
      <span className="font-medium tracking-[0.01em]">{label}</span>
      <span
        className={`h-2.5 w-2.5 rounded-full transition ${
          active ? "bg-lime-300 shadow-[0_0_16px_rgba(166,227,109,0.72)]" : "bg-white/15 group-hover:bg-white/30"
        }`}
      />
    </Link>
  );
}

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="w-full border-b border-white/10 bg-[#121214]/94 px-4 py-4 backdrop-blur-xl lg:h-screen lg:w-80 lg:border-b-0 lg:border-r lg:px-6 lg:py-6">
      <div className="enterprise-panel-soft mb-5 rounded-[1.6rem] p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-slate-300/72">XEN Multichain</p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-50">Burn operations</h1>
          </div>
          <span className="rounded-full border border-lime-300/35 bg-lime-300/12 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-lime-200">
            Online
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="metric-card rounded-2xl p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Active networks</p>
            <p className="mt-2 font-mono text-xl text-slate-50">{ACTIVE_CHAIN_KEYS.length}</p>
          </div>
        </div>
      </div>

      <nav className="space-y-6" aria-label="Main navigation">
        <section>
          <p className="mb-3 text-[11px] uppercase tracking-[0.24em] text-slate-400">Dashboard</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {overviewLinks.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} active={pathname === item.href} />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Networks</p>
            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Per-chain view</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {chainLinks.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} active={pathname === item.href} />
            ))}
          </div>
        </section>
      </nav>
    </aside>
  );
}
