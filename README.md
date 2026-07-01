# GHOST Finance on Midnight

Privacy-preserving peer-to-peer lending on Midnight Network. Lenders and borrowers post intents to an off-chain matching server; matches settle as direct wallet-to-wallet NIGHT transfers via a mnemonic-based CLI wallet.

> **Status:** CLI wallet + intent matching loop work end-to-end on localnet. On-chain contract escrow is **going to be implemented in the next milestone**.

> 📍 **Start here:** [docs/STATE_OF_THE_PROJECT.md](docs/STATE_OF_THE_PROJECT.md)
> is the honest "what actually runs today" map, and
> [docs/GAP_ANALYSIS.md](docs/GAP_ANALYSIS.md) is the full prioritized audit.

> 🔐 **Security:** a MongoDB credential was previously committed in
> `ghost-server/.env`. It has been removed and `.env` is now gitignored, but it
> remains in git history on the public remote — **rotate that password and purge
> it from history.** MongoDB is unused in v0 (JSON store), so nothing breaks.

## Components

| Path | Role |
|---|---|
| [ghost-cli/](ghost-cli/) | Mnemonic CLI wallet — sends NIGHT, posts lend/borrow intents, polls matches, settles loans |
| [ghost-server/](ghost-server/) | Intent matching backend (Hono + JSON store) — clearing-rate auction every 5s, dashboard + loan-lifecycle endpoints, CORS |
| [ghost-contract/](ghost-contract/) | Compact smart contract (lend/borrow/match circuits) — compiled, not yet wired to CLI |
| [deploy-preprod/](deploy-preprod/) | Preprod deployment script (SDK 4.x, real proof server) |
| [ghost-frontend/](ghost-frontend/) | Contract-native Vite dApp — sealed-bid UI (see its [README](ghost-frontend/README.md)) |
| [client/](client/) | Next.js dashboard — reads `ghost-server` status endpoints |

<img width="818" height="413" alt="Screenshot 2026-04-09 at 7 24 13 PM" src="https://github.com/user-attachments/assets/574ecc02-6ef1-4855-bce3-12ec1cbf4d88" />


## Prerequisites

- Node.js >= 20
- Docker (for proof server + localnet)
- The Compact toolchain: `compact` CLI + compiler `0.30.0` (`compact update 0.30.0`)

## Running (localnet)

### 1. Start the Midnight localnet + proof server

```bash
docker compose -f midnight-localnet/docker-compose.yml up -d
```

Brings up (see [midnight-localnet/](midnight-localnet/)):
- `midnightntwrk/midnight-node:0.21.0` — node RPC/WS on `:9944`
- `midnightntwrk/indexer-standalone:3.1.0` — GraphQL on `:8087`
- `midnightntwrk/proof-server:7.0.0` — proof server on `:6300`

### 1a. Build the contract (Compact → ZK artifacts)

```bash
cd ghost-contract
npm install
npm run compact     # compile ghost.compact → src/managed/ghost (keys + zkir)
npm test            # 8 simulator tests
```

Verify: `curl http://localhost:9944/health`.

### 2. Start ghost-server (intent matcher)

```bash
cd ghost-server
npm install
npm run dev
```

Listens on `:8080`. Matching engine fires every `EPOCH_MS=5000` — see [ghost-server/README.md](ghost-server/README.md) for endpoints and matching algorithm.

### 3. Build + run ghost-cli

```bash
cd ghost-cli
npm install
npm run build
node dist/index.js
```

First run prompts for a 24-word mnemonic (saved to `~/.ghost/wallet.json`). Subsequent runs auto-load.

Test accounts live in [../midnight-local-dev/accounts.json](../midnight-local-dev/accounts.json). Alice's mnemonic:
```
young popular balance act bean merry green bulk become south tank magnet
real pride leopard noodle wild hurdle tissue jump city blur spring emerge
```

### 4. (Optional) Start the Next.js client

```bash
cd client
bun install
bun dev
```

Served at `http://localhost:3000`.

## CLI testing walkthrough

