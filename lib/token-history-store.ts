import { promises as fs } from "fs";
import path from "path";
import type { TokenHistoryPayload } from "./token-types";

function getDefaultStorePath(): string {
  if (process.env.TOKEN_HISTORY_STORE_PATH?.trim()) {
    return process.env.TOKEN_HISTORY_STORE_PATH.trim();
  }

  if (process.env.VERCEL === "1") {
    return path.join("/tmp", "token-history.json");
  }

  return path.join(process.cwd(), "data", "token-history.json");
}

const FILE = getDefaultStorePath();

export async function readTokenHistory(): Promise<TokenHistoryPayload | null> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as TokenHistoryPayload;
  } catch {
    return null;
  }
}

export async function writeTokenHistory(payload: TokenHistoryPayload): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(payload, null, 2), "utf8");
}

export function getStorePath(): string {
  return FILE;
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
