# GHOST Finance — State of the Project

_Last updated: 2026-07-01. This is the honest, single source of truth for what
runs today versus what is designed but not yet wired. Where other docs disagree
with this file, this file is correct._

GHOST is privacy-preserving, sealed-bid peer-to-peer lending on **Midnight
Network**. The repo currently contains **three components that target three
different architectures**, and only one path runs end-to-end. This document maps
them so a reviewer can tell the working demo from the design vision.

---

## TL;DR

- **What works end-to-end today:** the CLI ⇄ intent-matching server ⇄ wallet-to-wallet NIGHT transfer loop, on localnet. This is an **off-chain v0 demo** — no ZK, no on-chain escrow in the live path.
- **What exists but is not wired into a working path:** the on-chain sealed-bid Compact contract (compiled, tested happy-path, deployed to preprod) and the contract-native `ghost-frontend`.
- **The headline gap:** the CLI settles funds with a plain wallet transfer and never calls the smart contract. On-chain escrow is the next milestone; the blocker is an SDK/ledger version split (see below).

---

## Verified runnable (2026-07)

The local dev environment and test suites are set up and pass:

- **Compact compiler `0.30.0`** installed; `ghost-contract` **compiles to 9 ZK
  circuits** and its **8 simulator tests pass**.
- **Localnet** (`midnight-localnet/`) boots node + indexer + proof server;
  all three verified healthy.
- **Test suites:** `ghost-server` 20 (unit + integration), `e2e` 3 (real CLI
  client ↔ real server), `ghost-contract` 8. **31 tests, all green.** CI runs the
  server + e2e + client build.
- **On-chain readiness:** the compiled contract **loads under the v4 deploy SDK**
  (`deploy-preprod && npm run verify-contract`) — the WASM-duplication trap is
  cleared. Deploy is now env-driven: `npm run deploy:localnet` targets the local
  stack; `npm run deploy` targets preprod.
- **Still manual/next:** funding the deployer wallet on localnet (no faucet — use
  a genesis account or the preprod faucet), and resolving the SDK `@3↔@4` split so
  the CLI/frontend can *call* the deployed contract (see GAP_ANALYSIS §1).

---

## Component map

| Component | Stack | Talks to | Runs today? | How to run |
|---|---|---|---|---|
| [ghost-cli](../ghost-cli) | Node + TS, SDK `midnight-js@3` / `ledger-v7` | `ghost-server` (HTTP) + Lace wallet (transfers) | ✅ Yes (localnet) | `npm i && npm run build && node dist/index.js` |
| [ghost-server](../ghost-server) | Hono + JSON store | called by `ghost-cli` and `client` | ✅ Yes | `npm i && npm run dev` → `:8080` |
| [ghost-contract](../ghost-contract) | Compact (Plutus-style ZK) | (deployed; not called by a live path) | ⚠️ Compiles, tests, deploys — but nothing exercises it live | `npm test` (simulator) |
| [deploy-preprod](../deploy-preprod) | Node, SDK `midnight-js@4` / `ledger-v8` | Midnight preprod + proof server | ✅ Deploy only | see its README |
| [ghost-frontend](../ghost-frontend) | Vite + React 18, SDK `midnight-js@3` | Midnight indexer + proof server + contract (via Lace) | ✅ UI runs; **demo mode by default** | `npm run dev` → `:3007` |
| [client](../client) | Next.js 16 + React 19 | `ghost-server` status endpoints | ✅ UI runs; read data via server | `bun run dev` → `:3000` |

---

## The one path that works end-to-end (v0, off-chain)

```
Alice (ghost-cli)                 ghost-server                    Bob (ghost-cli)
   │  POST /intents/lend  ───────────▶  JSON store                     │
   │                                    │  (5s clearing-rate auction)   │
   │                                    │◀─────── POST /intents/borrow  │
   │                                    │  match → Loan{awaiting}       │
   │  GET /matches/:addr ◀──────────────┤─────────▶ GET /matches/:addr  │
   │  (lender settles)                  │                               │
   │  wallet→wallet NIGHT transfer ─────┼──────────────────▶ Bob's wallet
   │  POST /loans/:id/settle ──────────▶│  Loan{active}                 │
```

