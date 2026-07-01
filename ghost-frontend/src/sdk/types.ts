export interface NetworkConfig {
  network: 'preprod' | 'mainnet' | 'undeployed';
  indexerUrl: string;
  indexerWsUrl: string;
  nodeUrl: string;
  proofServerUrl: string;
  zkBaseUrl: string;
  contractAddress: string;
}

export function getConfig(): NetworkConfig {
  return {
    network: (import.meta.env.VITE_NETWORK as NetworkConfig['network']) || 'preprod',
    indexerUrl: import.meta.env.VITE_MIDNIGHT_INDEXER_URL || 'https://indexer.preprod.midnight.network/api/v4/graphql',
    indexerWsUrl: import.meta.env.VITE_MIDNIGHT_INDEXER_WS || 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
    nodeUrl: import.meta.env.VITE_MIDNIGHT_NODE_URL || 'wss://rpc.preprod.midnight.network',
    proofServerUrl: import.meta.env.VITE_PROOF_SERVER_URL || 'http://localhost:6300',
    zkBaseUrl: import.meta.env.VITE_ZK_BASE_URL || '/zk/ghost',
    contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS || '',
  };
}

export const PHASE_NAMES = ['BIDDING', 'REVEAL', 'CLEARING', 'ACTIVE'] as const;
export type PhaseName = (typeof PHASE_NAMES)[number];

export interface LedgerState {
  phase: number;
  epochNum: number;
  operator: string;
  clearingRate: number;
  matchedVolume: bigint;
  totalDeposits: bigint;
  totalLocked: bigint;
  lendBids: RevealedBid[];
  borrowBids: RevealedBid[];
  loans: LoanInfo[];
  balances: Map<string, bigint>;
}

export interface RevealedBid {
  slot: number;
  owner: string;
  amount: bigint;
  rate: number;
  revealed: boolean;
}

export interface LoanInfo {
  id: number;
  lender: string;
  borrower: string;
  principal: bigint;
  collateral: bigint;
  rate: number;
  repaid: boolean;
}

export interface StoredCommitment {
  hash: string;
  amount: bigint;
  rate: bigint;
  nonce: string;
  owner: string;
  side: 'lend' | 'borrow';
  epochNum: number;
  timestamp: number;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: bigint;
}

export interface InitialAPI {
  rdns?: string;
  name: string;
  icon: string;
  apiVersion: string;
  connect(networkId: string): Promise<ConnectedAPI>;
}

export interface ConnectedAPI {
  getShieldedAddresses(): Promise<{
    shieldedAddress: string;
    shieldedCoinPublicKey: string;
    shieldedEncryptionPublicKey: string;
  }>;
  getShieldedBalances(): Promise<Record<string, bigint>>;
  getUnshieldedBalances(): Promise<Record<string, bigint>>;
  getDustBalance(): Promise<{ cap: bigint; balance: bigint }>;
  balanceUnsealedTransaction(tx: string, options?: { payFees?: boolean }): Promise<{ tx: string }>;
  submitTransaction(tx: string): Promise<void>;
  getProvingProvider(keyMaterialProvider: KeyMaterialProvider): Promise<ProvingProvider>;
  getConfiguration(): Promise<{ indexerUri: string; indexerWsUri: string; proverServerUri: string; substrateNodeUri: string; networkId: string }>;
}

export interface KeyMaterialProvider {
  getZKIR(circuitId: string): Promise<Uint8Array>;
  getProverKey(circuitId: string): Promise<Uint8Array>;
  getVerifierKey(circuitId: string): Promise<Uint8Array>;
}

export interface ProvingProvider {
  prove(serializedPreimage: Uint8Array, keyLocation: string, overwriteBindingInput?: bigint): Promise<Uint8Array>;
}

declare global {
  interface Window {
    midnight?: Record<string, InitialAPI | undefined>;
    lace?: InitialAPI;
    midnightLace?: InitialAPI;
  }
}
