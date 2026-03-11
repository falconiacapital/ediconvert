import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import YAML from 'yaml';
import type { TransactionMapping } from './types.js';

// Support both ESM (import.meta.url) and CJS (__dirname) contexts
const _dirname: string = (typeof __dirname !== 'undefined')
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));

function findMappingsDir(): string {
  // When running from source (dev/test): packages/core/src/mapping/ -> ../../../../mappings/x12
  const fromSource = resolve(_dirname, '../../../../mappings/x12');
  if (existsSync(fromSource)) return fromSource;

  // When installed as npm package: dist/ -> ../mappings/x12
  const fromDist = resolve(_dirname, '../mappings/x12');
  if (existsSync(fromDist)) return fromDist;

  // Fallback: relative to package root
  const fromPackageRoot = resolve(_dirname, '../../mappings/x12');
  if (existsSync(fromPackageRoot)) return fromPackageRoot;

  throw new Error('Cannot find mappings directory. Ensure @ediconvert/core is properly installed.');
}

export const MAPPINGS_DIR = findMappingsDir();

export function loadMapping(filePath: string): TransactionMapping {
  const content = readFileSync(filePath, 'utf-8');
  return YAML.parse(content) as TransactionMapping;
}
