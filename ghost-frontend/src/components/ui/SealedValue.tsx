import clsx from 'clsx';
import { LockClosedIcon, SparklesIcon } from '@heroicons/react/24/outline';

/**
 * The signature element. A bid value is a cryptographic commitment: hidden
 * ("sealed") until its owner chooses to reveal it. Sealed values shimmer in
 * cool steel and read as redacted; revealed values ignite and materialize in
 * molten orange. The colour itself encodes the commit→reveal mechanic.
 */
export function SealedValue({
  sealed,
  value,
  hash,
  className,
}: {
  sealed: boolean;
  value: string;
  hash?: string;
  className?: string;
}) {
  if (sealed) {
    return (
      <span
        className={clsx(
          'relative inline-flex items-center gap-2 rounded-md border border-seal/25 px-2.5 py-1 font-mono text-sm text-seal/90',
          className,
        )}
        title={hash ? `commitment ${hash.slice(0, 10)}…` : 'Sealed until reveal'}
      >
        <span className="seal-skin absolute inset-0 rounded-md" aria-hidden />
        <LockClosedIcon className="relative h-3.5 w-3.5" />
        <span className="relative tracking-[0.3em] select-none">▚▚▚▚</span>
      </span>
    );
  }
  return (
    <span
      className={clsx(
        'inline-flex animate-materialize items-center gap-1.5 font-mono text-sm text-reveal',
        className,
      )}
    >
      <SparklesIcon className="h-3.5 w-3.5 opacity-80" />
      {value}
    </span>
  );
}

/** A truncated commitment hash rendered as a spectral chip. */
export function CommitmentChip({ hash }: { hash: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line-strong bg-night-900/70 px-2 py-1 font-mono text-[11px] text-bone-soft">
      <span className="h-1.5 w-1.5 rounded-full bg-seal/70" />
      0x{hash.slice(0, 6)}
      <span className="text-bone-faint">…</span>
      {hash.slice(-4)}
    </span>
  );
}
