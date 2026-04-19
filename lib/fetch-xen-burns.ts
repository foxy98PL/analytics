import { getAlchemyRpcUrl } from "./alchemy-rpc";
import type { AssetTransfer, BurnTransferPublic, DayBurnSummary } from "./burn-types";
import { getChainConfig, type ChainKey } from "./chains";
import { refreshTokenHistoryToToday } from "./sync-token-history";

const ZERO = "0x0000000000000000000000000000000000000000";

function utcDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function buildPriceByDayForChain(chain: ChainKey): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const hist = await refreshTokenHistoryToToday(chain);
  if (!hist?.data?.length) return map;
  for (const row of hist.data) {
    const key = row.timestamp.slice(0, 10);
    map.set(key, Number(row.value));
  }
  return map;
}

async function fetchAssetTransferPage(
  chain: ChainKey,
  fromAddress: string,
  pageKey?: string
): Promise<{ transfers: AssetTransfer[]; pageKey?: string }> {
  const url = getAlchemyRpcUrl(chain);
  const baseParams: Record<string, unknown> = {
    fromBlock: "0x0",
    fromAddress,
    toAddress: ZERO,
    excludeZeroValue: true,
    withMetadata: true,
    category: ["erc20"],
  };
  if (pageKey) {
    baseParams.pageKey = pageKey;
  }

  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "alchemy_getAssetTransfers",
    params: [baseParams],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`RPC ${res.status}: ${t}`);
  }

  const json = (await res.json()) as {
    error?: { message?: string };
    result?: { transfers?: AssetTransfer[]; pageKey?: string };
  };

  if (json.error) {
    throw new Error(json.error.message ?? "Alchemy RPC error");
  }

  const result = json.result ?? {};
  return {
    transfers: result.transfers ?? [],
    pageKey: result.pageKey,
  };
}

function isXenBurnToNull(t: AssetTransfer, xenAddressLower: string): boolean {
  if (t.to?.toLowerCase() !== ZERO) return false;
  if (t.category !== "erc20") return false;
  const addr = t.rawContract?.address?.toLowerCase();
  if (!addr || addr !== xenAddressLower) return false;
  return typeof t.value === "number" && t.value > 0;
}

function priceForDay(priceByDay: Map<string, number>, dayKey: string): number {
  const direct = priceByDay.get(dayKey);
  if (direct != null && Number.isFinite(direct)) return direct;
  const keys = [...priceByDay.keys()].filter((k) => k <= dayKey).sort();
  const prev = keys[keys.length - 1];
  if (prev) {
    const p = priceByDay.get(prev);
    if (p != null && Number.isFinite(p)) return p;
  }
  return 0;
}

export async function fetchXenBurnsForWallet(chain: ChainKey, fromAddress: string): Promise<{
  transfers: BurnTransferPublic[];
  byDay: DayBurnSummary[];
  totals: { xen: number; usd: number };
}> {
  const normalized = fromAddress.trim();
  const cfg = getChainConfig(chain);
  const xenAddressLower = cfg.tokenAddress.toLowerCase();
  const priceByDay = await buildPriceByDayForChain(chain);

  const all: AssetTransfer[] = [];
  let pageKey: string | undefined;
  do {
    const page = await fetchAssetTransferPage(chain, normalized, pageKey);
    all.push(...page.transfers);
    pageKey = page.pageKey;
  } while (pageKey);

  const xenBurns = all.filter((t) => isXenBurnToNull(t, xenAddressLower));

  const transfers: BurnTransferPublic[] = [];
  const dayMap = new Map<
    string,
    { totalXen: number; txs: DayBurnSummary["txs"] }
  >();

  let totalXen = 0;
  let totalUsd = 0;

  for (const t of xenBurns) {
    const ts = t.metadata?.blockTimestamp;
    if (!ts) continue;
    const dayKey = utcDayKey(ts);
    const xen = t.value;
    const px = priceForDay(priceByDay, dayKey);
    const usd = xen * px;

    totalXen += xen;
    totalUsd += usd;

    transfers.push({
      chain,
      hash: t.hash,
      blockNum: t.blockNum,
      timestamp: ts,
      dayKey,
      xenAmount: xen,
      usdValue: usd,
    });

    let entry = dayMap.get(dayKey);
    if (!entry) {
      entry = { totalXen: 0, txs: [] };
      dayMap.set(dayKey, entry);
    }
    entry.totalXen += xen;
    entry.txs.push({
      hash: t.hash,
      chain,
      xenAmount: xen,
      usdValue: usd,
      timestamp: ts,
    });
  }

  transfers.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const byDay: DayBurnSummary[] = [...dayMap.entries()]
    .map(([dayKey, v]) => ({
      dayKey,
      totalXen: v.totalXen,
      txCount: v.txs.length,
      txs: v.txs.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    }))
    .sort((a, b) => b.dayKey.localeCompare(a.dayKey));

  return {
    transfers,
    byDay,
    totals: { xen: totalXen, usd: totalUsd },
  };
}
