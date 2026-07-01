import { create } from 'zustand';
import { GhostSDK, getGhostSDK } from '@/sdk/GhostSDK';

interface WalletStore {
  sdk: GhostSDK | null;
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  owner: string | null;
  balance: bigint;
  error: string | null;

  init: () => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  clearError: () => void;
}

export const useWalletStore = create<WalletStore>((set, get) => ({
  sdk: null,
  isConnected: false,
  isConnecting: false,
  address: null,
  owner: null,
  balance: 0n,
  error: null,

  init: () => {
    const sdk = getGhostSDK();
    set({ sdk });
  },

  connect: async () => {
    const sdk = get().sdk || getGhostSDK();
    set({ isConnecting: true, error: null, sdk });

    try {
      const { address, balance } = await sdk.connect();
      let owner: string | null = null;
      try {
        const { toHex } = await import('@/utils/commitment');
        owner = toHex(await sdk.wallet.getOwnerBytes());
      } catch {
        /* owner is optional; loan role detection degrades gracefully */
      }
      set({ isConnected: true, isConnecting: false, address, owner, balance });
    } catch (err: any) {
      set({ isConnecting: false, error: err.message || 'Failed to connect' });
      throw err;
    }
  },

  disconnect: () => {
    const sdk = get().sdk;
    sdk?.disconnect();
    set({ isConnected: false, address: null, owner: null, balance: 0n });
  },

  refreshBalance: async () => {
    const sdk = get().sdk;
    if (!sdk?.wallet.isConnected()) return;
    try {
      const balance = await sdk.wallet.getBalance();
      set({ balance });
    } catch (err) {
      console.error('Failed to refresh balance:', err);
    }
  },

  clearError: () => set({ error: null }),
}));
