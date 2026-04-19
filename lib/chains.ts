import chainConfig from "../chain-config.json";

export const CHAIN_KEYS = ["eth", "optimism", "polygon", "base", "pulse"] as const;

export type ChainKey = (typeof CHAIN_KEYS)[number];

/** Subset of CHAIN_KEYS that are enabled in chain-config.json */
export const ACTIVE_CHAIN_KEYS: ChainKey[] = CHAIN_KEYS.filter(
  (k) => (chainConfig.enabled as Record<string, boolean | undefined>)[k] !== false
);

export function isChainEnabled(chain: ChainKey): boolean {
  return (chainConfig.enabled as Record<string, boolean | undefined>)[chain] !== false;
}

export type ChainConfig = {
  key: ChainKey;
  label: string;
  alchemyNetwork: string;
  historyProvider: "alchemy" | "moralis";
  moralisChain?: string;
  moralisPairAddress?: string;
  tokenAddress: string;
  explorerTxBaseUrl: string;
  rpcEnvVar: string;
  rpcUrlTemplate: string;
};

const DEFAULT_MORALIS_PAIR_OPTIMISM = "0xFDf64C32F4A03923547e6061911483b793e8d7E2";
const DEFAULT_MORALIS_PAIR_BASE = "0xe28f5637d009732259fcbb5cea23488a411a5ead";
const DEFAULT_MORALIS_PAIR_PULSE = "0x2eB5B98079477819c854c22E4A6f20B25199E7C0";

export const CHAIN_CONFIGS: Record<ChainKey, ChainConfig> = {
  eth: {
    key: "eth",
    label: "Ethereum",
    alchemyNetwork: "eth-mainnet",
    historyProvider: "alchemy",
    tokenAddress: "0x06450dEe7FD2Fb8E39061434BAbCFC05599a6Fb8",
    explorerTxBaseUrl: "https://etherscan.io/tx/",
    rpcEnvVar: "ALCHEMY_RPC_URL_ETH",
    rpcUrlTemplate: "https://eth-mainnet.g.alchemy.com/v2/{key}",
  },
  optimism: {
    key: "optimism",
    label: "Optimism",
    alchemyNetwork: "opt-mainnet",
    historyProvider: "moralis",
    moralisChain: "optimism",
    moralisPairAddress: DEFAULT_MORALIS_PAIR_OPTIMISM,
    tokenAddress: "0xeB585163DEbB1E637c6D617de3bEF99347cd75c8",
    explorerTxBaseUrl: "https://optimistic.etherscan.io/tx/",
    rpcEnvVar: "ALCHEMY_RPC_URL_OPTIMISM",
    rpcUrlTemplate: "https://opt-mainnet.g.alchemy.com/v2/{key}",
  },
  polygon: {
    key: "polygon",
    label: "Polygon",
    alchemyNetwork: "polygon-mainnet",
    historyProvider: "alchemy",
    tokenAddress: "0x2AB0e9e4eE70FFf1fB9D67031E44F6410170d00e",
    explorerTxBaseUrl: "https://polygonscan.com/tx/",
    rpcEnvVar: "ALCHEMY_RPC_URL_POLYGON",
    rpcUrlTemplate: "https://polygon-mainnet.g.alchemy.com/v2/{key}",
  },
  base: {
    key: "base",
    label: "Base",
    alchemyNetwork: "base-mainnet",
    historyProvider: "moralis",
    moralisChain: "base",
    moralisPairAddress: DEFAULT_MORALIS_PAIR_BASE,
    tokenAddress: "0xffcbF84650cE02DaFE96926B37a0ac5E34932fa5",
    explorerTxBaseUrl: "https://basescan.org/tx/",
    rpcEnvVar: "ALCHEMY_RPC_URL_BASE",
    rpcUrlTemplate: "https://base-mainnet.g.alchemy.com/v2/{key}",
  },
  pulse: {
    key: "pulse",
    label: "Pulse",
    alchemyNetwork: "pulse-mainnet",
    historyProvider: "moralis",
    moralisChain: "pulse",
    moralisPairAddress: DEFAULT_MORALIS_PAIR_PULSE,
    tokenAddress: "0xeB585163DEbB1E637c6D617de3bEF99347cd75c8",
    explorerTxBaseUrl: "https://scan.pulsechain.com/tx/",
    rpcEnvVar: "PULSE_RPC_URL",
    rpcUrlTemplate: "https://rpc.pulsechain.com",
  },
};

export function isChainKey(value: string): value is ChainKey {
  return value in CHAIN_CONFIGS;
}

export function getChainConfig(chain: ChainKey): ChainConfig {
  return CHAIN_CONFIGS[chain];
}

export function listChains(): ChainConfig[] {
  return CHAIN_KEYS.map((key) => CHAIN_CONFIGS[key]);
}

export function txExplorerUrl(chain: ChainKey, hash: string): string {
  return `${CHAIN_CONFIGS[chain].explorerTxBaseUrl}${hash}`;
}
