/**
 * Browser-side commitment hash using Web Crypto API.
 * Mirrors ghost-contract/src/witnesses.ts computeCommitment but uses
 * crypto.subtle.digest instead of Node's createHash.
 *
 * Layout: amount (8 bytes BE) || rate (4 bytes BE) || nonce (32 bytes) || owner (32 bytes) → SHA-256
 */
export async function computeCommitment(
  amount: bigint,
  rate: bigint,
  nonce: Uint8Array,
  owner: Uint8Array,
): Promise<Uint8Array> {
  const buf = new ArrayBuffer(8 + 4 + 32 + 32);
  const view = new DataView(buf);

  // amount: 8 bytes big-endian
  view.setBigUint64(0, amount, false);

  // rate: 4 bytes big-endian
  view.setUint32(8, Number(rate), false);

  // nonce: 32 bytes
  const bytes = new Uint8Array(buf);
  bytes.set(nonce.slice(0, 32), 12);

  // owner: 32 bytes
  bytes.set(owner.slice(0, 32), 44);

  const hash = await crypto.subtle.digest('SHA-256', buf);
  return new Uint8Array(hash);
}

/** Generate a random 32-byte nonce */
export function generateNonce(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/** Convert Uint8Array to hex string */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Convert hex string to Uint8Array */
export function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}
