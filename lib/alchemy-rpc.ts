export function getAlchemyRpcUrl(): string {
  const explicit = process.env.ALCHEMY_RPC_URL?.trim();
  if (explicit) {
    return explicit;
  }
  const key = process.env.ALCHEMY_API_KEY?.trim();
  if (!key) {
    throw new Error("ALCHEMY_API_KEY or ALCHEMY_RPC_URL is not set");
  }
  return `https://eth-mainnet.g.alchemy.com/v2/${key}`;
}
