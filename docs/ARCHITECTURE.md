# GHOST Finance — Architecture

Privacy-preserving, sealed-bid peer-to-peer lending on **Midnight Network**.
GHOST runs on two planes:

1. **Off-chain v0 (works today):** an intent-matching server runs a uniform
   clearing-rate auction; the CLI and the Next.js client talk to it over HTTP.
2. **On-chain (target):** a Compact ZK contract implements the same sealed-bid
   auction with commitments, so amounts/rates stay private until reveal.

See [STATE_OF_THE_PROJECT.md](./STATE_OF_THE_PROJECT.md) for what is wired today
and [GAP_ANALYSIS.md](./GAP_ANALYSIS.md) for what remains.

---

## System diagram

```
                         ┌──────────────────────────────┐
                         │        ghost-server          │
   ghost-cli  ──HTTP──▶  │  Hono API + JSON store       │  ◀──HTTP──  client
   (Node CLI wallet)     │  clearing-rate auction (5s)  │            (Next.js)
        │                └──────────────┬───────────────┘                │
        │ wallet→wallet                 │ reads: lender/borrower-status,  │
        │ NIGHT transfer                │ credit-score, pending-intents   │
        ▼                               ▼                                 ▼
  Midnight wallet              in-memory + ghost-data.json         dashboard UI

  ─────────────────────────  on-chain plane (target)  ─────────────────────────

   ghost-frontend  ──Lace / indexer / proof server──▶  Compact contract
   (Vite dApp)          reads ledger via GraphQL          (ghost.compact)
                        submits circuits w/ ZK proofs      4-phase auction
```

---

## Components

| Component | Stack | Role |
|---|---|---|
| `ghost-cli` | Node + TS | HD-mnemonic wallet; posts lend/borrow intents, settles loans; `GhostServerClient` is the typed HTTP client |
| `ghost-server` | Hono + JSON store | Intent book + uniform clearing-rate auction (every `EPOCH_MS`); intent lifecycle + client dashboard APIs |
| `ghost-contract` | Compact (ZK) | Sealed-bid batch-auction contract → compiles to 9 circuits with prover/verifier keys |
| `deploy-preprod` | Midnight SDK v4 | Deploys the contract to preprod / localnet |
| `ghost-frontend` | Vite + React | Contract-native dApp (reads the ledger, submits circuits via Lace) |
| `client` | Next.js 16 | Server-native dashboard (reads `ghost-server`) |
| `midnight-localnet` | Docker Compose | node + indexer + proof server for local development |
| `e2e` | bun test | End-to-end: real CLI client ↔ real server |

---

## Off-chain data flow (the working path)

```
1. POST /api/v1/intents/lend    { lender, amount, rMin }          → intentId
2. POST /api/v1/intents/borrow  { borrower, amount, rMax, collateral } → intentId
3. every EPOCH_MS: runEpoch()
     supply(r) = Σ lend.amount  where rMin ≤ r
     demand(r) = Σ borrow.amount where rMax ≥ r
     r* = argmax min(supply, demand)     ← uniform clearing rate
     greedy-pair lends × borrows at r*   → Loan{ awaiting-settlement }
4. GET  /api/v1/matches/:addr                                     → loans
5. lender does the NIGHT transfer, then
   POST /api/v1/loans/:id/settle  { txId }                        → active
6. POST /api/v1/loans/:id/repay   { txId }                        → repaid
   (or POST /api/v1/loans/:id/liquidate                           → liquidated)
```

Reputation (`/credit-score/:addr`) is derived from repaid vs liquidated loans;
it drives the collateral multiplier surfaced to the client.

Matching algorithm: [`ghost-server/src/matching.ts`](../ghost-server/src/matching.ts).
v0 does not split intents — each created loan is a clean 1:1 pair at r*.

---

## On-chain contract — sealed-bid batch auction

[`ghost-contract/src/ghost.compact`](../ghost-contract/src/ghost.compact) cycles
each epoch through four phases (`advance_phase`, operator-gated):

```
  BID (0)  ──▶  REVEAL (1)  ──▶  CLEAR (2)  ──▶  ACTIVE (3)  ──▶ (next epoch)
 submit_lend    reveal_lend      settle          repay
 submit_borrow  reveal_borrow    (per pair)      (per loan)
 (commitments)  (open bids)      at clearing r
```

Nine circuits: `deposit`, `withdraw`, `submit_lend`, `submit_borrow`,
`reveal_lend`, `reveal_borrow`, `settle`, `repay`, `advance_phase`. Each compiles
to a prover key + verifier key + zkIR under `src/managed/ghost/`.

The privacy model (target): a bid is a commitment
`hash(amount ‖ rate ‖ nonce ‖ owner)` submitted in BID; the figures are only
opened in REVEAL. (Known soundness gaps in the current v0 contract — commitment
binding, `disclose()` leakage, `settle` double-spend, interest enforcement — are
tracked in [GAP_ANALYSIS.md](./GAP_ANALYSIS.md) §2.)

---

## Testing strategy

| Layer | Where | What |
|---|---|---|
| Unit | `ghost-server/src/store.test.ts` | store CRUD, loan lifecycle, credit stats |
| Unit | `ghost-server/src/matching.test.ts` | clearing-rate auction, pairing, no double-match |
| Integration | `ghost-server/src/routes.test.ts` | every HTTP endpoint via `app.request()`, full lifecycle |
| Contract | `ghost-contract/src/test/ghost.test.ts` | 8 simulator tests (deposit → reveal → settle) |
| E2E | `e2e/full-flow.test.ts` | real `GhostServerClient` ↔ real server over HTTP |

```bash
cd ghost-server  && npm test     # 20 unit + integration tests
cd ghost-contract && npm test     # 8 simulator tests
cd e2e           && bun test      # 3 e2e tests (spawns the server)
```

CI runs the server suite, the e2e suite, and the client build on every push
([.github/workflows/ci.yml](../.github/workflows/ci.yml)).

---

## Local dev environment

- **Compact compiler** `0.30.0` (`compact update 0.30.0`) — compiles the contract
  to ZK artifacts.
- **Localnet** — `docker compose -f midnight-localnet/docker-compose.yml up -d`
  brings up node (`:9944`), indexer (`:8087`), proof server (`:6300`). See
  [midnight-localnet/README.md](../midnight-localnet/README.md).
