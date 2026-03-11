import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { translateToOcex } from './translator.js';
import { translateToX12 } from './reverse-translator.js';
import type { OcexInvoice } from './types.js';

const fixturesDir = path.resolve(process.cwd(), 'tests/fixtures');

describe('translateToX12', () => {
  it('generates valid X12 from an OCEX invoice', () => {
    const invoice: OcexInvoice = {
      type: 'invoice', id: 'INV-001', version: 'ocex-1.0.0',
      sender: { id: 'HOMEDEPOT', name: 'Home Depot' },
      receiver: { id: 'SUPPLIER1', name: 'ABC Supply' },
      documentDate: '2021-09-01',
      invoiceNumber: 'HD-2026-0001', purchaseOrderRef: 'PO-5001', currency: 'USD',
      lineItems: [{
        lineNumber: 1, sku: 'SHG-001', description: 'Architectural Shingles',
        quantity: 500, unitOfMeasure: 'EA', unitPrice: 29.0, totalPrice: 14500.0,
      }],
      total: 15660.0,
    };

    const edi = translateToX12(invoice);
    expect(edi).toContain('ST*810*');
    expect(edi).toContain('BIG*20210901*HD-2026-0001*PO-5001');
    expect(edi).toContain('N1*SE*Home Depot*92*HOMEDEPOT');
    expect(edi).toContain('N1*BY*ABC Supply*92*SUPPLIER1');
    expect(edi).toContain('IT1*1*500*EA*29');
    expect(edi).toContain('TDS*1566000');
    expect(edi).toContain('SE*');
  });

  it('round-trips an 810 with semantic equivalence', () => {
    const raw = readFileSync(path.join(fixturesDir, '810-basic.edi'), 'utf-8');
    const ocex = translateToOcex(raw) as OcexInvoice;
    const regenerated = translateToX12(ocex);
    const reparsed = translateToOcex(regenerated) as OcexInvoice;

    expect(reparsed.invoiceNumber).toBe(ocex.invoiceNumber);
    expect(reparsed.purchaseOrderRef).toBe(ocex.purchaseOrderRef);
    expect(reparsed.sender.id).toBe(ocex.sender.id);
    expect(reparsed.receiver.id).toBe(ocex.receiver.id);
    expect(reparsed.total).toBe(ocex.total);
    expect(reparsed.lineItems.length).toBe(ocex.lineItems.length);
    expect(reparsed.lineItems[0].sku).toBe(ocex.lineItems[0].sku);
  });
});
