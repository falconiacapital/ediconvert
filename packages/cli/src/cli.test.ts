import { describe, it, expect, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { unlinkSync, existsSync } from 'node:fs';
import os from 'node:os';

const FIXTURE = path.resolve(process.cwd(), 'tests/fixtures/810-basic.edi');
const TEST_DB = path.join(os.tmpdir(), `ediconvert-test-${Date.now()}.db`);

describe('CLI', () => {
  afterEach(() => {
    // Clean up test database files
    for (const ext of ['', '-shm', '-wal']) {
      const p = TEST_DB + ext;
      if (existsSync(p)) unlinkSync(p);
    }
  });

  it('parse command outputs JSON', () => {
    const result = execSync(`npx tsx --tsconfig tsconfig.cli-test.json packages/cli/src/index.ts parse ${FIXTURE}`, { encoding: 'utf-8' });
    const doc = JSON.parse(result);
    expect(doc.type).toBe('invoice');
  });

  it('validate command reports valid document', () => {
    const result = execSync(`npx tsx --tsconfig tsconfig.cli-test.json packages/cli/src/index.ts validate ${FIXTURE}`, { encoding: 'utf-8' });
    expect(result).toContain('valid');
  });

  it('shows help with no arguments', () => {
    const result = execSync(`npx tsx --tsconfig tsconfig.cli-test.json packages/cli/src/index.ts --help`, { encoding: 'utf-8' });
    expect(result).toContain('parse');
    expect(result).toContain('validate');
    expect(result).toContain('generate');
    expect(result).toContain('keys');
  });

  it('keys create generates an API key', () => {
    const result = execSync(
      `npx tsx --tsconfig tsconfig.cli-test.json packages/cli/src/index.ts keys create mykey --db=${TEST_DB}`,
      { encoding: 'utf-8' }
    );
    expect(result).toContain('API Key created:');
    expect(result).toContain('edi_live_');
    expect(result).toContain('Name: mykey');
    expect(result).toContain('Save this key');
  });

  it('keys create with partner scope includes partner info', () => {
    const result = execSync(
      `npx tsx --tsconfig tsconfig.cli-test.json packages/cli/src/index.ts keys create partnerkey --partner=acme --db=${TEST_DB}`,
      { encoding: 'utf-8' }
    );
    expect(result).toContain('API Key created:');
    expect(result).toContain('Partner scope: acme');
  });

  it('keys list shows empty message when no keys exist', () => {
    const result = execSync(
      `npx tsx --tsconfig tsconfig.cli-test.json packages/cli/src/index.ts keys list --db=${TEST_DB}`,
      { encoding: 'utf-8' }
    );
    expect(result).toContain('No API keys found.');
  });

  it('keys list shows created keys', () => {
    // Create a key first
    execSync(
      `npx tsx --tsconfig tsconfig.cli-test.json packages/cli/src/index.ts keys create testkey --db=${TEST_DB}`,
      { encoding: 'utf-8' }
    );
    // Then list
    const result = execSync(
      `npx tsx --tsconfig tsconfig.cli-test.json packages/cli/src/index.ts keys list --db=${TEST_DB}`,
      { encoding: 'utf-8' }
    );
    expect(result).toContain('Found 1 key(s)');
    expect(result).toContain('Label: testkey');
  });
});
