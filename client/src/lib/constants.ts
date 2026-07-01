export const SERVER =
  process.env.NEXT_PUBLIC_GHOST_API_URL || "http://localhost:8080";
export const EXTERNAL_API = "https://convergence2026-token-api.cldev.cloud";

// Pool address fetched from server at runtime
export let POOL_ADDRESS = "";

export async function fetchPoolAddress() {
  if (POOL_ADDRESS) return POOL_ADDRESS;
  const res = await fetch(`${SERVER}/health`);
  const data = await res.json();
  POOL_ADDRESS = data.poolAddress;
  return POOL_ADDRESS;
}

// Token contract addresses (placeholder identifiers used for pool routing)
export const gUSD = "0x6755f2d8c9e0a4b1f37d2c5a8e91b4067f3c2e11";
export const gETH = "0x40d6c5a8e7f2b19d4a6c3e8f0b2d5a7c9e1f4b6d";

export type Coin = { symbol: string; name: string; address: string };

export const COINS: Coin[] = [
  { symbol: "gUSD", name: "Ghost USD", address: gUSD },
  { symbol: "gETH", name: "Ghost ETH", address: gETH },
];
