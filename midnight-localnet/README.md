# Midnight localnet

A one-command local Midnight stack — **node + indexer + proof server** — for
developing and testing GHOST contracts without touching preprod. This replaces
the `../midnight-local-dev/standalone.yml` the old docs referenced (that sibling
repo was never part of this tree).

## Start / stop

```bash
# from repo root
docker compose -f midnight-localnet/docker-compose.yml up -d      # start
docker compose -f midnight-localnet/docker-compose.yml logs -f    # watch
docker compose -f midnight-localnet/docker-compose.yml down       # stop
docker compose -f midnight-localnet/docker-compose.yml down -v    # stop + wipe chain
```

First boot takes ~30s (the node seals genesis + a few blocks, the indexer runs
DB migrations and catches up).

## Endpoints

| Service | URL | Notes |
|---|---|---|
| Node RPC / WS | `ws://localhost:9944` · `http://localhost:9944` | `--dev` chain, instant sealing |
| Indexer GraphQL | `http://localhost:8087/api/v3/graphql` | matches `ghost-cli` config |
| Proof server | `http://localhost:6300` | `GET /` → `{"status":"ok"}` |

## Verify it's healthy

```bash
# node — should return a block number
curl -s -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"system_health","params":[]}' \
  http://localhost:9944

# proof server
curl -s http://localhost:6300/            # {"status":"ok", ...}

# indexer GraphQL
curl -s -H 'content-type: application/json' \
  -d '{"query":"{ __typename }"}' \
  http://localhost:8087/api/v3/graphql     # {"data":{"__typename":"Query"}}
```

## Images (pinned)

- `midnightntwrk/midnight-node:0.21.0` — `CFG_PRESET=dev` mocks the Cardano
  main-chain follower so it runs standalone.
- `midnightntwrk/indexer-standalone:3.1.0` — `APP__INFRA__SECRET` is required and
  must be a non-numeric hex string; it points at `ws://node:9944`.
- `midnightntwrk/proof-server:7.0.0`.

## Point the apps at it

- **ghost-cli** already targets `:8087` / `:9944` / `:6300` — no change needed.
- **ghost-frontend** live mode — set in `.env.local`:
  ```
  VITE_DEMO=0
  VITE_NETWORK=undeployed
  VITE_MIDNIGHT_INDEXER_URL=http://localhost:8087/api/v3/graphql
  VITE_MIDNIGHT_NODE_URL=ws://localhost:9944
  VITE_PROOF_SERVER_URL=http://localhost:6300
  VITE_CONTRACT_ADDRESS=<deploy first, then paste the address>
  ```

> Note on ports: `ghost-cli` historically referenced `:8087` and `:8088` in
> different places. This compose serves the indexer on host `:8087`. If a tool
> expects `:8088`, either change its config or edit the port mapping here.
