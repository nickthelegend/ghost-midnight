import { create } from 'zustand';
import type { LoanInfo, LedgerState } from '@/sdk/types';

interface LoanStore {
  loans: LoanInfo[];
  isRepaying: boolean;
  error: string | null;

  updateFromLedger: (state: LedgerState) => void;
  setRepaying: (v: boolean) => void;
  setError: (e: string | null) => void;
}

export const useLoanStore = create<LoanStore>((set) => ({
  loans: [],
  isRepaying: false,
  error: null,

  updateFromLedger: (state: LedgerState) => {
    set({ loans: state.loans });
  },

  setRepaying: (v) => set({ isRepaying: v }),
  setError: (e) => set({ error: e }),
}));
