# ghost-frontend

The **contract-native** GHOST dApp — a Vite + React interface that reads the
GHOST ledger directly from the Midnight indexer and submits sealed-bid circuit
calls through the Lace wallet. This is the frontend closest to the on-chain
vision (the Next.js [`client`](../client) is a separate, server-native dashboard).

> Design: "Midnight Vault" — warm-black canvas, molten-orange accent, cool-steel
> for the sealed/hidden state. The color encodes the commit→reveal mechanic:
> bids are **sealed** (steel shimmer) and **ignite into orange on reveal**.

## Screens

| Route | What it does |
|---|---|
| `/` Dashboard | Vault balance, market pulse, live order book, phase spine |
| `/lend` | Compose a sealed **lend** bid, reveal queue, order book |
| `/borrow` | Compose a sealed **borrow** bid (150% collateral), reveal queue |
| `/loans` | Positions ledger — role-coded, live interest, repay |
| `/operator` | Console to advance auction phases and settle matches |

## The sealed-bid flow

1. **Bid** — your amount + rate are hashed into a commitment (`sha256(amount ‖
   rate ‖ nonce ‖ owner)`); only the seal is submitted on-chain.
2. **Reveal** — you open the commitment to the book.
3. **Clear** — the operator settles matched pairs at one clearing rate.
4. **Active** — loans are live; repay to release collateral.

## Run it

```bash
npm install
npm run dev        # → http://localhost:3007
```

### Demo mode (default)

`VITE_DEMO=1` is **on by default**, so every screen renders fully populated with
representative data — no wallet, localnet, or proof server required. Ideal for
demos and screenshots.

### Live mode (against a deployed contract)

```bash
# .env.local
VITE_DEMO=0
VITE_CONTRACT_ADDRESS=<your deployed GHOST contract address>
VITE_NETWORK=preprod
VITE_MIDNIGHT_INDEXER_URL=https://indexer.preprod.midnight.network/api/v4/graphql
VITE_PROOF_SERVER_URL=http://localhost:6300
```

Then `npm run prepare:zk` to copy the ZK artifacts into `public/zk/ghost/`, and
connect Lace. See [../deploy-preprod](../deploy-preprod) to deploy the contract
and get an address.

## Architecture

```
src/
  sdk/            WalletConnector · ContractClient · StateReader (Midnight SDK)
  store/          zustand: wallet · auction · loan
  hooks/          useWallet · useAuction · useLoans · useDemoBoot
  components/     Layout (top-nav + status ticker) · OrderBook · BidComposer ·
                  RevealQueue · PhaseSpine · LoanLedger · OperatorPanel · ui/
  config/demo.ts  demo-mode seed data
```

State changes go on-chain via Lace; reads come from the indexer. There is **no
REST backend** — unlike `client`, this frontend does not call `ghost-server`.

> ⚠️ Live mode is not yet wired end-to-end: the CLI/contract SDK version split
> (`midnight-js@3`/`ledger-v7` here vs `@4`/`ledger-v8` in `deploy-preprod`) must
> be resolved first. See [../docs/GAP_ANALYSIS.md](../docs/GAP_ANALYSIS.md).
