import 'dotenv/config';

export interface Config {
  /** v0: JSON file path for intent/loan persistence */
  dataFile: string;
  /** Kept for future swap-in. Unused in v0 (JSON file mode). */
  mongodbUri: string;
  port: number;
  epochMs: number;
  logLevel: string;
  /** Pool address surfaced at GET /health for frontends. */
  poolAddress: string;
}

export const config: Config = {
  dataFile: process.env.DATA_FILE ?? './data/ghost-data.json',
  mongodbUri: process.env.MONGODB_URI ?? '',
  port: Number(process.env.PORT ?? 8080),
  epochMs: Number(process.env.EPOCH_MS ?? 5000),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  poolAddress:
    process.env.POOL_ADDRESS ?? 'ghost_pool_0000000000000000000000000000000000000000',
};
