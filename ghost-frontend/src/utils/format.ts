/** Format a bigint token amount (6 decimals) for display */
export function formatAmount(value: bigint, decimals = 6): string {
  const n = Number(value) / 10 ** decimals;
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Parse a decimal string to bigint with given decimals */
export function parseAmount(value: string, decimals = 6): bigint {
  const parts = value.split('.');
  const whole = parts[0] || '0';
  const frac = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole) * BigInt(10 ** decimals) + BigInt(frac);
}

/** Truncate address: 0x1234...abcd */
export function truncateAddress(addr: string, chars = 6): string {
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

/** Format basis points as percentage: 300 → "3.00%" */
export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}
