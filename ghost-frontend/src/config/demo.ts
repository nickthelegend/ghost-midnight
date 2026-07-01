import type { RevealedBid, LoanInfo, StoredCommitment } from '@/sdk/types';

/**
 * Demo mode — renders the full UI with representative data so the app can be
 * shown, screenshotted, and walked through without a live wallet, localnet, or
 * proof server. Enabled by default; disable with VITE_DEMO=0 to run against a
 * real contract.
 */
export const DEMO = (import.meta.env.VITE_DEMO ?? '1') !== '0';

/** The hex owner-id we pretend to be in demo mode. */
export const DEMO_OWNER = '9a3f7c2e11b840d6';
export const DEMO_ADDRESS =
  'mn_shield-addr1q9x7f3c2e11b840d6c5a8e7f2b19d4a6c3e8f0b2d5a7c9e1f4b6d8a0c2e4f6';

export const DEMO_BALANCE = 24_500_000_000n; // 24,500.00 N

export const DEMO_LEND_BIDS: RevealedBid[] = [
  { slot: 0, owner: 'a1b2c3d4e5f60718', amount: 5_000_000_000n, rate: 520, revealed: true },
  { slot: 1, owner: 'c3d4e5f607182930', amount: 8_000_000_000n, rate: 600, revealed: true },
  { slot: 2, owner: 'e5f6071829304152', amount: 12_000_000_000n, rate: 640, revealed: true },
  { slot: 3, owner: '0718293041526374', amount: 6_500_000_000n, rate: 700, revealed: true },
];

export const DEMO_BORROW_BIDS: RevealedBid[] = [
  { slot: 0, owner: 'f10e2d3c4b5a6978', amount: 10_000_000_000n, rate: 780, revealed: true },
  { slot: 1, owner: 'd2c3b4a596877869', amount: 7_000_000_000n, rate: 720, revealed: true },
  { slot: 2, owner: 'b4a5968778695a4b', amount: 9_000_000_000n, rate: 660, revealed: true },
  { slot: 3, owner: '968778695a4b3c2d', amount: 4_000_000_000n, rate: 600, revealed: true },
];

export const DEMO_COMMITMENTS: StoredCommitment[] = [
  {
    hash: '9f3c7ae1b2408d6c5a9e7f21b0d4a63c8e0f2b5d7a9c1e4f6b8d0a2c4e6f8091',
    amount: 15_000_000_000n,
    rate: 610n,
    nonce: 'aa11bb22cc33dd44ee55ff66',
    owner: DEMO_OWNER,
    side: 'lend',
    epochNum: 7,
    timestamp: 1_744_200_000_000,
  },
  {
    hash: '4a71c9e0f38b2d6a5c7e9f10b3d24a68c0e1f2b4d6a8c0e2f4b6d8a0c2e4f609',
    amount: 6_000_000_000n,
    rate: 700n,
    nonce: '99aa88bb77cc66dd55ee44ff',
    owner: DEMO_OWNER,
    side: 'borrow',
    epochNum: 7,
    timestamp: 1_744_200_300_000,
  },
];

export const DEMO_LOANS: LoanInfo[] = [
  {
    id: 0,
    lender: DEMO_OWNER,
    borrower: 'c7e9f10b3d24a68c',
    principal: 12_000_000_000n,
    collateral: 18_000_000_000n,
    rate: 620,
    repaid: false,
  },
  {
    id: 1,
    lender: 'b840d6c5a8e7f2b1',
    borrower: DEMO_OWNER,
    principal: 8_000_000_000n,
    collateral: 12_000_000_000n,
    rate: 580,
    repaid: false,
  },
  {
    id: 2,
    lender: DEMO_OWNER,
    borrower: '30415263748596a7',
    principal: 5_000_000_000n,
    collateral: 7_500_000_000n,
    rate: 700,
    repaid: true,
  },
];

export const DEMO_LEDGER = {
  phase: 1, // REVEAL — mid-auction, so sealed + revealed states both show
  epochNum: 7,
  clearingRate: 640,
  matchedVolume: 26_000_000_000n,
  totalDeposits: 412_900_000_000n,
  totalLocked: 156_500_000_000n,
};
