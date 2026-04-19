import { promises as fs } from "fs";
import path from "path";
import type { TokenHistoryPayload } from "./token-types";
import type { ChainKey } from "./chains";

function getDefaultStorePath(chain: ChainKey): string {
  const suffix = chain === "eth" ? "token-history.json" : `token-history-${chain}.json`;

  if (process.env.TOKEN_HISTORY_STORE_PATH?.trim()) {
    const base = process.env.TOKEN_HISTORY_STORE_PATH.trim();
    if (chain === "eth") return base;
    const ext = path.extname(base);
    const stem = ext ? base.slice(0, -ext.length) : base;
    return `${stem}-${chain}${ext || ".json"}`;
  }

  if (process.env.VERCEL === "1") {
    return path.join("/tmp", suffix);
  }

  return path.join(process.cwd(), "data", suffix);
}

export async function readTokenHistory(chain: ChainKey = "eth"): Promise<TokenHistoryPayload | null> {
  const file = getDefaultStorePath(chain);
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as TokenHistoryPayload;
  } catch {
    return null;
  }
}

export async function writeTokenHistory(
  payload: TokenHistoryPayload,
  chain: ChainKey = "eth"
): Promise<void> {
  const file = getDefaultStorePath(chain);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(payload, null, 2), "utf8");
}

export function getStorePath(chain: ChainKey = "eth"): string {
  return getDefaultStorePath(chain);
}

/** Merge rows by timestamp; later entries win on duplicate keys. */
export function mergeTokenHistory(
  base: TokenHistoryPayload,
  incoming: TokenHistoryPayload
): TokenHistoryPayload {
  const byTs = new Map<string, TokenHistoryPayload["data"][number]>();
  for (const row of base.data) {
    byTs.set(row.timestamp, row);
  }
  for (const row of incoming.data) {
    byTs.set(row.timestamp, row);
  }
  const data = [...byTs.values()].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  return {
    network: incoming.network || base.network,
    address: incoming.address || base.address,
    currency: incoming.currency || base.currency,
    data,
  };
}
