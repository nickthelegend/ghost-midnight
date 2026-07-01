import { PhaseSpine } from '@/components/common/PhaseSpine';
import BidComposer from '@/components/auction/BidComposer';
import RevealQueue from '@/components/auction/RevealQueue';
import OrderBook from '@/components/auction/OrderBook';
import { Kicker, SectionHead } from '@/components/ui/kit';
import { useAuctionStore } from '@/store/auctionStore';

export default function Lend() {
  const { phase, epochNum, lendBids, borrowBids, clearingRate } = useAuctionStore();

  return (
    <div className="space-y-8 animate-rise">
      <header>
        <Kicker>Supply · lenders</Kicker>
        <h1 className="mt-3 font-display text-4xl tracking-tightest text-bone">Lend</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-bone-soft">
          Seal a lend bid with a minimum rate. It stays hidden until you reveal — then it competes in
          the batch auction and earns at the single clearing rate.
        </p>
      </header>

      <PhaseSpine phase={phase} epochNum={epochNum} />

      <div className="grid gap-6 lg:grid-cols-2">
        <BidComposer side="lend" />
        <RevealQueue side="lend" />
      </div>

      <div>
        <SectionHead eyebrow="Live order book" title="Supply meets demand" />
        <OrderBook
          lendBids={lendBids}
          borrowBids={borrowBids}
          clearingRate={clearingRate}
          sealedLend={2}
        />
      </div>
    </div>
  );
}
