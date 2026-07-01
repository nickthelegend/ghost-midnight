import { Link } from 'react-router-dom';
import { PhaseSpine } from '@/components/common/PhaseSpine';
import OrderBook from '@/components/auction/OrderBook';
import DepositCard from '@/components/deposit/DepositCard';
import { Kicker, Stat, Money, Tag, SectionHead } from '@/components/ui/kit';
import { useAuctionStore } from '@/store/auctionStore';
import { useWalletStore } from '@/store/walletStore';
import { formatAmount, formatBps } from '@/utils/format';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

export default function Dashboard() {
  const { isConnected, balance } = useWalletStore();
  const {
    phase,
    epochNum,
    clearingRate,
    matchedVolume,
    totalDeposits,
    totalLocked,
    lendBids,
    borrowBids,
    myCommitments,
  } = useAuctionStore();

  const supply = lendBids.reduce((s, b) => s + Number(b.amount), 0);
  const demand = borrowBids.reduce((s, b) => s + Number(b.amount), 0);
  const supplyPct = supply + demand === 0 ? 50 : (supply / (supply + demand)) * 100;

  return (
    <div className="space-y-10">
      {/* ── Hero ── */}
      <section className="grid animate-rise items-stretch gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col justify-center">
          <Kicker>Privacy-preserving lending · Midnight Network</Kicker>
          <h1 className="mt-5 font-display text-[44px] leading-[1.02] tracking-tightest text-bone text-balance sm:text-[56px]">
            Lend and borrow with your{' '}
            <span className="text-seal">cards face&#8209;down</span>.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-bone-soft">
            GHOST collects sealed lend and borrow bids in a batch auction, then clears them at a
            single fair rate. Your amount and rate limit stay hidden as a cryptographic commitment —
            revealed only when you choose.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Tag tone="seal" dot>
              Sealed commitments
            </Tag>
            <Tag tone="reveal" dot>
              Uniform clearing rate
            </Tag>
            <Tag tone="neutral">150% collateralized</Tag>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/lend" className="btn-seal">
              Seal a lend bid <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link to="/borrow" className="btn-ghost">
              Borrow against collateral
            </Link>
          </div>
        </div>

        {/* Market pulse */}
        <div className="panel grain-overlay flex flex-col justify-between overflow-hidden p-6">
          <div className="flex items-start justify-between">
            <div>
              <Kicker>Clearing rate · epoch {String(epochNum).padStart(2, '0')}</Kicker>
              <p className="mt-3 font-display text-6xl leading-none tracking-tightest text-reveal">
                {formatBps(clearingRate)}
              </p>
              <p className="mt-3 text-sm text-bone-soft">
                Matched this epoch ·{' '}
                <Money value={matchedVolume} accent="bone" className="text-sm" />
              </p>
            </div>
            <span className="rounded-full border border-reveal/25 bg-reveal/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-reveal">
              Live
            </span>
          </div>

          <div className="mt-8">
            <div className="mb-2 flex justify-between font-mono text-[11px] uppercase tracking-[0.14em]">
              <span className="text-seal">Supply {Math.round(supplyPct)}%</span>
              <span className="text-reveal">Demand {Math.round(100 - supplyPct)}%</span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-night-800">
              <div className="bg-seal/70" style={{ width: `${supplyPct}%` }} />
              <div className="bg-reveal/70" style={{ width: `${100 - supplyPct}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="panel-inset px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-bone-faint">Lenders</p>
                <p className="mt-1 text-seal">{lendBids.length} revealed</p>
              </div>
              <div className="panel-inset px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-bone-faint">Borrowers</p>
                <p className="mt-1 text-reveal">{borrowBids.length} revealed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Phase spine ── */}
      <PhaseSpine phase={phase} epochNum={epochNum} />

      {/* ── Stats ── */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total deposits">
          <Money value={totalDeposits} />
        </Stat>
        <Stat label="Locked in loans">
          <Money value={totalLocked} accent="reveal" />
        </Stat>
        <Stat label="Last clearing rate">
          <span className="tnum font-mono text-seal">{formatBps(clearingRate)}</span>
        </Stat>
        <Stat label="Matched volume">
          <Money value={matchedVolume} />
        </Stat>
      </section>

      {/* ── Market + vault ── */}
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <SectionHead eyebrow="Live order book" title="Where supply meets demand" />
          <OrderBook
            lendBids={lendBids}
            borrowBids={borrowBids}
            clearingRate={clearingRate}
            sealedLend={2}
            sealedBorrow={1}
          />
        </div>

        <div>
          <SectionHead eyebrow="Your vault" title="Balance & funds" />
          <div className="space-y-4">
            <div className="panel grain-overlay overflow-hidden p-6">
              <Kicker>Available to bid</Kicker>
              <p className="mt-3 font-display text-4xl leading-none tracking-tightest text-bone">
                {isConnected ? formatAmount(balance) : '—'}
                <span className="ml-2 font-sans text-base font-medium text-bone-faint">N</span>
              </p>
              <div className="mt-4 flex items-center gap-2">
                {myCommitments.length > 0 ? (
                  <Tag tone="seal" dot>
                    {myCommitments.length} sealed bid{myCommitments.length > 1 ? 's' : ''} pending
                  </Tag>
                ) : (
                  <Tag tone="neutral">No sealed bids</Tag>
                )}
              </div>
            </div>
            <DepositCard />
          </div>
        </div>
      </section>
    </div>
  );
}
