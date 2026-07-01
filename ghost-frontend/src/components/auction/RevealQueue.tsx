import { useState } from 'react';
import { useAuction } from '@/hooks/useAuction';
import { CommitmentChip } from '@/components/ui/SealedValue';
import { Kicker } from '@/components/ui/kit';
import { formatAmount, formatBps } from '@/utils/format';
import { parseAmount } from '@/utils/format';
import { DEMO } from '@/config/demo';
import type { StoredCommitment } from '@/sdk/types';
import { LockOpenIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

function RevealRow({ c, canReveal }: { c: StoredCommitment; canReveal: boolean }) {
  const { isTxPending, revealLend, revealBorrow } = useAuction();
  const isLend = c.side === 'lend';
  const defaultCol = formatAmount((c.amount * 150n) / 100n);
  const [collateral, setCollateral] = useState(defaultCol.replace(/,/g, ''));

  const reveal = () => {
    if (isLend) revealLend(c);
    else revealBorrow(c, parseAmount(collateral || defaultCol));
  };

  return (
    <div className="rounded-xl border border-line-strong bg-night-900/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <CommitmentChip hash={c.hash} />
        <span
          className={clsx(
            'phase-pill border',
            isLend ? 'border-seal/25 bg-seal/10 text-seal' : 'border-reveal/25 bg-reveal/10 text-reveal',
          )}
        >
          {c.side}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <Kicker>Amount</Kicker>
          <p className="mt-1 font-mono text-lg text-bone">
            {formatAmount(c.amount)} <span className="text-xs text-bone-faint">N</span>
          </p>
        </div>
        <div>
          <Kicker>{isLend ? 'r_min' : 'r_max'}</Kicker>
          <p className="mt-1 font-mono text-lg text-bone">{formatBps(Number(c.rate))}</p>
        </div>
      </div>

      {!isLend && (
        <div className="mt-4">
          <label className="field-label">Collateral to lock at reveal</label>
          <div className="relative">
            <input
              type="number"
              value={collateral}
              onChange={(e) => setCollateral(e.target.value)}
              className="field pr-14"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-bone-faint">
              N
            </span>
          </div>
        </div>
      )}

      <button
        onClick={reveal}
        disabled={isTxPending || !canReveal}
        className={clsx('mt-4 w-full', isLend ? 'btn-seal' : 'btn-reveal')}
      >
        <LockOpenIcon className="h-4 w-4" />
        {canReveal ? 'Reveal to book' : 'Reveal opens next phase'}
      </button>
    </div>
  );
}

export default function RevealQueue({ side }: { side: 'lend' | 'borrow' }) {
  const { phase, myCommitments } = useAuction();
  const mine = myCommitments.filter((c) => c.side === side);
  const canReveal = DEMO || phase === 1;

  return (
    <div className="panel grain-overlay overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <Kicker>Your sealed {side} bids</Kicker>
          <h3 className="mt-1.5 font-display text-xl tracking-tightest text-bone">Reveal queue</h3>
        </div>
        <span className="font-mono text-sm text-bone-soft">{mine.length} sealed</span>
      </div>

      <div className="space-y-3 p-6">
        {mine.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="seal-skin h-12 w-12 rounded-xl" />
            <p className="max-w-xs text-sm text-bone-faint">
              No sealed {side} bids yet. Compose one and it will wait here as a commitment until you
              reveal it to the book.
            </p>
          </div>
        ) : (
          mine.map((c) => <RevealRow key={c.hash} c={c} canReveal={canReveal} />)
        )}
      </div>
    </div>
  );
}
