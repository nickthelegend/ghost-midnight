import { PhaseSpine } from '@/components/common/PhaseSpine';
import BidComposer from '@/components/auction/BidComposer';
import RevealQueue from '@/components/auction/RevealQueue';
import OrderBook from '@/components/auction/OrderBook';
import { Kicker, SectionHead } from '@/components/ui/kit';
import { useAuctionStore } from '@/store/auctionStore';

export default function Borrow() {
  const { phase, epochNum, lendBids, borrowBids, clearingRate } = useAuctionStore();

  return (
    <div className="space-y-8 animate-rise">
      <header>
        <Kicker>Demand · borrowers</Kicker>
        <h1 className="mt-3 font-display text-4xl tracking-tightest text-bone">Borrow</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-bone-soft">
          Seal a borrow bid with a maximum rate and post collateral of at least 150%. Reveal it to
          the book and borrow at the clearing rate if the market crosses your limit.
        </p>
      </header>

      <PhaseSpine phase={phase} epochNum={epochNum} />

      <div className="grid gap-6 lg:grid-cols-2">
        <BidComposer side="borrow" />
        <RevealQueue side="borrow" />
      </div>

      <div>
        <SectionHead eyebrow="Live order book" title="Demand meets supply" />
        <OrderBook
          lendBids={lendBids}
          borrowBids={borrowBids}
          clearingRate={clearingRate}
          sealedBorrow={2}
        />
      </div>
    </div>
  );
}
