import type { NetworkConfig, ConnectedAPI } from './types';
import { WalletConnector } from './WalletConnector';

/**
 * Browser ZK config provider — fetches .bzkir, .prover, .verifier from static /zk/ghost/ path.
 * Mirrors MidSwap's createBrowserZkConfigProvider pattern.
 */
function createBrowserZkConfigProvider(zkBaseUrl: string) {
  const cache = new Map<string, Uint8Array>();

  async function fetchBytes(url: string): Promise<Uint8Array> {
    const cached = cache.get(url);
    if (cached) return cached;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Failed to fetch ZK asset: ${url} (${resp.status})`);
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    cache.set(url, bytes);
    return bytes;
  }

  return {
    getZKIR: (circuitId: string) => fetchBytes(`${zkBaseUrl}/zkir/${circuitId}.bzkir`),
    getProverKey: (circuitId: string) => fetchBytes(`${zkBaseUrl}/keys/${circuitId}.prover`),
    getVerifierKey: (circuitId: string) => fetchBytes(`${zkBaseUrl}/keys/${circuitId}.verifier`),
    async get(circuitId: string) {
      const [proverKey, verifierKey, zkir] = await Promise.all([
        fetchBytes(`${zkBaseUrl}/keys/${circuitId}.prover`),
        fetchBytes(`${zkBaseUrl}/keys/${circuitId}.verifier`),
        fetchBytes(`${zkBaseUrl}/zkir/${circuitId}.bzkir`),
      ]);
      return { circuitId, proverKey, verifierKey, zkir };
    },
    async getVerifierKeys(circuitIds: string[]) {
      return Promise.all(
        circuitIds.map(async (id) => {
          const key = await fetchBytes(`${zkBaseUrl}/keys/${id}.verifier`);
          return [id, key] as [string, Uint8Array];
        }),
      );
    },
  };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Wraps all GHOST circuit calls for browser execution via Lace wallet.
 * Adapts ghost-cli/src/api.ts patterns to browser environment.
 */
export class ContractClient {
  private config: NetworkConfig;
  private wallet: WalletConnector;
  private zkConfig: ReturnType<typeof createBrowserZkConfigProvider>;

  constructor(config: NetworkConfig, wallet: WalletConnector) {
    this.config = config;
    this.wallet = wallet;
    this.zkConfig = createBrowserZkConfigProvider(config.zkBaseUrl);
  }

  /**
   * Generic circuit call: builds providers, submits tx via Lace.
   * This mirrors MidSwap's executeContractCall pattern.
   */
  private async callCircuit(circuitId: string, args: any[]): Promise<string> {
    const api = this.wallet.getAPI();
    const identity = await this.wallet.getIdentity();

    // Dynamic imports for midnight SDK (tree-shaking, WASM compat)
    const [
      { findDeployedContract },
      { httpClientProofProvider },
      { indexerPublicDataProvider },
      { setNetworkId },
    ] = await Promise.all([
      import('@midnight-ntwrk/midnight-js-contracts'),
      import('@midnight-ntwrk/midnight-js-http-client-proof-provider'),
      import('@midnight-ntwrk/midnight-js-indexer-public-data-provider'),
      import('@midnight-ntwrk/midnight-js-network-id'),
    ]);

    setNetworkId(this.config.network);

    // Proof provider
    const proofProvider = httpClientProofProvider(this.config.proofServerUrl, this.zkConfig as any);

    // Public data provider (indexer)
    const publicDataProvider = indexerPublicDataProvider(
      this.config.indexerUrl,
      this.config.indexerWsUrl,
      WebSocket,
    );

    // Wallet provider — bridges Lace DApp Connector to SDK interface
    const walletProvider = {
      balanceTx: async (provenTx: any, _ttl?: Date) => {
        const txBytes = provenTx.serialize();
        const txHex = bytesToHex(txBytes);
        const { tx: balancedHex } = await api.balanceUnsealedTransaction(txHex);
        // Dynamic import for Transaction deserialization
        const ledger = await import('@midnight-ntwrk/ledger-v7');
        return (ledger as any).Transaction
          ? (ledger as any).Transaction.deserialize(hexToBytes(balancedHex))
          : balancedHex;
      },
      getCoinPublicKey: () => identity.coinPublicKey,
      getEncryptionPublicKey: () => identity.encryptionPublicKey,
    };

    // Midnight provider — submits via Lace
    const midnightProvider = {
      submitTx: async (finalizedTx: any) => {
        const txHex = typeof finalizedTx === 'string' ? finalizedTx : bytesToHex(finalizedTx.serialize());
        await api.submitTransaction(txHex);
        return txHex.slice(0, 64); // txId placeholder
      },
    };

    // Private state provider (in-memory for browser)
    const privateStateProvider = {
      get: async () => ({ ownerKey: await this.wallet.getOwnerBytes() }),
      set: async () => {},
    };

    // Load contract module
    const { Ghost } = await import('@ghost/ghost-contract');

    const providers = {
      privateStateProvider,
      publicDataProvider,
      proofProvider,
      zkConfigProvider: this.zkConfig,
      walletProvider,
      midnightProvider,
    };

    // Find deployed contract
    const contract = await findDeployedContract(providers as any, {
      contractAddress: this.config.contractAddress,
      contract: Ghost.Contract,
      privateStateId: 'ghostPrivateState',
      initialPrivateState: { ownerKey: await this.wallet.getOwnerBytes() },
    } as any);

    // Call the circuit
    const result = await (contract as any).callTx[circuitId](...args);
    return result?.public?.txId || 'submitted';
  }

  // ---- Circuit Wrappers ----

  async deposit(owner: Uint8Array, amount: bigint): Promise<string> {
    return this.callCircuit('deposit', [owner, amount]);
  }

  async withdraw(owner: Uint8Array, amount: bigint): Promise<string> {
    return this.callCircuit('withdraw', [owner, amount]);
  }

  async submitLend(commitment: Uint8Array): Promise<string> {
    return this.callCircuit('submit_lend', [commitment]);
  }

  async submitBorrow(commitment: Uint8Array): Promise<string> {
    return this.callCircuit('submit_borrow', [commitment]);
  }

  async revealLend(
    commitment: Uint8Array,
    owner: Uint8Array,
    amount: bigint,
    rMin: bigint,
  ): Promise<string> {
    return this.callCircuit('reveal_lend', [commitment, owner, amount, rMin]);
  }

  async revealBorrow(
    commitment: Uint8Array,
    owner: Uint8Array,
    amount: bigint,
    rMax: bigint,
    collateral: bigint,
  ): Promise<string> {
    return this.callCircuit('reveal_borrow', [commitment, owner, amount, rMax, collateral]);
  }

  async settle(
    rate: bigint,
    lendSlot: bigint,
    borrowSlot: bigint,
    matchAmount: bigint,
  ): Promise<string> {
    return this.callCircuit('settle', [rate, lendSlot, borrowSlot, matchAmount]);
  }

  async repay(loanId: bigint, caller: Uint8Array, totalDue: bigint): Promise<string> {
    return this.callCircuit('repay', [loanId, caller, totalDue]);
  }

  async advancePhase(caller: Uint8Array): Promise<string> {
    return this.callCircuit('advance_phase', [caller]);
  }
}
