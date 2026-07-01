import { useWallet } from '@/hooks/useWallet';
import { truncateAddress, formatAmount } from '@/utils/format';
import { PowerIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

/** Deterministic spectral gradient from an address, for the identity chip. */
function avatarStyle(seed: string): React.CSSProperties {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  const steel = 200 + (h % 24); // cool steel range
  const orange = 20 + (h % 18); // molten orange range
  return {
    background: `conic-gradient(from 140deg, hsl(${steel} 18% 66%), hsl(${orange} 95% 55%), hsl(${steel} 18% 66%))`,
  };
}

export default function ConnectWallet({ compact = false }: { compact?: boolean }) {
  const { isConnected, isConnecting, address, balance, connect, disconnect } = useWallet();

  if (isConnected && address) {
    return (
      <div
        className={clsx(
          'flex items-center gap-3 rounded-xl border border-line-strong bg-night-800/70 p-2.5',
          compact && 'p-1.5',
        )}
      >
        <span
          className="h-9 w-9 shrink-0 rounded-lg ring-1 ring-white/10"
          style={avatarStyle(address)}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-xs text-bone">{truncateAddress(address, 7)}</p>
          {!compact && (
            <p className="mt-0.5 font-mono text-[11px] text-bone-faint">
              <span className="tnum text-reveal">{formatAmount(balance)}</span> N available
            </p>
          )}
        </div>
        <button
          onClick={disconnect}
          title="Disconnect"
          className="rounded-lg p-2 text-bone-faint transition-colors hover:bg-night-750 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50"
        >
          <PowerIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button onClick={connect} disabled={isConnecting} className="btn-seal w-full">
      {isConnecting ? (
        <>
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-night-950 border-t-transparent" />
          Connecting…
        </>
      ) : (
        'Connect Lace'
      )}
    </button>
  );
}
