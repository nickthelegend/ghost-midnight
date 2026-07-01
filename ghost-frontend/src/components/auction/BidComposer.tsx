import { useState } from 'react';
import { useAuction } from '@/hooks/useAuction';
import { parseAmount, formatBps, formatAmount } from '@/utils/format';
import { DEMO } from '@/config/demo';
import { Kicker } from '@/components/ui/kit';
import { LockClosedIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function BidComposer({ side }: { side: 'lend' | 'borrow' }) {
  const { phase, isTxPending, submitLend, submitBorrow } = useAuction();
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [collateral, setCollateral] = useState('');

  const isLend = side === 'lend';
  const canBid = DEMO || phase === 0;

  const amtNum = Number(amount) || 0;
  const colNum = Number(collateral) || 0;
  const ratio = amtNum > 0 ? (colNum / amtNum) * 100 : 0;
  const collateralOk = !isLend ? ratio >= 150 : true;
  const ready = amtNum > 0 && Number(rate) > 0 && collateralOk;

  const submit = () => {
    if (!ready) return;
    const a = parseAmount(amount);
    const r = BigInt(Math.round(Number(rate)));
    if (isLend) submitLend(a, r);
    else submitBorrow(a, r);
    setAmount('');
    setRate('');
    setCollateral('');
  };

  return (
    <div className="panel grain-overlay overflow-hidden">
      <div className="border-b border-line px-6 py-4">
        <Kicker>{isLend ? 'Supply capital' : 'Request capital'}</Kicker>
        <h3 className="mt-1.5 font-display text-xl tracking-tightest text-bone">
          Compose a {side} bid
        </h3>
      </div>

      <div className="space-y-4 p-6">
        <div>
          <label className="field-label">Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="field pr-14"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-bone-faint">
              N
            </span>
          </div>
        </div>

        <div>
          <label className="field-label">
            {isLend ? 'Minimum rate · r_min' : 'Maximum rate · r_max'}
          </label>
          <div className="relative">
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 600"
              className="field pr-16"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-bone-faint">
              {rate ? formatBps(Number(rate)) : 'bps'}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-bone-faint">
            {isLend
              ? 'You will not lend below this rate.'
              : 'You will not borrow above this rate.'}
          </p>
        </div>

        {!isLend && (
          <div>
            <label className="field-label">Collateral</label>
            <div className="relative">
              <input
                type="number"
                value={collateral}
                onChange={(e) => setCollateral(e.target.value)}
                placeholder="0.00"
                className="field pr-14"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-bone-faint">
                N
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px]">
              {collateral ? (
                collateralOk ? (
                  <span className="flex items-center gap-1.5 text-reveal">
                    <ShieldCheckIcon className="h-3.5 w-3.5" />
                    {ratio.toFixed(0)}% collateralized · meets 150% minimum
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-danger">
                    <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                    {ratio.toFixed(0)}% — needs at least 150% ({formatAmount(parseAmount(String(amtNum * 1.5)))} N)
                  </span>
                )
              ) : (
                <span className="text-bone-faint">Minimum 150% of the borrowed amount.</span>
              )}
            </div>
          </div>
        )}

        {/* ── Commitment preview — the signature ── */}
        <div className="rounded-xl border border-seal/20 bg-night-900/60 p-4">
          <div className="flex items-center gap-2">
            <LockClosedIcon className="h-4 w-4 text-seal" />
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-seal">
              Sealed commitment
            </span>
          </div>
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-bone-faint">
            sha256( <span className="text-bone-soft">amount</span> ∥{' '}
            <span className="text-bone-soft">rate</span> ∥ nonce ∥ owner )
          </p>
          <div className="mt-3 flex items-center gap-2 overflow-hidden">
            <div className="seal-skin h-8 flex-1 rounded-md" />
            <span className="font-mono text-[10px] text-bone-faint">hidden on-chain</span>
          </div>
          <p className="mt-3 text-[11px] leading-snug text-bone-faint">
            Your figures are hashed before they touch the chain. The book sees only the seal —
            until you reveal in the next phase.
          </p>
        </div>

        <button
          onClick={submit}
          disabled={!ready || isTxPending || !canBid}
          className={clsx('w-full', isLend ? 'btn-seal' : 'btn-reveal')}
        >
          {isTxPending ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Sealing…
            </>
          ) : !canBid ? (
            'Opens in the Bid phase'
          ) : (
            <>
              <LockClosedIcon className="h-4 w-4" />
              Seal {side} bid
            </>
          )}
        </button>
      </div>
    </div>
  );
}
