/**
 * Smoke test: verify the compiled GHOST contract loads under the v4 compact-js
 * SDK from deploy-preprod's own node_modules — i.e. that the WASM runtime
 * instances line up and there is no `ContractMaintenanceAuthority` mismatch.
 *
 * Run:  node verify-contract.mjs   (after `cp -r ../ghost-contract/src/managed ./managed`)
 */
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import path from 'node:path';
import fs from 'node:fs';

const zk = path.resolve('managed', 'ghost');
const contractIndex = path.resolve(zk, 'contract', 'index.js');

if (!fs.existsSync(contractIndex)) {
  console.error('✗ managed/ghost not found. Run: cp -r ../ghost-contract/src/managed ./managed');
  process.exit(1);
}

const mod = await import(contractIndex);
CompiledContract.make('ghost', mod.Contract).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets(zk),
);

const circuits = Object.keys(mod.pureCircuits ?? {});
console.log('✓ GHOST contract loaded under v4 compact-js — WASM instances OK');
console.log(`  module exports: ${Object.keys(mod).join(', ')}`);
if (circuits.length) console.log(`  pure circuits:  ${circuits.join(', ')}`);
