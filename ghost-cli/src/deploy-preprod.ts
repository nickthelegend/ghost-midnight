/**
 * GHOST Finance — Deploy to Midnight Preprod
 *
 * Usage:
 *   MNEMONIC="your words here" npx tsx src/deploy-preprod.ts
 */

import { setNetworkId, getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import * as Rx from 'rxjs';
import { WebSocket } from 'ws';
import pino from 'pino';

import {
  mnemonicToSeed,
  buildWalletFromSeed,
  createWalletAndMidnightProvider,
  setLogger,
  waitForSync,
} from './api.js';
import { deploy, getLedgerState } from './api.js';
import { type Config, contractConfig } from './config.js';

import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { type GhostPrivateState } from '@ghost/ghost-contract';
import * as ledger from '@midnight-ntwrk/ledger-v7';

// @ts-expect-error: WebSocket polyfill
globalThis.WebSocket = WebSocket;

// ─── Config ────────────────────────────────────────────────────────

setNetworkId('testnet-02');

const logger = pino({ level: 'info' });
setLogger(logger);

const PREPROD_CONFIG: Config = {
  logDir: './logs',
  indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  node: 'wss://rpc.preprod.midnight.network',
  proofServer: 'http://127.0.0.1:6300',
};

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log('=== GHOST Finance — Deploy to Midnight Preprod ===\n');

  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) {
    console.error('Set MNEMONIC env var.');
    console.error('  MNEMONIC="word1 word2 ..." npx tsx src/deploy-preprod.ts');
    process.exit(1);
  }

  console.log('1. Building wallet from mnemonic...');
  const seed = await mnemonicToSeed(mnemonic);
  const walletCtx = await buildWalletFromSeed(seed, PREPROD_CONFIG);

  console.log('2. Waiting for wallet sync...');
  await waitForSync(walletCtx.wallet);
  console.log('   Wallet synced.');

  const walletState = await Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)),
  );
  const nightBal = walletState.unshielded?.balances[ledger.nativeToken().raw] ?? 0n;
  const dustBal = walletState.dust.walletBalance(new Date());
  console.log(`   NIGHT: ${nightBal}, DUST: ${dustBal}`);

  if (dustBal <= 0n) {
    console.error('   No DUST balance. Fund wallet on preprod first.');
    process.exit(1);
  }

  console.log('\n3. Setting up providers...');
  const walletAndMidnight = await createWalletAndMidnightProvider(walletCtx);
  const zkConfigProvider = new NodeZkConfigProvider(contractConfig.zkConfigPath);

  const providers = {
    privateStateProvider: await levelPrivateStateProvider<GhostPrivateState>({
      privateStateStoreName: 'ghost-private-state-preprod',
    }),
    publicDataProvider: indexerPublicDataProvider(PREPROD_CONFIG.indexer, PREPROD_CONFIG.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(PREPROD_CONFIG.proofServer, zkConfigProvider),
    walletProvider: walletAndMidnight,
    midnightProvider: walletAndMidnight,
  };

  console.log('4. Deploying GHOST contract to preprod...');
  console.log('   (proof generation + block confirmation may take 1-3 min)\n');

  const adminKey = new Uint8Array(32);
  const contract = await deploy(providers as any, adminKey);

  const address = contract.deployTxData.public.contractAddress;
  console.log(`\n  GHOST contract deployed!`);
  console.log(`  ────────────────────────────────────────`);
  console.log(`  Address: ${address}`);
  console.log(`  Tx ID:   ${contract.deployTxData.public.txId}`);
  console.log(`  Network: Midnight Preprod (testnet-02)`);
  console.log(`  ────────────────────────────────────────`);
  console.log(`\n  Set in ghost-frontend/.env:`);
  console.log(`  VITE_CONTRACT_ADDRESS=${address}\n`);

  await walletCtx.wallet.close();
  process.exit(0);
}

main().catch((e) => {
  console.error('Deploy failed:', e);
  process.exit(1);
});
