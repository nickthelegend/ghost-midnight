import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import ConnectWallet from '@/components/wallet/ConnectWallet';
import { useAuctionStore } from '@/store/auctionStore';
import { useDemoBoot } from '@/hooks/useDemoBoot';
import { DEMO } from '@/config/demo';
import { PHASE_NAMES } from '@/sdk/types';
import { formatBps, formatAmount } from '@/utils/format';

const NAV = [
  { to: '/', label: 'Dashboard' },
  { to: '/lend', label: 'Lend' },
  { to: '/borrow', label: 'Borrow' },
  { to: '/loans', label: 'Loans' },
  { to: '/operator', label: 'Operator' },
];

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/mark.svg" alt="" className="h-8 w-8" />
      <div className="leading-none">
        <p className="font-display text-lg font-semibold tracking-tight text-bone">GHOST</p>
        <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.28em] text-bone-faint">
          Sealed-bid lending
        </p>
      </div>
    </div>
  );
}

function TickerItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex shrink-0 items-center gap-2 whitespace-nowrap">
      <span className="text-bone-faint">{label}</span>
      <span className="text-bone">{children}</span>
    </span>
  );
}

function StatusTicker() {
  const { phase, epochNum, clearingRate, matchedVolume, totalDeposits } = useAuctionStore();
  return (
    <div className="border-b border-line bg-night-900/50">
      <div className="mx-auto flex h-10 max-w-7xl items-center gap-5 overflow-x-auto px-5 font-mono text-[11px] sm:px-8">
        <span className="flex shrink-0 items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-pulse-dot rounded-full bg-reveal" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-reveal" />
          </span>
          <span className="uppercase tracking-[0.18em] text-reveal">{PHASE_NAMES[phase]}</span>
        </span>
        <span className="h-3 w-px shrink-0 bg-line-strong" />
        <TickerItem label="EPOCH">{String(epochNum).padStart(2, '0')}</TickerItem>
        <TickerItem label="CLEARING">
          <span className="text-reveal">{formatBps(clearingRate)}</span>
        </TickerItem>
        <TickerItem label="MATCHED">{formatAmount(matchedVolume)} N</TickerItem>
        <TickerItem label="DEPOSITS">{formatAmount(totalDeposits)} N</TickerItem>
        <span className="ml-auto shrink-0 rounded border border-line-strong px-1.5 py-0.5 uppercase tracking-[0.18em] text-bone-faint">
          Midnight · Preprod{DEMO ? ' · Demo' : ''}
        </span>
      </div>
    </div>
  );
}

export default function Layout() {
  useDemoBoot();

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Top nav ── */}
      <header className="sticky top-0 z-40 border-b border-line bg-night-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
          <NavLink to="/">
            <Wordmark />
          </NavLink>

          <nav className="hidden items-center gap-0.5 md:flex">
            {NAV.map((item, i) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm transition-colors',
                    isActive ? 'text-bone' : 'text-bone-soft hover:text-bone',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={clsx(
                        'font-mono text-[10px] tabular-nums',
                        isActive ? 'text-reveal' : 'text-bone-faint',
                      )}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {item.label}
                    <span
                      className={clsx(
                        'absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-reveal transition-opacity',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="hidden w-[220px] justify-end sm:flex">
            <ConnectWallet compact />
          </div>
        </div>

        {/* Mobile nav row */}
        <nav className="flex gap-1 overflow-x-auto border-t border-line px-4 py-2 md:hidden">
          {NAV.map((item, i) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors',
                  isActive ? 'bg-night-800 text-bone' : 'text-bone-soft',
                )
              }
            >
              <span className="font-mono text-[10px] text-bone-faint">
                {String(i + 1).padStart(2, '0')}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <StatusTicker />

      {/* ── Main ── */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 lg:py-14">
        <Outlet />
      </main>

      <footer className="border-t border-line px-5 py-6 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 font-mono text-[11px] text-bone-faint sm:flex-row sm:items-center">
          <span>GHOST · privacy-preserving peer-to-peer lending on Midnight Network</span>
          <span className="text-bone-faint/70">Apache-2.0</span>
        </div>
      </footer>
    </div>
  );
}
