# client

The Next.js dashboard for GHOST Finance — a server-native interface that reads
lending/borrowing state from [`ghost-server`](../ghost-server). (The
contract-native UI is [`ghost-frontend`](../ghost-frontend); see
[docs/STATE_OF_THE_PROJECT.md](../docs/STATE_OF_THE_PROJECT.md) for why there are
two.)

> Design: shares the "Midnight Vault" identity — warm-black + molten-orange,
> Clash Display / Satoshi / JetBrains Mono. Themed entirely through shadcn CSS
> variables in [`src/app/globals.css`](src/app/globals.css).

## Pages

| Route | What it does |
|---|---|
| `/` | Borrow / Lend / Status tabs — submit private intents |
| `/explore` | Browse pools, live intent counts, pool detail |
| `/profile` | Reputation tier, positions, credit score |
| `/infinity` | "Dungeon" marketing page |

## Run

```bash
bun install
bun run dev        # → http://localhost:3000
```

Start [`ghost-server`](../ghost-server) first (`:8080`) so the dashboard has data
to read. The API origin is configurable:

```bash
GHOST_API_ORIGIN=http://localhost:8080 bun run dev
# or set NEXT_PUBLIC_GHOST_API_URL for the client-side fetch base
```

## Server endpoints it reads

- `GET /health` → pool address
- `GET /api/v1/lender-status/:address`
- `GET /api/v1/borrower-status/:address`
- `GET /api/v1/credit-score/:address`
- `GET /api/v1/internal/pending-intents`

These are implemented in `ghost-server` against the v0 JSON store.

## Status

Read paths work against `ghost-server`. Write actions (submitting intents from
the UI) are not yet wired to Midnight — the CLI is currently the way to submit
intents. See [docs/GAP_ANALYSIS.md](../docs/GAP_ANALYSIS.md).
