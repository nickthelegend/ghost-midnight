import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Use fileURLToPath so paths with spaces/special chars (e.g. "/Volumes/Extreme SSD")
// decode correctly instead of leaving %20 in a raw filesystem path.
export const currentDir = path.resolve(fileURLToPath(import.meta.url), '..');

export interface Config {
  readonly logDir: string;
}

export class LogicTestingConfig implements Config {
  logDir = path.resolve(currentDir, '..', 'logs', 'logic-testing', `${new Date().toISOString()}.log`);
  constructor() {}
}
