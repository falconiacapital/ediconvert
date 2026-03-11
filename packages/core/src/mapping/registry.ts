import { resolve } from 'node:path';
import { loadMapping, MAPPINGS_DIR } from './loader.js';
import { ParseError } from '../errors.js';
import type { TransactionMapping } from './types.js';

export const SUPPORTED_TRANSACTION_SETS = ['810', '832', '850', '856', '997'];

const cache = new Map<string, TransactionMapping>();

export function getMappingForTransactionSet(transactionSet: string): TransactionMapping {
  if (cache.has(transactionSet)) return cache.get(transactionSet)!;

  if (!SUPPORTED_TRANSACTION_SETS.includes(transactionSet)) {
    throw new ParseError(
      'UNSUPPORTED_TRANSACTION',
      `Transaction set ${transactionSet} is not supported. Supported: ${SUPPORTED_TRANSACTION_SETS.join(', ')}`,
    );
  }

  const mapping = loadMapping(resolve(MAPPINGS_DIR, `${transactionSet}.yaml`));
  cache.set(transactionSet, mapping);
  return mapping;
}
