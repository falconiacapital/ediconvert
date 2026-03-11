import { describe, it, expect } from 'vitest';
import { EDIConvert } from './client.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('EDIConvert — local mode', () => {
  const edi = new EDIConvert();

  it('parses an 810 EDI string to OCEX JSON', async () => {
    const raw = readFileSync(
      path.resolve(process.cwd(), 'tests/fixtures/810-basic.edi'),
      'utf-8',
    );
    const doc = await edi.parse(raw);
    expect(doc.type).toBe('invoice');
    expect((doc as any).invoiceNumber).toBe('HD-2026-0001');
  });

  it('generates X12 from OCEX JSON', async () => {
    const raw = readFileSync(
      path.resolve(process.cwd(), 'tests/fixtures/810-basic.edi'),
      'utf-8',
    );
    const doc = await edi.parse(raw);
    const x12 = await edi.generate(doc);
    expect(x12).toContain('ST*810*');
    expect(x12).toContain('HD-2026-0001');
  });

  it('throws if gateway methods called without config', async () => {
    await expect(edi.invoices.list({})).rejects.toThrow('Gateway mode requires');
  });
});
