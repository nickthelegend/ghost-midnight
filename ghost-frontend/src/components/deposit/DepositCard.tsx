import { useState } from 'react';
import { useWalletStore } from '@/store/walletStore';
import { useAuctionStore } from '@/store/auctionStore';
import { parseAmount } from '@/utils/format';
import { DEMO } from '@/config/demo';
import { ArrowDownLeftIcon, ArrowUpRightIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function DepositCard() {
  const { sdk, isConnected } = useWalletStore();
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async () => {
    if (!amount) return;

    if (DEMO) {
      const delta = parseAmount(amount);
      const w = useWalletStore.getState();
      const a = useAuctionStore.getState();
      if (mode === 'deposit') {
        useWalletStore.setState({ balance: w.balance - delta });
        useAuctionStore.setState({ totalDeposits: a.totalDeposits + delta });
        toast.success(`Deposited ${amount} N into the vault`);
      } else {
        useWalletStore.setState({ balance: w.balance + delta });
        useAuctionStore.setState({ totalDeposits: a.totalDeposits - delta });
        toast.success(`Withdrew ${amount} N`);
      }
      setAmount('');
      return;
    }

    if (!sdk) return;
    setIsPending(true);
    try {
      const owner = await sdk.wallet.getOwnerBytes();
      const parsed = parseAmount(amount);
      if (mode === 'deposit') {
        await sdk.contract.deposit(owner, parsed);
        toast.success(`Deposited ${amount}`);
      } else {
        await sdk.contract.withdraw(owner, parsed);
        toast.success(`Withdrew ${amount}`);
      }
      setAmount('');
      const bal = await sdk.wallet.getBalance();
      useWalletStore.setState({ balance: bal });
    } catch (err: any) {
      toast.error(err.message || `Failed to ${mode}`);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="panel grain-overlay flex flex-col overflow-hidden p-6">
      <div className="mb-4 flex rounded-xl border border-line-soft bg-night-900/60 p-1">
        {(['deposit', 'withdraw'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={clsx(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium capitalize transition-all',
              mode === m ? 'bg-night-750 text-bone shadow-sm' : 'text-bone-faint hover:text-bone-soft',
            )}
          >
            {m === 'deposit' ? (
              <ArrowDownLeftIcon className="h-4 w-4" />
            ) : (
              <ArrowUpRightIcon className="h-4 w-4" />
            )}
            {m}
          </button>
        ))}
      </div>

      <label className="field-label">Amount</label>
      <div className="relative">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="field pr-14"
          min="0"
          step="0.01"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-bone-faint">
          N
        </span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!isConnected || !amount || isPending}
        className={clsx('mt-4 w-full', mode === 'deposit' ? 'btn-reveal' : 'btn-ghost')}
      >
        {isPending ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Processing…
          </>
        ) : mode === 'deposit' ? (
          'Deposit to vault'
        ) : (
          'Withdraw'
        )}
      </button>
    </div>
  );
}
