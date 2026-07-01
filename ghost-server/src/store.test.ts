import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as os from 'node:os';
import * as path from 'node:path';
import * as store from './store.js';

let seq = 0;
beforeEach(() => {
  seq += 1;
  store.initStore(path.join(os.tmpdir(), `ghost-store-test-${process.pid}-${seq}.json`));
});

test('initStore starts empty and isolates state', () => {
  assert.equal(store.findAllLends().length, 0);
  assert.equal(store.findAllBorrows().length, 0);
  assert.equal(store.findAllLoans().length, 0);
});

test('lend intent lifecycle: create → open → matched', () => {
  const l = store.createLend({ intentId: 'l1', lender: 'alice', amount: '1000', rMin: 500 });
  assert.equal(l.status, 'open');
  assert.equal(store.countOpenLends(), 1);
  assert.equal(store.findLendsByAddr('alice').length, 1);
  assert.equal(store.findLendsByAddr('nobody').length, 0);

  store.markLendMatched('l1', 'loan1');
  assert.equal(store.countOpenLends(), 0);
  assert.equal(store.findOpenLendsSortedByRMin().length, 0);
});

test('cancel only affects open intents', () => {
  store.createLend({ intentId: 'l1', lender: 'alice', amount: '1000', rMin: 500 });
  assert.ok(store.cancelLend('l1'));
  assert.equal(store.cancelLend('l1'), null); // already cancelled
  assert.equal(store.cancelLend('missing'), null);
});

test('open lends sort ascending by rMin; borrows descending by rMax', () => {
  store.createLend({ intentId: 'l1', lender: 'a', amount: '1', rMin: 700 });
  store.createLend({ intentId: 'l2', lender: 'b', amount: '1', rMin: 300 });
  assert.deepEqual(
    store.findOpenLendsSortedByRMin().map((l) => l.rMin),
    [300, 700],
  );
  store.createBorrow({ intentId: 'b1', borrower: 'c', amount: '1', rMax: 400, collateral: '2' });
  store.createBorrow({ intentId: 'b2', borrower: 'd', amount: '1', rMax: 900, collateral: '2' });
  assert.deepEqual(
    store.findOpenBorrowsSortedByRMaxDesc().map((b) => b.rMax),
    [900, 400],
  );
});

test('loan settle → repay lifecycle + guards', () => {
  store.createLoan({
    loanId: 'loan1',
    lender: 'alice',
    borrower: 'bob',
    principal: '1000',
    rate: 500,
    lendIntentId: 'l1',
    borrowIntentId: 'b1',
  });
  // repay before settle → not active → null
  assert.equal(store.repayLoan('loan1'), null);

  const settled = store.settleLoan('loan1', '0xtx');
  assert.equal(settled?.status, 'active');
  assert.equal(store.settleLoan('loan1', '0xtx'), null); // not awaiting anymore

  const repaid = store.repayLoan('loan1', '0xrepay');
  assert.equal(repaid?.status, 'repaid');
  assert.equal(repaid?.repaymentTxId, '0xrepay');
});

test('liquidate only works on active loans', () => {
  store.createLoan({
    loanId: 'loan1',
    lender: 'alice',
    borrower: 'bob',
    principal: '1000',
    rate: 500,
    lendIntentId: 'l1',
    borrowIntentId: 'b1',
  });
  assert.equal(store.liquidateLoan('loan1'), null); // awaiting-settlement
  store.settleLoan('loan1', '0xtx');
  assert.equal(store.liquidateLoan('loan1')?.status, 'liquidated');
});

test('credit stats derive from borrow history', () => {
  const mk = (id: string, borrower: string) =>
    store.createLoan({
      loanId: id,
      lender: 'alice',
      borrower,
      principal: '1000',
      rate: 500,
      lendIntentId: 'l',
      borrowIntentId: 'b',
    });
  mk('r1', 'bob');
  store.settleLoan('r1', 'x');
  store.repayLoan('r1');
  mk('r2', 'bob');
  store.settleLoan('r2', 'x');
  store.liquidateLoan('r2');

  const c = store.creditStatsForAddr('bob');
  assert.equal(c.loansRepaid, 1);
  assert.equal(c.loansDefaulted, 1);
  assert.equal(store.creditStatsForAddr('nobody').loansRepaid, 0);
});

test('active vs completed loan partitioning', () => {
  store.createLoan({ loanId: 'a', lender: 'alice', borrower: 'x', principal: '1', rate: 1, lendIntentId: 'l', borrowIntentId: 'b' });
  store.createLoan({ loanId: 'b', lender: 'alice', borrower: 'y', principal: '1', rate: 1, lendIntentId: 'l', borrowIntentId: 'b' });
  store.settleLoan('a', 'x'); // active
  store.settleLoan('b', 'x');
  store.repayLoan('b'); // completed

  assert.deepEqual(store.findActiveLoansForAddr('alice').map((l) => l.loanId), ['a']);
  assert.deepEqual(store.findCompletedLoansForAddr('alice').map((l) => l.loanId), ['b']);
});
