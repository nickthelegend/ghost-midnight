import clsx from 'clsx';
import type { ReactNode } from 'react';
import { formatAmount } from '@/utils/format';

/** Small uppercase mono eyebrow. */
export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx('kicker', className)}>{children}</p>;
}

/** Section header: eyebrow + title + optional trailing slot, with a hairline. */
export function SectionHead({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          {eyebrow && <Kicker className="mb-2">{eyebrow}</Kicker>}
          <h2 className="font-display text-[22px] leading-none tracking-tightest text-bone">
            {title}
          </h2>
        </div>
        {right}
      </div>
      <div className="rule mt-4" />
    </div>
  );
}

/** A monospace money value with a subdued unit. */
export function Money({
  value,
  unit = 'N',
  className,
  accent,
}: {
  value: bigint;
  unit?: string;
  className?: string;
  accent?: 'seal' | 'reveal' | 'bone';
}) {
  const color =
    accent === 'seal' ? 'text-seal' : accent === 'reveal' ? 'text-reveal' : 'text-bone';
  return (
    <span className={clsx('tnum font-mono', color, className)}>
      {formatAmount(value)}
      <span className="ml-1.5 text-[0.7em] font-medium text-bone-faint">{unit}</span>
    </span>
  );
}

/** A labelled stat tile. */
export function Stat({
  label,
  children,
  sub,
  className,
}: {
  label: string;
  children: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('panel grain-overlay overflow-hidden p-5', className)}>
      <Kicker>{label}</Kicker>
      <div className="mt-3 text-[26px] leading-none">{children}</div>
      {sub && <div className="mt-2 text-xs text-bone-soft">{sub}</div>}
    </div>
  );
}

/** A pill tag for lend/borrow side or status. */
export function Tag({
  tone = 'neutral',
  children,
  dot,
}: {
  tone?: 'seal' | 'reveal' | 'danger' | 'neutral';
  children: ReactNode;
  dot?: boolean;
}) {
  const tones: Record<string, string> = {
    seal: 'text-seal bg-seal/10 border-seal/25',
    reveal: 'text-reveal bg-reveal/10 border-reveal/25',
    danger: 'text-danger bg-danger/10 border-danger/25',
    neutral: 'text-bone-soft bg-night-800 border-line-strong',
  };
  return (
    <span className={clsx('phase-pill border', tones[tone])}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
