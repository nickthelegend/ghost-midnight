import type { InitialAPI, ConnectedAPI, NetworkConfig } from './types';

export class WalletConnector {
  private api: ConnectedAPI | null = null;
  private config: NetworkConfig;
  private listeners: Array<(connected: boolean) => void> = [];

  constructor(config: NetworkConfig) {
    this.config = config;
  }

  private findProvider(): InitialAPI | null {
    if (typeof window === 'undefined') return null;

    // Direct window properties
    const directProviders: Array<InitialAPI | undefined> = [
      window.lace,
      window.midnightLace,
    ];
    for (const p of directProviders) {
      if (p && typeof p.connect === 'function') return p;
    }

    // window.midnight namespace
    const midnight = window.midnight;
    if (!midnight) return null;

    const knownKeys = ['lace', 'mnLace', 'io.lace.midnight', 'midnightLace', 'midnight-lace'];
    for (const key of knownKeys) {
      const p = midnight[key];
      if (p && typeof p.connect === 'function') return p;
    }

    // Fallback: any provider with 'lace' in name
    for (const [, provider] of Object.entries(midnight)) {
      if (provider?.name?.toLowerCase().includes('lace')) return provider;
    }

    // Last resort: first available
    const all = Object.values(midnight).filter(Boolean);
    return all.length > 0 ? all[0]! : null;
  }

  private async waitForProvider(timeoutMs = 10000): Promise<InitialAPI | null> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const p = this.findProvider();
      if (p) return p;
      await new Promise((r) => setTimeout(r, 200));
    }
    return this.findProvider();
  }

  async connect(): Promise<{ address: string; balance: bigint }> {
    const provider = await this.waitForProvider();
    if (!provider) {
      throw new Error(
        'Lace wallet not found. Install the Lace browser extension and enable Midnight support.',
      );
    }

    this.api = await provider.connect(this.config.network);

    const addrs = await this.api.getShieldedAddresses();
    const balance = await this.getBalance();

    this.listeners.forEach((cb) => cb(true));
    return { address: addrs.shieldedAddress, balance };
  }

  disconnect() {
    this.api = null;
    this.listeners.forEach((cb) => cb(false));
  }

  getAPI(): ConnectedAPI {
    if (!this.api) throw new Error('Wallet not connected');
    return this.api;
  }

  isConnected(): boolean {
    return this.api !== null;
  }

  async getBalance(): Promise<bigint> {
    const api = this.getAPI();
    const dust = await api.getDustBalance();
    return dust.balance;
  }

  async getIdentity(): Promise<{ address: string; coinPublicKey: string; encryptionPublicKey: string }> {
    const api = this.getAPI();
    const addrs = await api.getShieldedAddresses();
    return {
      address: addrs.shieldedAddress,
      coinPublicKey: addrs.shieldedCoinPublicKey,
      encryptionPublicKey: addrs.shieldedEncryptionPublicKey,
    };
  }

  async getOwnerBytes(): Promise<Uint8Array> {
    const { coinPublicKey } = await this.getIdentity();
    // Decode bech32m coin public key to raw 32 bytes
    // For now return the UTF-8 bytes truncated/padded to 32
    const encoder = new TextEncoder();
    const raw = encoder.encode(coinPublicKey);
    const result = new Uint8Array(32);
    result.set(raw.slice(0, 32));
    return result;
  }

  onConnectionChange(cb: (connected: boolean) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }
}
