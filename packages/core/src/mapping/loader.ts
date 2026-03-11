import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import YAML from 'yaml';
import type { TransactionMapping } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const MAPPINGS_DIR = resolve(__dirname, '../../../../mappings/x12');

export function loadMapping(filePath: string): TransactionMapping {
  const content = readFileSync(filePath, 'utf-8');
  return YAML.parse(content) as TransactionMapping;
}
