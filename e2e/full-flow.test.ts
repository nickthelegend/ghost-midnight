/**
 * TRUE end-to-end: boots the real ghost-server as a child process and drives it
 * with the real ghost-cli GhostServerClient over HTTP — exercising the full
 * off-chain path (submit → auction match → settle → repay) plus the client
 * dashboard endpoints the Next.js app reads.
 *
 * Run with: bun test   (from the e2e/ directory)
 */
import { test, expect, beforeAll, afterAll } from 'bun:test';
import { spawn, type Subprocess } from 'bun';
import { join } from 'node:path';
import { GhostServerClient } from '../ghost-cli/src/server-client.ts';

const PORT = 8099;
const BASE = `http://localhost:${PORT}`;
const client = new GhostServerClient(BASE);
// import.meta.dir is already-decoded (handles the space in the project path)
const serverDir = join(import.meta.dir, '..', 'ghost-server');
const dataFile = `./data/e2e-${process.pid}.json`;

let server: Subprocess;

async function waitFor(fn: () => Promise<boolean>, ms = 25000, step = 300) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if (await fn()) return;
    } catch {
      /* retry */
    }
    await Bun.sleep(step);
  }
  throw new Error('waitFor timed out');
}

beforeAll(async () => {
  // Fast epoch so matches land quickly.
  server = spawn(['node', '--loader', 'ts-node/esm', 'src/index.ts'], {
    cwd: serverDir,
    env: { ...process.env, PORT: String(PORT), EPOCH_MS: '500', DATA_FILE: dataFile, LOG_LEVEL: 'error' },
    stdout: 'ignore',
    stderr: 'ignore',
  });
  await waitFor(async () => (await client.health()).ok === true);
});

afterAll(async () => {
  server?.kill();
  try {
    await Bun.file(`${serverDir}/${dataFile}`).delete();
  } catch {
    /* ignore */
  }
});

test('health reports a running server', async () => {
  const h = await client.health();
  expect(h.ok).toBe(true);
});

test('full off-chain loan flow: submit → match → settle → repay → dashboards', async () => {
  // 1. Alice lends, Bob borrows (matching amounts).
  const lend = await client.submitLend('alice', 1_000_000_000n, 500);
  const borrow = await client.submitBorrow('bob', 1_000_000_000n, 800, 1_500_000_000n);
  expect(lend.intentId).toMatch(/^lend_/);
  expect(borrow.intentId).toMatch(/^borrow_/);

  // 2. The running server's auction matches them within a couple of epochs.
  let loanId = '';
  await waitFor(async () => {
    const { loans } = await client.listMatches('alice');
    if (loans.length > 0) {
      loanId = loans[0].loanId;
      return true;
    }
    return false;
  });
  expect(loanId).toBeTruthy();

  // 3. Lender settles (records the real txId).
  const settled = await client.confirmSettlement(loanId, '0xE2Etx');
  expect(settled.loan.status).toBe('active');
  expect(settled.loan.settlementTxId).toBe('0xE2Etx');

  // 4. Borrower repays.
  const repaid = await client.repayLoan(loanId, '0xE2Erepay');
  expect(repaid.loan.status).toBe('repaid');

  // 5. Next.js dashboard endpoints reflect the completed loan.
  const lenderStatus = await (await fetch(`${BASE}/api/v1/lender-status/alice`)).json();
  expect(lenderStatus.completedLoans.length).toBe(1);
  expect(lenderStatus.activeLoans.length).toBe(0);

  const credit = await (await fetch(`${BASE}/api/v1/credit-score/bob`)).json();
  expect(credit.loansRepaid).toBe(1);
  expect(credit.tier).toBe('bronze');
});

test('CORS headers are present for browser callers', async () => {
  const res = await fetch(`${BASE}/health`);
  expect(res.headers.get('access-control-allow-origin')).toBe('*');
});
