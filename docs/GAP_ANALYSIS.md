# GHOST Finance — Gap Analysis

_Last updated: 2026-07-01. A deep audit of every component (cli, server,
contract, deploy, both frontends, docs), with severity and a prioritized
roadmap. Items fixed in the latest pass are marked **✅ DONE**; the rest are
**TODO**. Each TODO is tagged **[local]** (code/doc-only, no Midnight infra) or
**[infra]** (needs a Midnight node / proof server / `compactc` / preprod)._

See [STATE_OF_THE_PROJECT.md](./STATE_OF_THE_PROJECT.md) for the "what runs
today" map.

---

## 0. Critical — security

- **✅ DONE — Committed MongoDB Atlas credential.** `ghost-server/.env` shipped a
  live Atlas connection string (`sounakdey2468_db_user:…@cluster0`). The working
  tree secret has been removed, `.env` is now gitignored, and `.env.example`
  carries only placeholders. **⚠️ You must still: (1) rotate that DB password now
  — it is in the public git history; (2) purge it from history (`git filter-repo`
  / BFG) and force-push.** MongoDB is unused in v0 (JSON store), so nothing breaks.
- **TODO [local] — Committed wallet state.** `deploy-preprod/midnight-level-db/`
  (LevelDB `.ldb`/`.log`) is checked in because `.gitignore` lists
  `.midnight-level-db/` (leading dot) but the real dir has no dot. Fix the pattern
  and `git rm -r --cached` the directory.
- **TODO [local] — Mnemonic at rest.** `ghost-cli` writes the plaintext mnemonic
  to `~/.ghost/wallet.json` with no encryption or `0600` perms. Harden for a
  finance app.

---

## 1. Integration & wiring (the components don't connect)

- **✅ DONE — client ↔ server API mismatch.** The Next.js `client` called
  `/api/v1/lender-status`, `/borrower-status`, `/credit-score`, and
  `/internal/pending-intents` — none of which existed on `ghost-server` (they were
  part of a deleted EVM backend). All four are now implemented against the v0 JSON
  store and verified end-to-end. The client's read layer works against the server.
- **✅ DONE — CORS.** `ghost-server` had no CORS headers, so every browser fetch
  from `client` (:3000) and `ghost-frontend` (:3007) was blocked. `hono/cors` is
  now enabled.
- **✅ DONE — missing loan lifecycle endpoints.** Added
  `POST /api/v1/loans/:id/repay` and `/liquidate` plus `repaid`/`liquidated` loan
  states and a reputation derivation (`credit-score`). Full
  submit→match→settle→repay flow now works over HTTP.
