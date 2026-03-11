// packages/core/src/translator.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { translateToOcex } from './translator.js';
import type { OcexInvoice } from './types.js';

const fixturesDir = path.resolve(process.cwd(), 'tests/fixtures');

describe('translateToOcex', () => {
  it('translates an 810 EDI to an OCEX invoice', () => {
    const raw = readFileSync(path.join(fixturesDir, '810-basic.edi'), 'utf-8');
    const doc = translateToOcex(raw) as OcexInvoice;

    expect(doc.type).toBe('invoice');
    expect(doc.invoiceNumber).toBe('HD-2026-0001');
    expect(doc.purchaseOrderRef).toBe('PO-5001');
    expect(doc.currency).toBe('USD');
    expect(doc.sender.name).toBe('Home Depot');
    expect(doc.sender.id).toBe('HOMEDEPOT');
    expect(doc.receiver.name).toBe('ABC Supply');
    expect(doc.receiver.id).toBe('SUPPLIER1');
  });

  it('extracts line items from IT1/PID loops', () => {
    const raw = readFileSync(path.join(fixturesDir, '810-basic.edi'), 'utf-8');
    const doc = translateToOcex(raw) as OcexInvoice;

    expect(doc.lineItems).toHaveLength(2);
    expect(doc.lineItems[0].sku).toBe('SHG-001');
    expect(doc.lineItems[0].quantity).toBe(500);
    expect(doc.lineItems[0].unitPrice).toBe(29.0);
    expect(doc.lineItems[0].description).toBe('Architectural Shingles');
    expect(doc.lineItems[1].sku).toBe('NL-042');
    expect(doc.lineItems[1].quantity).toBe(200);
  });

  it('parses total from TDS (implied decimal)', () => {
    const raw = readFileSync(path.join(fixturesDir, '810-basic.edi'), 'utf-8');
    const doc = translateToOcex(raw) as OcexInvoice;
    // TDS*1760000 = $17,600.00 (implied 2 decimal places)
    expect(doc.total).toBe(17600.0);
  });
});
