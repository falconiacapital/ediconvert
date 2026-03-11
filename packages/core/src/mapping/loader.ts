import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import YAML from 'yaml';
import type { TransactionMapping } from './types.js';

// Support both ESM (import.meta.url) and CJS (__dirname) contexts
const _dirname: string = (typeof __dirname !== 'undefined')
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));

export const MAPPINGS_DIR = resolve(_dirname, '../../../../mappings/x12');

export function loadMapping(filePath: string): TransactionMapping {
  const content = readFileSync(filePath, 'utf-8');
  return YAML.parse(content) as TransactionMapping;
}
