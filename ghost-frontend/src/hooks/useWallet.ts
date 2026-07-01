import { useCallback, useEffect } from 'react';
import { useWalletStore } from '@/store/walletStore';
import toast from 'react-hot-toast';

export function useWallet() {
  const store = useWalletStore();

  useEffect(() => {
    store.init();
  }, []);

  const connect = useCallback(async () => {
    try {
      await store.connect();
      toast.success('Wallet connected');
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect wallet');
    }
  }, [store]);

  const disconnect = useCallback(() => {
    store.disconnect();
    toast.success('Wallet disconnected');
  }, [store]);

  return {
    isConnected: store.isConnected,
    isConnecting: store.isConnecting,
    address: store.address,
    balance: store.balance,
    error: store.error,
    connect,
    disconnect,
    refreshBalance: store.refreshBalance,
  };
}
