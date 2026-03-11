import { describe, it, expect } from 'vitest';
import { getMappingForTransactionSet, SUPPORTED_TRANSACTION_SETS } from './registry.js';

describe('mapping registry', () => {
  it('lists all v1 supported transaction sets', () => {
    expect(SUPPORTED_TRANSACTION_SETS).toEqual(['810', '832', '850', '856', '997']);
  });

  it('returns mapping for each supported set', () => {
    for (const ts of SUPPORTED_TRANSACTION_SETS) {
      const mapping = getMappingForTransactionSet(ts);
      expect(mapping.transactionSet).toBe(ts);
    }
  });

  it('throws for unsupported transaction set', () => {
    expect(() => getMappingForTransactionSet('999')).toThrow();
  });
});
