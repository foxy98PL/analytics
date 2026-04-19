import type { ChainKey } from "./chains";
import { getChainConfig } from "./chains";

export function getAlchemyRpcUrl(chain: ChainKey): string {
  const cfg = getChainConfig(chain);

  const explicitPerChain = process.env[cfg.rpcEnvVar]?.trim();
  if (explicitPerChain) {
    return explicitPerChain;
  }

  const legacyExplicit = process.env.ALCHEMY_RPC_URL?.trim();
  if (legacyExplicit && chain === "eth") {
    return legacyExplicit;
  }

  if (!cfg.rpcUrlTemplate.includes("{key}")) {
    return cfg.rpcUrlTemplate;
  }

  const key = process.env.ALCHEMY_API_KEY?.trim();
  if (!key) {
    throw new Error(
      `Missing Alchemy RPC config for ${chain}. Set ${cfg.rpcEnvVar} or ALCHEMY_API_KEY.`
    );
  }

  return cfg.rpcUrlTemplate.replace("{key}", key);
}
