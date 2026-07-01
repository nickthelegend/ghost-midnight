import { WalletConnector } from './WalletConnector';
import { ContractClient } from './ContractClient';
import { StateReader } from './StateReader';
import { getConfig, type NetworkConfig, type LedgerState } from './types';

export class GhostSDK {
  public readonly wallet: WalletConnector;
  public readonly contract: ContractClient;
  public readonly state: StateReader;
  public readonly config: NetworkConfig;

  constructor(configOverride?: Partial<NetworkConfig>) {
    this.config = { ...getConfig(), ...configOverride };
    this.wallet = new WalletConnector(this.config);
    this.contract = new ContractClient(this.config, this.wallet);
    this.state = new StateReader(this.config);
  }

  async connect(): Promise<{ address: string; balance: bigint }> {
    return this.wallet.connect();
  }

  disconnect() {
    this.wallet.disconnect();
  }

  async refreshState(): Promise<LedgerState> {
    return this.state.fetchState();
  }
}

// Singleton
let instance: GhostSDK | null = null;

export function getGhostSDK(): GhostSDK {
  if (!instance) {
    instance = new GhostSDK();
  }
  return instance;
}
