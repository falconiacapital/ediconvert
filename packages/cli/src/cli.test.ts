import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

const FIXTURE = path.resolve(process.cwd(), 'tests/fixtures/810-basic.edi');

describe('CLI', () => {
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
  });
});
