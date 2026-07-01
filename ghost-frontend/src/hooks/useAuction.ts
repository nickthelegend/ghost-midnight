import { useCallback, useEffect } from 'react';
import { useAuctionStore } from '@/store/auctionStore';
import { useLoanStore } from '@/store/loanStore';
import { useWalletStore } from '@/store/walletStore';
import { computeCommitment, generateNonce, toHex } from '@/utils/commitment';
import { DEMO, DEMO_OWNER } from '@/config/demo';
import type { RevealedBid, StoredCommitment } from '@/sdk/types';
import toast from 'react-hot-toast';

export function useAuction() {
  const auction = useAuctionStore();
  const loanStore = useLoanStore();
  const { sdk, isConnected, owner: myOwner } = useWalletStore();

  // Load commitments from localStorage on mount (real mode only)
  useEffect(() => {
    if (!DEMO) auction.loadCommitments();
  }, []);

  // Refresh state from indexer
  const refreshState = useCallback(async () => {
    if (DEMO || !sdk) return;
    auction.setLoading(true);
    try {
      const state = await sdk.refreshState();
      auction.updateFromLedger(state);
      loanStore.updateFromLedger(state);
    } catch (err: any) {
      console.error('Failed to refresh state:', err);
    } finally {
      auction.setLoading(false);
    }
  }, [sdk]);

  // Auto-refresh on mount and when connected (real mode only)
  useEffect(() => {
    if (DEMO) return;
    refreshState();
    const interval = setInterval(refreshState, 15000);
    return () => clearInterval(interval);
  }, [refreshState, isConnected]);

  const submitLend = useCallback(
    async (amount: bigint, rate: bigint) => {
      if (DEMO) return demoSubmit('lend', amount, rate, myOwner);
      if (!sdk || !isConnected) return;
      auction.setTxPending(true);
      auction.setError(null);

      try {
        const owner = await sdk.wallet.getOwnerBytes();
        const nonce = generateNonce();
        const commitment = await computeCommitment(amount, rate, nonce, owner);
        const hashHex = toHex(commitment);

        await sdk.contract.submitLend(commitment);

        auction.addCommitment({
          hash: hashHex,
          amount,
          rate,
          nonce: toHex(nonce),
          owner: toHex(owner),
          side: 'lend',
          epochNum: auction.epochNum,
          timestamp: Date.now(),
        });

        toast.success('Lend bid sealed');
        await refreshState();
      } catch (err: any) {
        auction.setError(err.message);
        toast.error('Failed to submit lend bid');
      } finally {
        auction.setTxPending(false);
      }
    },
    [sdk, isConnected, auction.epochNum, myOwner],
  );

  const submitBorrow = useCallback(
    async (amount: bigint, rate: bigint) => {
      if (DEMO) return demoSubmit('borrow', amount, rate, myOwner);
      if (!sdk || !isConnected) return;
      auction.setTxPending(true);
      auction.setError(null);

      try {
        const owner = await sdk.wallet.getOwnerBytes();
        const nonce = generateNonce();
        const commitment = await computeCommitment(amount, rate, nonce, owner);
        const hashHex = toHex(commitment);

        await sdk.contract.submitBorrow(commitment);

        auction.addCommitment({
          hash: hashHex,
          amount,
          rate,
          nonce: toHex(nonce),
          owner: toHex(owner),
          side: 'borrow',
          epochNum: auction.epochNum,
          timestamp: Date.now(),
        });

        toast.success('Borrow bid sealed');
        await refreshState();
      } catch (err: any) {
        auction.setError(err.message);
        toast.error('Failed to submit borrow bid');
      } finally {
        auction.setTxPending(false);
      }
    },
    [sdk, isConnected, auction.epochNum, myOwner],
  );

  const revealLend = useCallback(
    async (commitment: StoredCommitment) => {
      if (DEMO) return demoReveal(commitment);
      if (!sdk || !isConnected) return;
      auction.setTxPending(true);

      try {
        const { fromHex } = await import('@/utils/commitment');
        await sdk.contract.revealLend(
          fromHex(commitment.hash),
          fromHex(commitment.owner),
          commitment.amount,
          commitment.rate,
        );

        auction.removeCommitment(commitment.hash);
        toast.success('Lend bid revealed');
        await refreshState();
      } catch (err: any) {
        toast.error('Failed to reveal lend bid');
      } finally {
        auction.setTxPending(false);
      }
    },
    [sdk, isConnected],
  );

  const revealBorrow = useCallback(
    async (commitment: StoredCommitment, collateral: bigint) => {
      if (DEMO) return demoReveal(commitment);
      if (!sdk || !isConnected) return;
      auction.setTxPending(true);

      try {
        const { fromHex } = await import('@/utils/commitment');
        await sdk.contract.revealBorrow(
          fromHex(commitment.hash),
          fromHex(commitment.owner),
          commitment.amount,
          commitment.rate,
          collateral,
        );

        auction.removeCommitment(commitment.hash);
        toast.success('Borrow bid revealed');
        await refreshState();
      } catch (err: any) {
        toast.error('Failed to reveal borrow bid');
      } finally {
        auction.setTxPending(false);
      }
    },
    [sdk, isConnected],
  );

  return {
    ...auction,
    refreshState,
    submitLend,
    submitBorrow,
    revealLend,
    revealBorrow,
  };
}

// ── Demo-mode handlers: mutate the store in-memory so the flow is walkable ──

function demoSubmit(side: 'lend' | 'borrow', amount: bigint, rate: bigint, owner: string | null) {
  const store = useAuctionStore.getState();
  const hash = toHex(generateNonce()) + toHex(generateNonce());
  const commitment: StoredCommitment = {
    hash,
    amount,
    rate,
    nonce: toHex(generateNonce()).slice(0, 24),
    owner: owner ?? DEMO_OWNER,
    side,
    epochNum: store.epochNum,
    timestamp: Date.now(),
  };
  useAuctionStore.setState({ myCommitments: [...store.myCommitments, commitment] });
  toast.success(`${side === 'lend' ? 'Lend' : 'Borrow'} bid sealed`);
}

function demoReveal(commitment: StoredCommitment) {
  const store = useAuctionStore.getState();
  const list = commitment.side === 'lend' ? store.lendBids : store.borrowBids;
  const bid: RevealedBid = {
    slot: list.length,
    owner: commitment.owner,
    amount: commitment.amount,
    rate: Number(commitment.rate),
    revealed: true,
  };
  useAuctionStore.setState({
    myCommitments: store.myCommitments.filter((c) => c.hash !== commitment.hash),
    ...(commitment.side === 'lend'
      ? { lendBids: [...store.lendBids, bid] }
      : { borrowBids: [...store.borrowBids, bid] }),
  });
  toast.success(`${commitment.side === 'lend' ? 'Lend' : 'Borrow'} bid revealed`);
}
