import { describe, it, expect } from 'vitest';
import { loadMapping, MAPPINGS_DIR } from './loader.js';
import { resolve } from 'node:path';

describe('loadMapping', () => {
  it('loads 810 mapping from YAML', () => {
    const mappingPath = resolve(MAPPINGS_DIR, '810.yaml');
    const mapping = loadMapping(mappingPath);
    expect(mapping.transactionSet).toBe('810');
    expect(mapping.ocexType).toBe('invoice');
    expect(mapping.fields.length).toBeGreaterThan(0);
  });

  it('parses field mappings correctly', () => {
    const mappingPath = resolve(MAPPINGS_DIR, '810.yaml');
    const mapping = loadMapping(mappingPath);
    const dateField = mapping.fields.find((f) => f.field === 'documentDate');
    expect(dateField).toBeDefined();
    expect(dateField!.segment).toBe('BIG');
    expect(dateField!.element).toBe(0);
    expect(dateField!.transform).toBe('date');
  });

  it('parses line item mappings', () => {
    const mappingPath = resolve(MAPPINGS_DIR, '810.yaml');
    const mapping = loadMapping(mappingPath);
    expect(mapping.lineItems).toBeDefined();
    expect(mapping.lineItems!.loopSegment).toBe('IT1');
    expect(mapping.lineItems!.fields.length).toBeGreaterThan(0);
  });

  it('throws for non-existent file', () => {
    expect(() => loadMapping('/not/real.yaml')).toThrow();
  });
});
