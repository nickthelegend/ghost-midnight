import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as os from 'node:os';
import * as path from 'node:path';
import { runEpoch } from './matching.js';
import * as store from './store.js';

let counter = 0;
function freshStore() {
  counter += 1;
  initFile = path.join(os.tmpdir(), `ghost-matching-test-${process.pid}-${counter}.json`);
  store.initStore(initFile);
}
let initFile = '';

test('matches a lend and borrow at the clearing rate (no split)', () => {
  freshStore();
  store.createLend({ intentId: 'l1', lender: 'alice', amount: '1000', rMin: 500 });
  store.createBorrow({
    intentId: 'b1',
    borrower: 'bob',
    amount: '1000',
    rMax: 800,
    collateral: '1500',
  });

  runEpoch();

  const loans = store.findAllLoans();
  assert.equal(loans.length, 1, 'one loan should be created');
  assert.equal(loans[0].principal, '1000');
  assert.equal(loans[0].lender, 'alice');
  assert.equal(loans[0].borrower, 'bob');
  // r* must sit within [rMin, rMax]
  assert.ok(loans[0].rate >= 500 && loans[0].rate <= 800, `rate ${loans[0].rate} in band`);
});

test('does NOT match when the rate bands do not cross', () => {
  freshStore();
  store.createLend({ intentId: 'l1', lender: 'alice', amount: '1000', rMin: 900 });
  store.createBorrow({
    intentId: 'b1',
    borrower: 'bob',
    amount: '1000',
    rMax: 800,
    collateral: '1500',
  });

  runEpoch();
  assert.equal(store.findAllLoans().length, 0, 'no loan when rMin > rMax');
});

test('v0 matches at the borrow amount when a lender over-covers (no partial fill of the lender)', () => {
  freshStore();
  store.createLend({ intentId: 'l1', lender: 'alice', amount: '1000', rMin: 500 });
  store.createBorrow({
    intentId: 'b1',
    borrower: 'bob',
    amount: '400',
    rMax: 800,
    collateral: '600',
  });

  runEpoch();
  const loans = store.findAllLoans();
  assert.equal(loans.length, 1);
  assert.equal(loans[0].principal, '400', 'principal is the borrow amount');
});

test('leaves both intents matched (not re-matchable) after an epoch', () => {
  freshStore();
  store.createLend({ intentId: 'l1', lender: 'alice', amount: '1000', rMin: 500 });
  store.createBorrow({
    intentId: 'b1',
    borrower: 'bob',
    amount: '1000',
    rMax: 800,
    collateral: '1500',
  });

  runEpoch();
  runEpoch(); // second epoch must not create a duplicate loan
  assert.equal(store.findAllLoans().length, 1, 'no double-match across epochs');
});
