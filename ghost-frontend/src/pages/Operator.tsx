import OperatorPanel from '@/components/operator/OperatorPanel';
import { PhaseSpine } from '@/components/common/PhaseSpine';
import { Kicker } from '@/components/ui/kit';
import { useAuctionStore } from '@/store/auctionStore';

export default function Operator() {
  const { phase, epochNum } = useAuctionStore();

  return (
    <div className="space-y-8 animate-rise">
      <header>
        <Kicker>Auction operator</Kicker>
        <h1 className="mt-3 font-display text-4xl tracking-tightest text-bone">Operator console</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-bone-soft">
          Drive the epoch through its four phases and settle matched pairs at the clearing rate. Only
          the registered operator key can advance phases.
        </p>
      </header>

      <PhaseSpine phase={phase} epochNum={epochNum} />

      <OperatorPanel />
    </div>
  );
}
