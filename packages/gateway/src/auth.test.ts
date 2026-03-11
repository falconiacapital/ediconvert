import { describe, it, expect, beforeEach } from 'vitest';
import { AuthManager } from './auth.js';
import { Storage } from './storage.js';

describe('AuthManager', () => {
  let auth: AuthManager;
  beforeEach(() => {
    const storage = new Storage(':memory:');
    auth = new AuthManager(storage);
  });

  it('creates an API key and returns the raw key', async () => {
    const result = await auth.createKey({ label: 'test-key' });
    expect(result.rawKey).toMatch(/^edi_live_/);
    expect(result.label).toBe('test-key');
  });

  it('validates a correct API key', async () => {
    const { rawKey } = await auth.createKey({ label: 'test-key' });
    const valid = await auth.validateKey(rawKey);
    expect(valid).toBe(true);
  });

  it('rejects an invalid API key', async () => {
    const valid = await auth.validateKey('edi_live_invalid');
    expect(valid).toBe(false);
  });

  it('creates partner-scoped keys', async () => {
    const { rawKey } = await auth.createKey({ label: 'hd-key', partnerScope: 'HOMEDEPOT' });
    const valid = await auth.validateKey(rawKey);
    expect(valid).toBe(true);
  });
});
