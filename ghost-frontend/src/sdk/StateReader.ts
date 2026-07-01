import type { NetworkConfig, LedgerState, RevealedBid, LoanInfo } from './types';

/**
 * Reads GHOST contract ledger state from the Midnight indexer via GraphQL.
 * Uses contractAction query to get raw state, then decodes slots.
 */
export class StateReader {
  private config: NetworkConfig;

  constructor(config: NetworkConfig) {
    this.config = config;
  }

  async fetchState(): Promise<LedgerState> {
    if (!this.config.contractAddress) {
      return defaultState();
    }

    try {
      const response = await fetch(this.config.indexerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetContractState($address: HexEncoded!) {
              contractAction(address: $address) {
                state
                address
                transaction {
                  hash
                  block { height }
                }
              }
            }
          `,
          variables: { address: this.config.contractAddress },
        }),
      });

      const result = await response.json();

      if (result.errors?.length) {
        console.error('Indexer error:', result.errors[0].message);
        return defaultState();
      }

      const stateHex = result.data?.contractAction?.state;
      if (!stateHex) return defaultState();

      return this.decodeLedgerState(stateHex);
    } catch (err) {
      console.error('Failed to fetch contract state:', err);
      return defaultState();
    }
  }

  /**
   * Decode the hex-encoded ledger state blob using compact-runtime.
   * This reads individual slots matching the ghost.compact ledger layout.
   */
  private async decodeLedgerState(stateHex: string): Promise<LedgerState> {
    try {
      const cr = await import('@midnight-ntwrk/compact-runtime');

      const bytes = Uint8Array.from(
        stateHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
      );

      // Attempt to deserialize and read slots
      // The exact deserialization depends on compact-runtime version
      // For now, try the standard approach
      const cs = (cr as any).ContractState?.deserialize?.(bytes);
      if (!cs) return defaultState();

      const chargedState = cs.data;
      const context = {
        currentQueryContext: new (cr as any).QueryContext(chargedState, (cr as any).dummyContractAddress()),
        costModel: (cr as any).CostModel?.initialCostModel(),
      };

      const readUint8 = (slot: number): number => {
        try {
          return Number(readSlot(cr, context, slot, 1));
        } catch {
          return 0;
        }
      };

      const readUint32 = (slot: number): number => {
        try {
          return Number(readSlot(cr, context, slot, 4));
        } catch {
          return 0;
        }
      };

      const readUint64 = (slot: number): bigint => {
        try {
          return readSlot(cr, context, slot, 8);
        } catch {
          return 0n;
        }
      };

      // Ghost contract ledger layout (from ghost.compact):
      // phase: Uint<8>, epoch_num: Uint<32>, operator: Bytes<32>,
      // balances: Map, lend_commits: Map, borrow_commits: Map,
      // lend_bids: Map, borrow_bids: Map, loans: Map,
      // clearing_rate: Uint<32>, matched_volume: Uint<64>,
      // total_deposits: Uint<64>, total_locked: Uint<64>
      return {
        phase: readUint8(0),
        epochNum: readUint32(1),
        operator: '',
        clearingRate: readUint32(9),
        matchedVolume: readUint64(10),
        totalDeposits: readUint64(11),
        totalLocked: readUint64(12),
        lendBids: [],
        borrowBids: [],
        loans: [],
        balances: new Map(),
      };
    } catch (err) {
      console.error('Failed to decode ledger state:', err);
      return defaultState();
    }
  }
}

function readSlot(cr: any, context: any, slotIdx: number, _byteSize: number): bigint {
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: [],
  };

  const u8 = new cr.CompactTypeUnsignedInteger(255n, 1);

  const result = cr.queryLedgerState(context, partialProofData, [
    { dup: { n: 0 } },
    {
      idx: {
        cached: false,
        pushPath: false,
        path: [{ tag: 'value', value: { value: u8.toValue(BigInt(slotIdx)), alignment: u8.alignment() } }],
      },
    },
    { popeq: { cached: false, result: undefined } },
  ]);

  return BigInt(result?.value ?? 0);
}

function defaultState(): LedgerState {
  return {
    phase: 0,
    epochNum: 0,
    operator: '',
    clearingRate: 0,
    matchedVolume: 0n,
    totalDeposits: 0n,
    totalLocked: 0n,
    lendBids: [],
    borrowBids: [],
    loans: [],
    balances: new Map(),
  };
}
