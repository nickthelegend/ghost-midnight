import clsx from 'clsx';

type PhaseMeta = { key: string; label: string; blurb: string };

const PHASES: PhaseMeta[] = [
  { key: 'BID', label: 'Bid', blurb: 'Seal amount & rate as a commitment' },
  { key: 'REVEAL', label: 'Reveal', blurb: 'Open your sealed bid to the book' },
  { key: 'CLEAR', label: 'Clear', blurb: 'Settle matches at one clearing rate' },
  { key: 'ACTIVE', label: 'Active', blurb: 'Loans live — repay to release collateral' },
];

/** Full horizontal auction timeline used at the top of feature pages. */
export function PhaseSpine({ phase, epochNum }: { phase: number; epochNum: number }) {
  return (
    <div className="panel grain-overlay overflow-hidden">
      <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center">
        {/* Epoch block */}
        <div className="flex shrink-0 items-center gap-4 lg:flex-col lg:items-start lg:border-r lg:border-line lg:pr-8">
          <div>
            <p className="kicker">Epoch</p>
            <p className="font-display text-4xl leading-none tracking-tightest text-bone">
              {String(epochNum).padStart(2, '0')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-reveal" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-reveal" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-reveal">
              {PHASES[phase]?.label} phase live
            </span>
          </div>
        </div>

        {/* Steps */}
        <ol className="grid flex-1 grid-cols-2 gap-x-2 gap-y-6 sm:grid-cols-4">
          {PHASES.map((p, i) => {
            const state = i < phase ? 'done' : i === phase ? 'active' : 'todo';
            return (
              <li key={p.key} className="relative">
                {/* connector */}
                {i < PHASES.length - 1 && (
                  <span
                    className={clsx(
                      'absolute left-[calc(1.25rem+4px)] top-2.5 hidden h-px w-[calc(100%-1rem)] sm:block',
                      i < phase ? 'bg-reveal/45' : 'bg-line-strong',
                    )}
                  />
                )}
                <div className="flex items-start gap-2.5">
                  <span
                    className={clsx(
                      'relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-semibold',
                      state === 'done' && 'border-reveal/35 bg-reveal/10 text-reveal/70',
                      state === 'active' &&
                        'border-reveal bg-reveal/15 text-reveal shadow-[0_0_0_4px_rgba(255,106,26,0.14)]',
                      state === 'todo' && 'border-line-strong bg-night-900 text-bone-faint',
                    )}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={clsx(
                        'font-mono text-xs font-semibold uppercase tracking-[0.14em]',
                        state === 'active' ? 'text-bone' : 'text-bone-soft',
                      )}
                    >
                      {p.label}
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-bone-faint">{p.blurb}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/** Compact vertical variant for the sidebar footer. */
export function PhaseSpineMini({ phase, epochNum }: { phase: number; epochNum: number }) {
  return (
    <div className="panel-inset p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="kicker">Auction</span>
        <span className="font-mono text-[11px] text-bone-soft">
          epoch <span className="text-bone">{String(epochNum).padStart(2, '0')}</span>
        </span>
      </div>
      <div className="flex items-center gap-1">
        {PHASES.map((p, i) => {
          const state = i < phase ? 'done' : i === phase ? 'active' : 'todo';
          return (
            <div key={p.key} className="flex-1">
              <div
                className={clsx(
                  'h-1 rounded-full',
                  state === 'done' && 'bg-reveal/50',
                  state === 'active' && 'animate-pulse-dot bg-seal',
                  state === 'todo' && 'bg-line-strong',
                )}
              />
              <p
                className={clsx(
                  'mt-1.5 font-mono text-[9px] uppercase tracking-wider',
                  state === 'active' ? 'text-seal' : 'text-bone-faint',
                )}
              >
                {p.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