Every part of this is real: HD mnemonic wallet, DUST registration for fees,
unshielded NIGHT transfers, and the uniform clearing-rate matching engine
([ghost-server/src/matching.ts](../ghost-server/src/matching.ts)). What it is
**not**: private (the server sees amounts/rates in plaintext) or on-chain
(settlement is a bank transfer, not a contract call).

---

## The two frontends (why there are two)

- **`ghost-frontend`** is the contract-native UI: it reads the GHOST ledger
  directly from the Midnight indexer and submits circuit calls through Lace. It
  has the richer feature set (sealed-bid composer, reveal queue, order book,
  operator console). It ships with **`VITE_DEMO=1` on by default**, so out of the
  box it renders representative data with no wallet/localnet needed. Set
  `VITE_DEMO=0` and `VITE_CONTRACT_ADDRESS=<addr>` to go live.
- **`client`** is a Next.js dashboard that reads state from `ghost-server`'s
  status endpoints. Its write actions are not yet wired to Midnight.

**Recommendation:** pick one as the canonical frontend for v1. `ghost-frontend`
is closer to the on-chain vision; `client` is the nicer general dashboard shell.

---

## Accurate API surface (`ghost-server`)

Base URL `http://localhost:8080`. CORS is enabled for browser callers.

**Intent / loan lifecycle (used by `ghost-cli`):**
- `GET  /health` → `{ ok, poolAddress, openIntents, activeLoans }`
- `POST /api/v1/intents/lend` → `{ intentId }`
- `POST /api/v1/intents/borrow` → `{ intentId }`
- `POST /api/v1/intents/:id/cancel` → `{ ok, kind }`
- `GET  /api/v1/intents` → `{ lends, borrows, loans }`
- `GET  /api/v1/intents/by/:addr` → `{ lends, borrows }`
- `GET  /api/v1/matches/:addr` → `{ loans }`
- `POST /api/v1/loans/:id/settle` → `{ ok, loan }`
- `POST /api/v1/loans/:id/repay` → `{ ok, loan }`  _(added — loan lifecycle)_
- `POST /api/v1/loans/:id/liquidate` → `{ ok, loan }`  _(added — operator)_

**Dashboard / status (used by `client`):**
- `GET /api/v1/lender-status/:address`
- `GET /api/v1/borrower-status/:address`
- `GET /api/v1/credit-score/:address`
- `GET /api/v1/internal/pending-intents`

> Note: the `client` was originally coded against these four status endpoints,
> which did not exist on the server (they were part of a removed EVM backend).
> They are now implemented against the v0 JSON store, so the client's read layer
> works against `ghost-server`.

---

## Known gaps & risks

See **[GAP_ANALYSIS.md](./GAP_ANALYSIS.md)** for the full prioritized list. The
highest-severity items:

1. **Security:** a MongoDB Atlas credential was committed in `ghost-server/.env`.
   It has been removed from the working tree and `.env` is now gitignored, **but
   it remains in git history on the public remote — rotate that password now and
   purge it from history.**
2. **On-chain escrow not wired:** the CLI never calls the contract; settlement is
   a wallet transfer with a placeholder txId. Blocked by the SDK version split.
3. **SDK/ledger skew:** the contract was deployed with `midnight-js@4 / ledger-v8`,
   but the CLI and `ghost-frontend` that must call it run `@3 / ledger-v7`.
   Aligning these is the prerequisite for a real on-chain path.
4. **Contract soundness (v0):** commit-reveal is not cryptographically bound
   on-chain, all bid fields are `disclose()`d, `settle` can double-spend lend
   capacity, interest is not enforced, there is no liquidation circuit, and the
   epoch reset corrupts multi-epoch loan records. These are design-level and need
   the Compact toolchain + localnet to fix and verify.
