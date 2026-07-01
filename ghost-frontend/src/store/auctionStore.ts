import { create } from 'zustand';
import type { RevealedBid, StoredCommitment, LedgerState } from '@/sdk/types';

const COMMITMENTS_KEY = 'ghost_commitments';

interface AuctionStore {
  // Ledger state
  phase: number;
  epochNum: number;
  clearingRate: number;
  matchedVolume: bigint;
  totalDeposits: bigint;
  totalLocked: bigint;
  lendBids: RevealedBid[];
  borrowBids: RevealedBid[];

  // Local state
  myCommitments: StoredCommitment[];
  isLoading: boolean;
  isTxPending: boolean;
  error: string | null;

  // Actions
  updateFromLedger: (state: LedgerState) => void;
  addCommitment: (c: StoredCommitment) => void;
  removeCommitment: (hash: string) => void;
  loadCommitments: () => void;
  setLoading: (v: boolean) => void;
  setTxPending: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useAuctionStore = create<AuctionStore>((set, get) => ({
  phase: 0,
  epochNum: 0,
  clearingRate: 0,
  matchedVolume: 0n,
  totalDeposits: 0n,
  totalLocked: 0n,
  lendBids: [],
  borrowBids: [],

  myCommitments: [],
  isLoading: false,
  isTxPending: false,
  error: null,

  updateFromLedger: (state: LedgerState) => {
    set({
      phase: state.phase,
      epochNum: state.epochNum,
      clearingRate: state.clearingRate,
      matchedVolume: state.matchedVolume,
      totalDeposits: state.totalDeposits,
      totalLocked: state.totalLocked,
      lendBids: state.lendBids,
      borrowBids: state.borrowBids,
    });
  },

  addCommitment: (c: StoredCommitment) => {
    const existing = get().myCommitments;
    const updated = [...existing, c];
    set({ myCommitments: updated });
    persistCommitments(updated);
  },

  removeCommitment: (hash: string) => {
    const updated = get().myCommitments.filter((c) => c.hash !== hash);
    set({ myCommitments: updated });
    persistCommitments(updated);
  },

  loadCommitments: () => {
    try {
      const raw = localStorage.getItem(COMMITMENTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw).map((c: any) => ({
          ...c,
          amount: BigInt(c.amount),
          rate: BigInt(c.rate),
        }));
        set({ myCommitments: parsed });
      }
    } catch {
      // ignore
    }
  },

  setLoading: (v) => set({ isLoading: v }),
  setTxPending: (v) => set({ isTxPending: v }),
  setError: (e) => set({ error: e }),
}));

function persistCommitments(commitments: StoredCommitment[]) {
  try {
    const serializable = commitments.map((c) => ({
      ...c,
      amount: c.amount.toString(),
      rate: c.rate.toString(),
    }));
    localStorage.setItem(COMMITMENTS_KEY, JSON.stringify(serializable));
  } catch {
    // ignore
  }
}
