import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as os from 'node:os';
import * as path from 'node:path';
import { routes } from './routes.js';
import { runEpoch } from './matching.js';
import * as store from './store.js';

let seq = 0;
beforeEach(() => {
  seq += 1;
  store.initStore(path.join(os.tmpdir(), `ghost-routes-test-${process.pid}-${seq}.json`));
});

// ── helpers ──
const get = (p: string) => routes.request(p);
const post = (p: string, body?: unknown) =>
  routes.request(p, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

test('GET /health returns pool address + counts', async () => {
  const res = await get('/health');
  assert.equal(res.status, 200);
  const body = (await res.json()) as any;
  assert.equal(body.ok, true);
  assert.ok('poolAddress' in body);
  assert.deepEqual(body.openIntents, { lend: 0, borrow: 0 });
});

test('POST /intents/lend validates input', async () => {
  assert.equal((await post('/api/v1/intents/lend', {})).status, 400);
  assert.equal(
    (await post('/api/v1/intents/lend', { lender: 'a', amount: '0', rMin: 500 })).status,
    400,
  );
  assert.equal(
    (await post('/api/v1/intents/lend', { lender: 'a', amount: '100', rMin: 999999 })).status,
    400,
  );
  const ok = await post('/api/v1/intents/lend', { lender: 'alice', amount: '1000', rMin: 500 });
  assert.equal(ok.status, 201);
  assert.match((await ok.json() as any).intentId, /^lend_/);
});

test('POST /intents/borrow validates input', async () => {
  assert.equal((await post('/api/v1/intents/borrow', {})).status, 400);
  const ok = await post('/api/v1/intents/borrow', {
    borrower: 'bob',
    amount: '1000',
    rMax: 800,
    collateral: '1500',
  });
  assert.equal(ok.status, 201);
});

test('GET /internal/pending-intents lists open intents (client explore)', async () => {
  await post('/api/v1/intents/lend', { lender: 'alice', amount: '1000', rMin: 500 });
  await post('/api/v1/intents/borrow', { borrower: 'bob', amount: '1000', rMax: 800, collateral: '1500' });
  const body = (await (await get('/api/v1/internal/pending-intents')).json()) as any;
  assert.equal(body.lendIntents.length, 1);
  assert.equal(body.borrowIntents.length, 1);
});

test('cancel intent', async () => {
  const { intentId } = (await (
    await post('/api/v1/intents/lend', { lender: 'alice', amount: '1000', rMin: 500 })
  ).json()) as any;
  const res = await post(`/api/v1/intents/${intentId}/cancel`);
  assert.equal(res.status, 200);
  assert.equal((await res.json() as any).kind, 'lend');
  // second cancel → 404
  assert.equal((await post(`/api/v1/intents/${intentId}/cancel`)).status, 404);
});

test('FULL LIFECYCLE: submit → match → settle → repay → status/credit reflect it', async () => {
  // 1. submit matching intents
  await post('/api/v1/intents/lend', { lender: 'alice', amount: '1000', rMin: 500 });
  await post('/api/v1/intents/borrow', { borrower: 'bob', amount: '1000', rMax: 800, collateral: '1500' });

  // 2. run the auction
  runEpoch();

  // 3. loan appears for both parties, awaiting settlement
  const matches = (await (await get('/api/v1/matches/alice')).json()) as any;
  assert.equal(matches.loans.length, 1);
  const loan = matches.loans[0];
  assert.equal(loan.status, 'awaiting-settlement');
  assert.equal(loan.principal, '1000');

  // 4. lender settles
  const settled = (await (
    await post(`/api/v1/loans/${loan.loanId}/settle`, { txId: '0xrealtx' })
  ).json()) as any;
  assert.equal(settled.loan.status, 'active');
  assert.equal(settled.loan.settlementTxId, '0xrealtx');

  // 5. borrower repays
  const repaid = (await (
    await post(`/api/v1/loans/${loan.loanId}/repay`, { txId: '0xrepaytx' })
  ).json()) as any;
  assert.equal(repaid.loan.status, 'repaid');

  // 6. client dashboards reflect the completed loan
  const lender = (await (await get('/api/v1/lender-status/alice')).json()) as any;
  assert.equal(lender.completedLoans.length, 1);
  assert.equal(lender.activeLoans.length, 0);

  const borrower = (await (await get('/api/v1/borrower-status/bob')).json()) as any;
  assert.equal(borrower.completedLoans.length, 1);

  // 7. reputation updated
  const credit = (await (await get('/api/v1/credit-score/bob')).json()) as any;
  assert.equal(credit.loansRepaid, 1);
  assert.equal(credit.loansDefaulted, 0);
  assert.equal(credit.tier, 'bronze');
});

test('liquidation path: active loan → liquidated → counts as default', async () => {
  await post('/api/v1/intents/lend', { lender: 'alice', amount: '1000', rMin: 500 });
  await post('/api/v1/intents/borrow', { borrower: 'carol', amount: '1000', rMax: 800, collateral: '1500' });
  runEpoch();
  const { loans } = (await (await get('/api/v1/matches/alice')).json()) as any;
  const id = loans[0].loanId;
  await post(`/api/v1/loans/${id}/settle`, { txId: '0xtx' });

  const liq = await post(`/api/v1/loans/${id}/liquidate`);
  assert.equal(liq.status, 200);
  assert.equal((await liq.json() as any).loan.status, 'liquidated');

  const credit = (await (await get('/api/v1/credit-score/carol')).json()) as any;
  assert.equal(credit.loansDefaulted, 1);
});

test('repay/liquidate on a non-existent loan → 404', async () => {
  assert.equal((await post('/api/v1/loans/nope/repay')).status, 404);
  assert.equal((await post('/api/v1/loans/nope/liquidate')).status, 404);
});