- **✅ DONE — client API rewrite pointed at itself.** `next.config.ts` proxied
  `/api/v1/*` to `http://localhost:3000` (the client's own port) instead of the
  server. Now points at `GHOST_API_ORIGIN` (default `:8080`).
- **TODO [infra] — CLI never calls the contract.** The headline gap. `ghost-cli`
  settles via a wallet-to-wallet transfer and never touches a circuit. The circuit
  wrappers exist in `ghost-cli/src/api.ts` but are dead code. Wiring them is
  code-work; exercising them needs localnet + proof server.
- **TODO [local] — placeholder settlement txId.** `ghost-cli/src/index.ts:230`
  posts `settled_${Date.now()}`. `sendUnshieldedTransfer` discards the real
  transaction id (`wallet-api.ts:226`). Thread the real id through.
- **TODO [local] — pick one frontend.** `ghost-frontend` (contract-native) and
  `client` (server-native) overlap. Choose the canonical one for v1 and archive or
  clearly scope the other.

---

## 2. Contract soundness (`ghost.compact`) — [infra] to fix & verify

The contract compiles, unit-tests the happy path, and deploys — but as a
_protocol_ it is not yet sound. These need the Compact toolchain + a proof server
to change and re-verify, so they are documented, not patched, in this pass.

- **Commit-reveal is not cryptographically bound.** `reveal_lend`/`reveal_borrow`
  only check that the commitment _exists_ (`lend_commits.member(dc)`), never that
  `sha256(amount‖rate‖nonce‖owner)` equals it. The compiled contract contains zero
  hash calls. A revealer can open any commitment to arbitrary values. Fix: hash on
  chain with `persistentHash` and `assert(reconstructed == stored)`.
- **Everything is `disclose()`d.** All bid fields are written to public `export
  ledger` maps at reveal. Even with binding fixed, this is a _public_ auction with
  a commit delay, not a sealed-bid one.
- **`settle` can double-spend lend capacity.** Bid `amount` is never decremented,
  so one 5,000 lend bid can be settled to borrower A _and_ B. Also no self-match
  guard (`lbid.owner != bbid.owner`).
- **Interest is unenforceable.** `repay` accepts any `total_due >= principal`;
  `loan.rate` is never used in arithmetic. A borrower can repay principal-only.
- **No liquidation.** No liquidation circuit, health factor, or oracle; the 150%
  collateral check is decorative — nothing ever seizes collateral.
- **Multi-epoch state corruption.** `advance_phase` resets `loan_count = 0` on
  rollover while the `loans` map persists — next epoch overwrites loan ids 0,1,…
  and orphans unpaid loans; bid/commit maps are never cleared either.
- **Plaintext custody.** `balances` is a plain map keyed by a caller-supplied
  `Bytes<32>`; `deposit`/`withdraw`/`repay` never prove the caller controls
  `owner`. Move custody to real shielded tokens.
- **8-bid hard cap** (`< 8` lend/borrow) reverts silently on the 9th bidder.

---

## 3. Per-component gaps

### ghost-cli — [mostly local]
- Stale build artifact: `dist/index.js` is an older, contract-based program;
  `README` says `node dist/index.js` but `src/index.ts` is server-based. Rebuild
  or fix docs.
- `deploy-preprod.ts` can't build: `tsconfig.json` excludes `api.ts` which it
  imports.
- Hardcoded all-zeros admin/operator key (`new Uint8Array(32)`).
- Input validation: `handleBorrow` doesn't enforce the 150% collateral rule it
  advertises; `BigInt`/`Number` parses throw/NaN on junk input.
- Port drift: `config.ts` uses indexer `:8087`; README says `:8088`.
- No timeout/retry in the HTTP client; settlement can desync if `confirmSettlement`
  fails after the transfer succeeds.

### ghost-server — [local]
- **✅ DONE:** CORS, status endpoints, repay/liquidate, poolAddress in `/health`.
- TODO: unit tests for the matching engine (see §4); no auth on any route (fine
  for a demo, note it); collateral accepted but never validated against amount.

### ghost-contract / deploy-preprod — [infra]
- `repay` has no test coverage; the "clearing" test only asserts `loan_count > 0`.
- Deploy script deploys but never smoke-tests a circuit (no post-deploy
  `advance_phase`/`deposit`), so a green deploy can hide broken circuits.
- Three copies of `managed/ghost` kept in sync by a manual `cp -r`; will drift.
- Pragma `>= 0.20` is looser than the `0.22`/compiler `0.30` actually used.

### Frontends — [local]
- **✅ DONE:** both restyled to one black+orange identity; `client` now builds
  clean and reads real server data; `ghost-frontend` has a full demo mode.
- TODO: `ghost-frontend` operator settlement is hand-typed (no clearing
  automation on the on-chain path); `client` write actions still throw / are stubs.

---

## 4. Testing & CI — [local]

- Only one test file in the repo (`ghost-contract/src/test/ghost.test.ts`). **No
  CI.** The matching engine — the one non-trivial piece of live logic — is
  untested.
- **TODO:** add unit tests for `ghost-server/src/matching.ts` (clearing-rate
  argmax, greedy pairing, no-partial-fill edges) and a GitHub Actions workflow
  that typechecks + tests each workspace.

---

## 5. Documentation — [local]

- **✅ DONE:** this file, [STATE_OF_THE_PROJECT.md](./STATE_OF_THE_PROJECT.md),
  and a README for the previously-undocumented `ghost-frontend`.
- TODO: several docs are stale — `current-flow.md`/`midnight-todo.md` claim EVM
  imports (`usePrivy`/`ethers`) still exist in `client` (already removed);
  `v0-architecture.md` shows MongoDB as the live store (it's the JSON store);
  `MIGRATION_NOTES.md` references an SDK "v2" and a `midrun` project not in this
  repo. Setup instructions point at a sibling `../midnight-local-dev` repo not in
  this tree. A threat model / privacy analysis is missing despite "privacy" being
  the headline.

---

## Prioritized roadmap for the resubmission

**Do first (highest judge impact):**
1. ✅ Rotate + purge the leaked DB credential _(rotation is still on you)_.
2. ✅ Make the `client` actually work against `ghost-server` (endpoints + CORS).
3. ✅ One honest "state of the project" doc.
4. **[infra]** Wire and record _one_ real on-chain path (CLI: deposit→submit→reveal→settle→repay against preprod) — this converts the project from off-chain demo to on-chain privacy lending.
5. **[local]** Resolve the SDK `@3/ledger-v7` ↔ `@4/ledger-v8` split and document the version matrix.

**Then:**
6. **[local]** Fix the multi-epoch `loan_count` reset bug + add a multi-epoch test.
7. **[local]** Test `matching.ts` + add CI.
8. **[local]** Port the server's clearing algorithm into an operator script so the on-chain `settle` isn't hand-typed.
9. **[local]** Decide `client` vs `ghost-frontend`; scope the other.

**Housekeeping:**
10. Untrack `deploy-preprod/midnight-level-db/`; reconcile stale docs; fix port drift; harden mnemonic storage.
