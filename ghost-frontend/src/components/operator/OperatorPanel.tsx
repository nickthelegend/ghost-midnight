import { useState } from 'react';
import { useWalletStore } from '@/store/walletStore';
import { useAuctionStore } from '@/store/auctionStore';
import { useLoanStore } from '@/store/loanStore';
import { PHASE_NAMES } from '@/sdk/types';
import { fromHex } from '@/utils/commitment';
import { formatBps, formatAmount } from '@/utils/format';
import { DEMO, DEMO_OWNER } from '@/config/demo';
import { Kicker } from '@/components/ui/kit';
import { ForwardIcon, BoltIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const PHASE_BLURB = [
  'Bids are being sealed as commitments.',
  'Owners are revealing sealed bids to the book.',
  'Match revealed bids and settle at one clearing rate.',
  'Loans are live; borrowers repay to release collateral.',
];

export default function OperatorPanel() {
  const { sdk, isConnected } = useWalletStore();
  const { phase, epochNum, lendBids, borrowBids } = useAuctionStore();

  const [operatorKey, setOperatorKey] = useState(DEMO ? DEMO_OWNER : '');
  const [isPending, setIsPending] = useState(false);
  const [settleRate, setSettleRate] = useState('');
  const [settleLendSlot, setSettleLendSlot] = useState('');
  const [settleBorrowSlot, setSettleBorrowSlot] = useState('');
  const [settleAmount, setSettleAmount] = useState('');

  const nextPhase = PHASE_NAMES[(phase + 1) % 4];
  const canSettle = DEMO || phase === 2;

  const advance = async () => {
    if (DEMO) {
      const a = useAuctionStore.getState();
      if (a.phase === 3) {
        useAuctionStore.setState({
          phase: 0,
          epochNum: a.epochNum + 1,
          clearingRate: 0,
          matchedVolume: 0n,
          lendBids: [],
          borrowBids: [],
        });
      } else {
        useAuctionStore.setState({ phase: a.phase + 1 });
      }
      toast.success(`Advanced to ${PHASE_NAMES[(a.phase + 1) % 4]}`);
      return;
    }
    if (!sdk || !operatorKey) return;
    setIsPending(true);
    try {
      await sdk.contract.advancePhase(padTo32(operatorKey));
      toast.success(`Advanced to ${nextPhase}`);
      const state = await sdk.refreshState();
      useAuctionStore.getState().updateFromLedger(state);
    } catch (err: any) {
      toast.error(err.message || 'Failed to advance phase');
    } finally {
      setIsPending(false);
    }
  };

  const settle = async () => {
    if (!settleRate || !settleLendSlot || !settleBorrowSlot || !settleAmount) return;

    if (DEMO) {
      const a = useAuctionStore.getState();
      const lend = a.lendBids.find((b) => b.slot === Number(settleLendSlot));
      const borrow = a.borrowBids.find((b) => b.slot === Number(settleBorrowSlot));
      if (!lend || !borrow) {
        toast.error('Pick a valid lend and borrow slot');
        return;
      }
      const principal = BigInt(settleAmount);
      const collateral = (principal * 150n) / 100n;
      const loans = useLoanStore.getState().loans;
      const id = loans.reduce((m, l) => Math.max(m, l.id), -1) + 1;
      useLoanStore.setState({
        loans: [
          ...loans,
          {
            id,
            lender: lend.owner,
            borrower: borrow.owner,
            principal,
            collateral,
            rate: Number(settleRate),
            repaid: false,
          },
        ],
      });
      useAuctionStore.setState({
        clearingRate: Number(settleRate),
        matchedVolume: a.matchedVolume + principal,
        totalLocked: a.totalLocked + principal + collateral,
      });
      toast.success(`Match settled → loan #${String(id).padStart(2, '0')}`);
      setSettleAmount('');
      return;
    }

    if (!sdk) return;
    setIsPending(true);
    try {
      await sdk.contract.settle(
        BigInt(settleRate),
        BigInt(settleLendSlot),
        BigInt(settleBorrowSlot),
        BigInt(settleAmount),
      );
      toast.success('Match settled');
      const state = await sdk.refreshState();
      useAuctionStore.getState().updateFromLedger(state);
    } catch (err: any) {
      toast.error(err.message || 'Failed to settle');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ── Epoch control ── */}
      <div className="panel grain-overlay flex flex-col overflow-hidden">
        <div className="border-b border-line px-6 py-4">
          <Kicker>Console · epoch {String(epochNum).padStart(2, '0')}</Kicker>
          <h3 className="mt-1.5 font-display text-xl tracking-tightest text-bone">Epoch control</h3>
        </div>
        <div className="flex flex-1 flex-col gap-5 p-6">
          <div className="panel-inset flex items-center justify-between p-4">
            <div>
              <p className="kicker">Current phase</p>
              <p className="mt-1.5 font-mono text-lg font-semibold text-seal">{PHASE_NAMES[phase]}</p>
            </div>
            <ForwardIcon className="h-5 w-5 text-bone-faint" />
            <div className="text-right">
              <p className="kicker">Next</p>
              <p className="mt-1.5 font-mono text-lg font-semibold text-bone-soft">{nextPhase}</p>
            </div>
          </div>
          <p className="text-[13px] leading-relaxed text-bone-soft">{PHASE_BLURB[phase]}</p>

          <div>
            <label className="field-label">Operator key · hex 32-byte</label>
            <input
              value={operatorKey}
              onChange={(e) => setOperatorKey(e.target.value)}
              placeholder="Registered operator key"
              className="field"
            />
          </div>

          <button
            onClick={advance}
            disabled={(!isConnected && !DEMO) || (!operatorKey && !DEMO) || isPending}
            className="btn-seal mt-auto w-full"
          >
            <ForwardIcon className="h-4 w-4" />
            Advance to {nextPhase}
          </button>
        </div>
      </div>

      {/* ── Settle ── */}
      <div className={clsx('panel grain-overlay overflow-hidden', !canSettle && 'opacity-70')}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <Kicker>Clearing</Kicker>
            <h3 className="mt-1.5 font-display text-xl tracking-tightest text-bone">
              Settle a match
            </h3>
          </div>
          {!canSettle && (
            <span className="phase-pill border border-line-strong bg-night-800 text-bone-faint">
              CLEARING only
            </span>
          )}
        </div>

        <div className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Clearing rate · bps</label>
              <input
                type="number"
                value={settleRate}
                onChange={(e) => setSettleRate(e.target.value)}
                placeholder="640"
                className="field"
              />
              {settleRate && (
                <p className="mt-1 font-mono text-[11px] text-reveal">{formatBps(Number(settleRate))}</p>
              )}
            </div>
            <div>
              <label className="field-label">Match amount · µN</label>
              <input
                type="number"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                placeholder="9000000000"
                className="field"
              />
            </div>
            <div>
              <label className="field-label">Lend slot</label>
              <input
                type="number"
                value={settleLendSlot}
                onChange={(e) => setSettleLendSlot(e.target.value)}
                placeholder="0"
                className="field"
              />
            </div>
            <div>
              <label className="field-label">Borrow slot</label>
              <input
                type="number"
                value={settleBorrowSlot}
                onChange={(e) => setSettleBorrowSlot(e.target.value)}
                placeholder="0"
                className="field"
              />
            </div>
          </div>

          {(lendBids.length > 0 || borrowBids.length > 0) && (
            <div className="panel-inset space-y-2 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-bone-faint">
                Revealed bids
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
                <div className="space-y-1">
                  {lendBids.map((b) => (
                    <button
                      key={b.slot}
                      onClick={() => {
                        setSettleLendSlot(String(b.slot));
                        setSettleRate(String(b.rate));
                        setSettleAmount(String(b.amount));
                      }}
                      className="block w-full text-left text-seal transition-colors hover:text-seal-bright"
                    >
                      L#{b.slot} · {formatAmount(b.amount)} · {formatBps(b.rate)}
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  {borrowBids.map((b) => (
                    <button
                      key={b.slot}
                      onClick={() => setSettleBorrowSlot(String(b.slot))}
                      className="block w-full text-left text-reveal transition-colors hover:text-reveal-bright"
                    >
                      B#{b.slot} · {formatAmount(b.amount)} · {formatBps(b.rate)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={settle}
            disabled={!canSettle || (!isConnected && !DEMO) || isPending || !settleRate}
            className="btn-reveal w-full"
          >
            <BoltIcon className="h-4 w-4" />
            Settle match
          </button>
        </div>
      </div>
    </div>
  );
}

function padTo32(input: string): Uint8Array {
  const clean = input.startsWith('0x') ? input.slice(2) : input;
  if (/^[0-9a-fA-F]+$/.test(clean) && clean.length <= 64) {
    return fromHex(clean.padStart(64, '0'));
  }
  const raw = new TextEncoder().encode(input);
  const result = new Uint8Array(32);
  result.set(raw.slice(0, 32));
  return result;
}
