import { describe, it, expect } from 'vitest';
import type {
  OcexDocument, OcexInvoice, OcexOrder, OcexCatalog, OcexShipment, OcexAcknowledgment,
  OcexLineItem, OcexAddress, OcexParty,
} from './types.js';

describe('OCEX Types', () => {
  it('creates a valid invoice document', () => {
    const invoice: OcexInvoice = {
      type: 'invoice', id: 'INV-001', version: 'ocex-1.0.0',
      sender: { id: 'HOMEDEPOT', name: 'Home Depot' },
      receiver: { id: 'SUPPLIER1', name: 'ABC Supply' },
      documentDate: '2026-03-10',
      invoiceNumber: 'HD-2026-0001', purchaseOrderRef: 'PO-5001', currency: 'USD',
      lineItems: [{
        lineNumber: 1, sku: 'SHG-001', description: 'Architectural Shingles',
        quantity: 500, unitOfMeasure: 'EA', unitPrice: 29.00, totalPrice: 14500.00,
      }],
      total: 15660.00,
    };
    expect(invoice.type).toBe('invoice');
    expect(invoice.lineItems).toHaveLength(1);
    expect(invoice.total).toBe(15660.00);
  });

  it('creates a valid purchase order', () => {
    const order: OcexOrder = {
      type: 'order', id: 'ORD-001', version: 'ocex-1.0.0',
      sender: { id: 'SUPPLIER1', name: 'ABC Supply' },
      receiver: { id: 'HOMEDEPOT', name: 'Home Depot' },
      documentDate: '2026-03-10', orderNumber: 'PO-5001',
      shipTo: { street: '123 Main St', city: 'Atlanta', state: 'GA', zip: '30301', country: 'US' },
      lineItems: [{
        lineNumber: 1, sku: 'SHG-001', description: 'Architectural Shingles',
        quantity: 500, unitOfMeasure: 'EA', unitPrice: 29.00, totalPrice: 14500.00,
      }],
      total: 14500.00,
    };
    expect(order.type).toBe('order');
  });

  it('creates a valid acknowledgment', () => {
    const ack: OcexAcknowledgment = {
      type: 'acknowledgment', id: 'ACK-001', version: 'ocex-1.0.0',
      sender: { id: 'HOMEDEPOT', name: 'Home Depot' },
      receiver: { id: 'SUPPLIER1', name: 'ABC Supply' },
      documentDate: '2026-03-10', referencedDocumentId: 'ORD-001',
      accepted: true, errors: [],
    };
    expect(ack.accepted).toBe(true);
  });
});
