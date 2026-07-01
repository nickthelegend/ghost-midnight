import { useCallback } from 'react';
import { useLoanStore } from '@/store/loanStore';
import { useWalletStore } from '@/store/walletStore';
import { DEMO } from '@/config/demo';
import toast from 'react-hot-toast';

export function useLoans() {
  const store = useLoanStore();
  const { sdk, isConnected } = useWalletStore();

  const repay = useCallback(
    async (loanId: number, totalDue: bigint) => {
      if (DEMO) {
        const loans = useLoanStore.getState().loans.map((l) =>
          l.id === loanId ? { ...l, repaid: true } : l,
        );
        useLoanStore.setState({ loans });
        toast.success('Loan repaid — collateral released');
        return;
      }
      if (!sdk || !isConnected) return;
      store.setRepaying(true);
      store.setError(null);

      try {
        const owner = await sdk.wallet.getOwnerBytes();
        await sdk.contract.repay(BigInt(loanId), owner, totalDue);
        toast.success('Loan repaid');

        // Refresh state
        const state = await sdk.refreshState();
        store.updateFromLedger(state);
      } catch (err: any) {
        store.setError(err.message);
        toast.error('Failed to repay loan');
      } finally {
        store.setRepaying(false);
      }
    },
    [sdk, isConnected],
  );

  return {
    loans: store.loans,
    isRepaying: store.isRepaying,
    error: store.error,
    repay,
  };
}
