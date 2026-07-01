import { useEffect } from 'react';
import { useWalletStore } from '@/store/walletStore';
import { useAuctionStore } from '@/store/auctionStore';
import { useLoanStore } from '@/store/loanStore';
import {
  DEMO,
  DEMO_ADDRESS,
  DEMO_OWNER,
  DEMO_BALANCE,
  DEMO_LEDGER,
  DEMO_LEND_BIDS,
  DEMO_BORROW_BIDS,
  DEMO_COMMITMENTS,
  DEMO_LOANS,
} from '@/config/demo';

let seeded = false;

/**
 * Seeds the stores with representative data when demo mode is on, so every
 * screen renders fully without a wallet / localnet / proof server. Runs once.
 */
export function useDemoBoot() {
  useEffect(() => {
    if (!DEMO || seeded) return;
    seeded = true;

    useWalletStore.setState({
      isConnected: true,
      isConnecting: false,
      address: DEMO_ADDRESS,
      owner: DEMO_OWNER,
      balance: DEMO_BALANCE,
      error: null,
    });

    useAuctionStore.setState({
      ...DEMO_LEDGER,
      lendBids: DEMO_LEND_BIDS,
      borrowBids: DEMO_BORROW_BIDS,
      myCommitments: DEMO_COMMITMENTS,
      isLoading: false,
    });

    useLoanStore.setState({ loans: DEMO_LOANS });
  }, []);
}
