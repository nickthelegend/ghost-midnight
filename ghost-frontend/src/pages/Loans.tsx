import { PhaseSpine } from '@/components/common/PhaseSpine';
import LoanLedger from '@/components/loans/LoanLedger';
import { Kicker } from '@/components/ui/kit';
import { useAuctionStore } from '@/store/auctionStore';
import { useWalletStore } from '@/store/walletStore';

export default function Loans() {
  const { phase, epochNum } = useAuctionStore();
  const { isConnected } = useWalletStore();

  return (
    <div className="space-y-8 animate-rise">
      <header>
        <Kicker>Positions</Kicker>
        <h1 className="mt-3 font-display text-4xl tracking-tightest text-bone">Active loans</h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-bone-soft">
          Every match becomes a collateralized loan at the clearing rate. Repay principal plus
          interest to release your collateral.
        </p>
      </header>

      <PhaseSpine phase={phase} epochNum={epochNum} />

      {isConnected ? (
        <LoanLedger />
      ) : (
        <div className="panel px-6 py-16 text-center text-sm text-bone-faint">
          Connect your wallet to view your positions.
        </div>
      )}
    </div>
  );
}
