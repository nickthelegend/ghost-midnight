import clsx from 'clsx';
import type { RevealedBid } from '@/sdk/types';
import { formatAmount, formatBps, truncateAddress } from '@/utils/format';

function Row({
  bid,
  side,
  max,
  clearingRate,
}: {
  bid: RevealedBid;
  side: 'lend' | 'borrow';
  max: number;
  clearingRate: number;
}) {
  const width = Math.max(6, (Number(bid.amount) / max) * 100);
  const inMoney = side === 'lend' ? bid.rate <= clearingRate : bid.rate >= clearingRate;
  const isLend = side === 'lend';
  return (
    <div className={clsx('flex items-center gap-3', isLend ? 'flex-row-reverse text-right' : '')}>
      <span
        className={clsx(
          'w-14 shrink-0 font-mono text-xs tabular-nums',
          inMoney ? (isLend ? 'text-seal' : 'text-reveal') : 'text-bone-faint',
        )}
      >
        {formatBps(bid.rate)}
      </span>
      <div className={clsx('relative h-7 flex-1', isLend ? 'flex justify-end' : '')}>
        <div
          className={clsx(
            'flex h-7 items-center rounded-md px-2 font-mono text-[11px] tabular-nums transition-all',
            isLend ? 'flex-row-reverse' : '',
            inMoney
              ? isLend
                ? 'bg-seal/15 text-seal'
                : 'bg-reveal/15 text-reveal'
              : 'bg-night-800 text-bone-faint',
          )}
          style={{ width: `${width}%` }}
        >
          {formatAmount(bid.amount)}
        </div>
      </div>
      <span className="hidden w-16 shrink-0 truncate font-mono text-[10px] text-bone-faint sm:block">
        {truncateAddress(bid.owner, 3)}
      </span>
    </div>
  );
}

function SealedRow({ side }: { side: 'lend' | 'borrow' }) {
  const isLend = side === 'lend';
  return (
    <div className={clsx('flex items-center gap-3', isLend ? 'flex-row-reverse' : '')}>
      <span className="w-14 shrink-0 text-center font-mono text-xs text-bone-faint">▚▚</span>
      <div className={clsx('relative h-7 flex-1', isLend ? 'flex justify-end' : '')}>
        <div className="seal-skin h-7 rounded-md" style={{ width: `${30 + ((side === 'lend' ? 22 : 14))}%` }} />
      </div>
      <span className="hidden w-16 shrink-0 font-mono text-[10px] text-bone-faint sm:block">
        sealed
      </span>
    </div>
  );
}

export default function OrderBook({
  lendBids,
  borrowBids,
  clearingRate,
  sealedLend = 0,
  sealedBorrow = 0,
}: {
  lendBids: RevealedBid[];
  borrowBids: RevealedBid[];
  clearingRate: number;
  sealedLend?: number;
  sealedBorrow?: number;
}) {
  const lends = [...lendBids].sort((a, b) => a.rate - b.rate);
  const borrows = [...borrowBids].sort((a, b) => b.rate - a.rate);
  const max = Math.max(1, ...lends.map((b) => Number(b.amount)), ...borrows.map((b) => Number(b.amount)));

  return (
    <div className="panel grain-overlay overflow-hidden">
      {/* Clearing band */}
      <div className="flex items-center justify-between border-b border-line bg-night-900/50 px-6 py-4">
        <div>
          <p className="kicker">Clearing rate</p>
          <p className="mt-1 font-display text-3xl leading-none tracking-tightest text-reveal">
            {formatBps(clearingRate)}
          </p>
        </div>
        <p className="max-w-[42%] text-right text-[11px] leading-snug text-bone-faint">
          One uniform rate where lend supply meets borrow demand. Bids clearing on the wrong
          side of it wait for the next epoch.
        </p>
      </div>

      <div className="grid grid-cols-2">
        <p className="border-b border-r border-line px-6 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-seal">
          Supply · lenders
        </p>
        <p className="border-b border-line px-6 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-reveal">
          Demand · borrowers
        </p>

        <div className="space-y-2 border-r border-line py-4 pl-4 pr-6">
          {lends.map((b) => (
            <Row key={`l${b.slot}`} bid={b} side="lend" max={max} clearingRate={clearingRate} />
          ))}
          {Array.from({ length: sealedLend }).map((_, i) => (
            <SealedRow key={`sl${i}`} side="lend" />
          ))}
        </div>
        <div className="space-y-2 py-4 pl-6 pr-4">
          {borrows.map((b) => (
            <Row key={`b${b.slot}`} bid={b} side="borrow" max={max} clearingRate={clearingRate} />
          ))}
          {Array.from({ length: sealedBorrow }).map((_, i) => (
            <SealedRow key={`sb${i}`} side="borrow" />
          ))}
        </div>
      </div>
    </div>
  );
}
