import { describe, it, expect } from 'vitest';
import { translateToX12 } from './reverse-translator.js';
import type { OcexDocument, OcexInvoice } from './types.js';

describe('Reverse Translator — edge cases', () => {
  const baseInvoice: OcexInvoice = {
    type: 'invoice',
    id: 'test-1',
    version: 'ocex-1.0.0',
    documentDate: '2026-03-10',
    invoiceNumber: 'INV-001',
    sender: { id: 'SENDER', name: 'Sender Co' },
    receiver: { id: 'RECEIVER', name: 'Receiver Co' },
    currency: 'USD',
    lineItems: [{
      lineNumber: 1,
      sku: 'SKU-001',
      description: 'Widget',
      quantity: 10,
      unitOfMeasure: 'EA',
      unitPrice: 5.99,
      totalPrice: 59.90,
    }],
    subtotal: 59.90,
    tax: 0,
    total: 59.90,
  };

  it('generates valid X12 for a complete invoice', () => {
    const x12 = translateToX12(baseInvoice);
    expect(x12).toContain('ISA*');
    expect(x12).toContain('ST*810*');
    expect(x12).toContain('INV-001');
  });

  it('throws on unsupported document type', () => {
    const bad = { ...baseInvoice, type: 'unknown_type' } as unknown as OcexDocument;
    expect(() => translateToX12(bad)).toThrow();
  });

  it('handles zero total correctly', () => {
    const zeroInvoice = { ...baseInvoice, total: 0, subtotal: 0 };
    const x12 = translateToX12(zeroInvoice);
    expect(x12).toContain('TDS*0~');
  });

  it('handles large monetary values without overflow', () => {
    const bigInvoice = { ...baseInvoice, total: 999999.99, subtotal: 999999.99 };
    const x12 = translateToX12(bigInvoice);
    expect(x12).toContain('TDS*99999999~');
  });

  it('handles special characters in names', () => {
    const specialInvoice = {
      ...baseInvoice,
      sender: { id: 'SEND&CO', name: 'Sender & Co <LLC>' },
    };
    const x12 = translateToX12(specialInvoice);
    expect(x12).toContain('SEND&CO');
  });
});
