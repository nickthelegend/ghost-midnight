import { useLoans } from '@/hooks/useLoans';
import { useWalletStore } from '@/store/walletStore';
import { Kicker, Money, Tag } from '@/components/ui/kit';
import { formatAmount, formatBps, truncateAddress } from '@/utils/format';
import type { LoanInfo } from '@/sdk/types';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

function totalDue(loan: LoanInfo): bigint {
  return (loan.principal * BigInt(10000 + loan.rate)) / 10000n;
}

function LoanRow({ loan, myOwner }: { loan: LoanInfo; myOwner: string | null }) {
  const { repay, isRepaying } = useLoans();
  const iLent = myOwner != null && loan.lender === myOwner;
  const iBorrowed = myOwner != null && loan.borrower === myOwner;
  const due = totalDue(loan);
  const interest = due - loan.principal;
  const counterparty = iLent ? loan.borrower : loan.lender;

  return (
    <div className="grid grid-cols-2 items-center gap-x-4 gap-y-3 border-t border-line px-6 py-4 lg:grid-cols-[auto_1.1fr_1fr_0.8fr_0.7fr_1fr_auto]">
      {/* id + role */}
      <div className="lg:contents">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-bone-faint">
            #{String(loan.id).padStart(2, '0')}
          </span>
          {iLent ? (
            <Tag tone="seal" dot>
              You lent
            </Tag>
          ) : iBorrowed ? (
            <Tag tone="reveal" dot>
              You borrowed
            </Tag>
          ) : (
            <Tag tone="neutral">Market</Tag>
          )}
        </div>
      </div>

      <div>
        <p className="lg:hidden">
          <Kicker>Principal</Kicker>
        </p>
        <Money value={loan.principal} className="text-sm" />
        <p className="mt-0.5 font-mono text-[10px] text-bone-faint">
          ↔ {truncateAddress(counterparty, 4)}
        </p>
      </div>

      <div>
        <p className="lg:hidden">
          <Kicker>Collateral</Kicker>
        </p>
        <Money value={loan.collateral} className="text-sm" accent="bone" />
        <p className="mt-0.5 font-mono text-[10px] text-bone-faint">
          {((Number(loan.collateral) / Number(loan.principal)) * 100).toFixed(0)}% health
        </p>
      </div>

      <div>
        <p className="lg:hidden">
          <Kicker>Rate</Kicker>
        </p>
        <span className="font-mono text-sm text-seal">{formatBps(loan.rate)}</span>
      </div>

      <div>
        <p className="lg:hidden">
          <Kicker>Interest</Kicker>
        </p>
        <span className="font-mono text-sm text-reveal">+{formatAmount(interest)}</span>
      </div>

      <div>
        <p className="lg:hidden">
          <Kicker>Total due</Kicker>
        </p>
        {loan.repaid ? (
          <Tag tone="reveal">Repaid</Tag>
        ) : (
          <Money value={due} className="text-sm" accent="bone" />
        )}
      </div>

      <div className="col-span-2 lg:col-span-1 lg:justify-self-end">
        {iBorrowed && !loan.repaid ? (
          <button
            onClick={() => repay(loan.id, due)}
            disabled={isRepaying}
            className="btn-reveal w-full lg:w-auto"
          >
            <ArrowPathIcon className={clsx('h-4 w-4', isRepaying && 'animate-spin')} />
            Repay
          </button>
        ) : loan.repaid ? (
          <span className="font-mono text-[11px] text-bone-faint">settled</span>
        ) : (
          <span className="font-mono text-[11px] text-seal">active</span>
        )}
      </div>
    </div>
  );
}

export default function LoanLedger() {
  const { loans } = useLoans();
  const { owner } = useWalletStore();

  const lentOut = loans
    .filter((l) => l.lender === owner && !l.repaid)
    .reduce((s, l) => s + l.principal, 0n);
  const borrowed = loans
    .filter((l) => l.borrower === owner && !l.repaid)
    .reduce((s, l) => s + l.principal, 0n);
  const active = loans.filter((l) => !l.repaid).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="panel grain-overlay overflow-hidden p-5">
          <Kicker>Lent out</Kicker>
          <p className="mt-2 text-xl">
            <Money value={lentOut} accent="seal" />
          </p>
        </div>
        <div className="panel grain-overlay overflow-hidden p-5">
          <Kicker>Borrowed</Kicker>
          <p className="mt-2 text-xl">
            <Money value={borrowed} accent="reveal" />
          </p>
        </div>
        <div className="panel grain-overlay overflow-hidden p-5">
          <Kicker>Active loans</Kicker>
          <p className="mt-2 font-mono text-xl text-bone">{active}</p>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="hidden grid-cols-[auto_1.1fr_1fr_0.8fr_0.7fr_1fr_auto] gap-4 px-6 py-3 lg:grid">
          {['Loan', 'Principal', 'Collateral', 'Rate', 'Interest', 'Total due', ''].map((h, i) => (
            <span
              key={i}
              className={clsx(
                'font-mono text-[10px] uppercase tracking-[0.16em] text-bone-faint',
                i === 6 && 'text-right',
              )}
            >
              {h}
            </span>
          ))}
        </div>
        {loans.length === 0 ? (
          <div className="border-t border-line px-6 py-12 text-center text-sm text-bone-faint">
            No loans yet. Matched bids from the auction appear here as active positions.
          </div>
        ) : (
          loans.map((loan) => <LoanRow key={loan.id} loan={loan} myOwner={owner} />)
        )}
      </div>
    </div>
  );
}