1. **Start two CLI instances** — one for Alice (lender), one for Bob (borrower). Each uses its own mnemonic.
2. **Fund wallets from genesis** (menu option 8): only works on localnet.
3. **Alice posts a lend intent** (option 1): `amount=1000000000 µN`, `rMin=500` bps.
4. **Bob posts a borrow intent** (option 2): `amount=1000000000 µN`, `rMax=800` bps, `collateral=1500000000 µN`.
5. **ghost-server matches** on next 5s epoch, emits `Loan { status: 'awaiting-settlement' }`.
6. **Both CLIs' pollers** (`matchPollMs=5000`) detect the loan — Alice sees the lender prompt.
7. **Alice settles** (option 5): executes unshielded transfer → posts `/loans/:id/settle` → loan becomes `active`.
8. **Option 3** lists all intents + loans; **option 4** lists your own.

Direct quick-test without the menu:
```bash
node dist/test-wallet.js
```
Uses Alice's hardcoded mnemonic, builds wallet, syncs, prints address.

## Preprod deployment

See [deploy-preprod/README.md](deploy-preprod/README.md). Runs its own proof server on `:6301`, uses SDK 4.x, derives a fresh wallet, funds via the preprod faucet, and deploys the ghost contract to `https://rpc.preprod.midnight.network`. Writes `deployment.json`.

Note: deploy-preprod currently only deploys the contract. The CLI still settles off-chain.

## What works

- [x] Mnemonic wallet (HD BIP-44, `~/.ghost/wallet.json`)
- [x] Wallet sync against localnet indexer + node
- [x] Unshielded NIGHT transfers (send/receive)
- [x] DUST registration for fees
- [x] Genesis-funding on localnet
- [x] Lend/borrow intent submission to ghost-server
- [x] Clearing-rate matching engine (greedy pairing, no splits)
- [x] Match polling + lender-driven settlement (wallet-to-wallet transfer)
- [x] Preprod contract deployment script
- [x] Next.js client shell

## What's not yet wired (next milestone)

The following are **going to be implemented in the next milestone**:

- **On-chain escrow via ghost-contract** — CLI currently skips the Compact contract entirely. Lend/borrow circuits exist in [ghost-contract/src/ghost.compact](ghost-contract/) but are not called from the CLI. Current blocker: SDK v1 vs v4 mismatch between ghost-cli and deploy-preprod (see [ghost-cli/MIGRATION_NOTES.md](ghost-cli/MIGRATION_NOTES.md)).
- **Real settlement txId tracking** — [ghost-cli/src/index.ts:230](ghost-cli/src/index.ts#L230) posts a placeholder `settled_${Date.now()}` instead of the actual on-chain txId.
- **Partial fills in matching** — ghost-server currently only matches pairs where `lend.amount >= borrow.amount` at `borrow.amount`; no splits.
- **Collateral locking** — borrower's collateral field is accepted but never actually held.
- **Next.js client wired to ghost-server** — [client/](client/) is a shell.
- **Loan repayment / liquidation flows** — no repay or liquidate endpoints.
- **Preprod end-to-end** — only localnet is tested; preprod only runs the deploy script.

## Troubleshooting

**CLI stuck at "syncing wallet"** — ensure localnet is up and `indexer` is healthy. Ghost-cli points at `http://127.0.0.1:8087` ([ghost-cli/src/config.ts:22](ghost-cli/src/config.ts#L22)).

**Matching never fires** — check ghost-server logs for `matching engine started { epochMs: 5000 }`. Both CLI and server must be running.

**"expected instance of ContractMaintenanceAuthority"** on deploy-preprod — you hit the WASM-duplication trap. Re-copy managed artifacts per [deploy-preprod/README.md](deploy-preprod/README.md) step 2.

## Layout

```
ghost-midnight/
├── ghost-cli/         # mnemonic CLI wallet (SDK v1)
├── ghost-server/      # intent matcher (Hono, JSON store)
├── ghost-contract/    # Compact contract (not yet wired)
├── deploy-preprod/    # preprod deploy (SDK v4)
├── client/            # Next.js dashboard shell
└── docs/              # protocol + architecture notes
```

## License

Apache-2.0
