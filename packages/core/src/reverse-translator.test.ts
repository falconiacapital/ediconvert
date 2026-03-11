import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { translateToOcex } from './translator.js';
import { translateToX12 } from './reverse-translator.js';
import type { OcexInvoice, OcexOrder, OcexCatalog, OcexShipment, OcexAcknowledgment } from './types.js';

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

  // ── 850 Purchase Order ──────────────────────────────────────────────────────

  it('generates valid X12 from an OCEX order', () => {
    const order: OcexOrder = {
      type: 'order', id: 'ORD-001', version: 'ocex-1.0.0',
      sender: { id: 'SUPPLIER1', name: 'ABC Supply' },
      receiver: { id: 'HOMEDEPOT', name: 'Home Depot' },
      documentDate: '2021-09-01',
      orderNumber: 'PO-5001',
      shipTo: { street: '456 Oak Ave', city: 'Atlanta', state: 'GA', zip: '30301', country: 'US' },
      lineItems: [
        { lineNumber: 1, sku: 'SHG-001', description: 'Architectural Shingles', quantity: 500, unitOfMeasure: 'EA', unitPrice: 29.0, totalPrice: 14500.0 },
      ],
      total: 14500.0,
    };

    const edi = translateToX12(order);
    expect(edi).toContain('ST*850*');
    expect(edi).toContain('BEG*00*NE*PO-5001');
    expect(edi).toContain('N1*BY*ABC Supply*92*SUPPLIER1');
    expect(edi).toContain('N1*SE*Home Depot*92*HOMEDEPOT');
    expect(edi).toContain('PO1*1*500*EA*29');
    expect(edi).toContain('CTT*1');
    expect(edi).toContain('SE*');
  });

  it('round-trips an 850 with semantic equivalence', () => {
    const raw = readFileSync(path.join(fixturesDir, '850-basic.edi'), 'utf-8');
    const ocex = translateToOcex(raw) as OcexOrder;
    const regenerated = translateToX12(ocex);
    const reparsed = translateToOcex(regenerated) as OcexOrder;

    expect(reparsed.type).toBe('order');
    expect(reparsed.orderNumber).toBe(ocex.orderNumber);
    expect(reparsed.sender.id).toBe(ocex.sender.id);
    expect(reparsed.receiver.id).toBe(ocex.receiver.id);
    expect(reparsed.lineItems.length).toBe(ocex.lineItems.length);
    expect(reparsed.lineItems[0].sku).toBe(ocex.lineItems[0].sku);
    expect(reparsed.lineItems[0].quantity).toBe(ocex.lineItems[0].quantity);
  });

  // ── 832 Price Catalog ───────────────────────────────────────────────────────

  it('generates valid X12 from an OCEX catalog', () => {
    const catalog: OcexCatalog = {
      type: 'catalog', id: 'CAT-001', version: 'ocex-1.0.0',
      sender: { id: 'HOMEDEPOT', name: 'Home Depot' },
      receiver: { id: 'SUPPLIER1', name: 'ABC Supply' },
      documentDate: '2021-09-01',
      catalogId: 'CAT-2026-Q1',
      effectiveDate: '2021-09-01',
      items: [
        { lineNumber: 1, sku: 'SHG-001', description: 'Architectural Shingles', quantity: 1, unitOfMeasure: 'EA', unitPrice: 29.0, totalPrice: 29.0 },
      ],
    };

    const edi = translateToX12(catalog);
    expect(edi).toContain('ST*832*');
    expect(edi).toContain('BCT*00*CAT-2026-Q1');
    expect(edi).toContain('DTM*007*20210901');
    expect(edi).toContain('LIN**VP*SHG-001');
    expect(edi).toContain('CTP*WS**29');
    expect(edi).toContain('SE*');
  });

  it('round-trips an 832 with semantic equivalence', () => {
    const raw = readFileSync(path.join(fixturesDir, '832-basic.edi'), 'utf-8');
    const ocex = translateToOcex(raw) as OcexCatalog;
    const regenerated = translateToX12(ocex);
    const reparsed = translateToOcex(regenerated) as OcexCatalog;

    // Forward translator stores catalog items as lineItems (not items) in the result object
    type WithLineItems = { lineItems: OcexCatalog['items'] };
    const ocexItems = (ocex as unknown as WithLineItems).lineItems ?? ocex.items ?? [];
    const reparsedItems = (reparsed as unknown as WithLineItems).lineItems ?? reparsed.items ?? [];

    expect(reparsed.type).toBe('catalog');
    expect(reparsed.catalogId).toBe(ocex.catalogId);
    expect(reparsedItems.length).toBe(ocexItems.length);
    expect(reparsedItems[0].sku).toBe(ocexItems[0].sku);
    expect(reparsedItems[0].unitPrice).toBe(ocexItems[0].unitPrice);
  });

  // ── 856 Ship Notice ─────────────────────────────────────────────────────────

  it('generates valid X12 from an OCEX shipment', () => {
    const shipment: OcexShipment = {
      type: 'shipment', id: 'SHIP-001', version: 'ocex-1.0.0',
      sender: { id: 'SUPPLIER1', name: 'ABC Supply' },
      receiver: { id: 'HOMEDEPOT', name: 'Home Depot' },
      documentDate: '2021-09-01',
      shipmentId: 'SHIP-001',
      orderRef: 'PO-5001',
      carrier: 'FEDX',
      trackingNumber: 'TRACK123456',
      shipDate: '2021-09-01',
      shipFrom: { street: '123 Warehouse Ln', city: 'ABC Warehouse', state: 'GA', zip: '30301', country: 'US' },
      shipTo: { street: '456 Main St', city: 'Home Depot Store 101', state: 'GA', zip: '30302', country: 'US' },
      lineItems: [
        { lineNumber: 1, sku: 'SHG-001', description: 'Architectural Shingles', quantity: 500, unitOfMeasure: 'EA', unitPrice: 29.0, totalPrice: 14500.0 },
      ],
    };

    const edi = translateToX12(shipment);
    expect(edi).toContain('ST*856*');
    expect(edi).toContain('BSN*00*SHIP-001*20210901');
    expect(edi).toContain('TD5**ZZ*FEDX');
    expect(edi).toContain('REF*CN*TRACK123456');
    expect(edi).toContain('SN1**500*EA');
    expect(edi).toContain('LIN**VP*SHG-001');
    expect(edi).toContain('SE*');
  });

  it('round-trips an 856 with semantic equivalence', () => {
    const raw = readFileSync(path.join(fixturesDir, '856-basic.edi'), 'utf-8');
    const ocex = translateToOcex(raw) as OcexShipment;
    const regenerated = translateToX12(ocex);
    const reparsed = translateToOcex(regenerated) as OcexShipment;

    expect(reparsed.type).toBe('shipment');
    expect(reparsed.shipmentId).toBe(ocex.shipmentId);
    expect(reparsed.carrier).toBe(ocex.carrier);
    expect(reparsed.trackingNumber).toBe(ocex.trackingNumber);
    expect(reparsed.lineItems.length).toBe(ocex.lineItems.length);
    expect(reparsed.lineItems[0].sku).toBe(ocex.lineItems[0].sku);
    expect(reparsed.lineItems[0].quantity).toBe(ocex.lineItems[0].quantity);
  });

  // ── 997 Functional Acknowledgment ──────────────────────────────────────────

  it('generates valid X12 from an OCEX acknowledgment (accepted)', () => {
    const ack: OcexAcknowledgment = {
      type: 'acknowledgment', id: 'ACK-001', version: 'ocex-1.0.0',
      sender: { id: 'HOMEDEPOT', name: 'Home Depot' },
      receiver: { id: 'SUPPLIER1', name: 'ABC Supply' },
      documentDate: '2021-09-01',
      referencedDocumentId: '1',
      accepted: true,
      errors: [],
    };

    const edi = translateToX12(ack);
    expect(edi).toContain('ST*997*');
    expect(edi).toContain('AK1*FA*1');
    expect(edi).toContain('AK9*A*');
    expect(edi).toContain('SE*');
  });

  it('generates valid X12 from an OCEX acknowledgment (rejected)', () => {
    const ack: OcexAcknowledgment = {
      type: 'acknowledgment', id: 'ACK-002', version: 'ocex-1.0.0',
      sender: { id: 'HOMEDEPOT', name: 'Home Depot' },
      receiver: { id: 'SUPPLIER1', name: 'ABC Supply' },
      documentDate: '2021-09-01',
      referencedDocumentId: '2',
      accepted: false,
      errors: [{ code: 'E01', message: 'Invalid segment' }],
    };

    const edi = translateToX12(ack);
    expect(edi).toContain('ST*997*');
    expect(edi).toContain('AK9*R*');
    expect(edi).toContain('SE*');
  });

  it('round-trips a 997 with semantic equivalence', () => {
    const raw = readFileSync(path.join(fixturesDir, '997-basic.edi'), 'utf-8');
    const ocex = translateToOcex(raw) as OcexAcknowledgment;
    const regenerated = translateToX12(ocex);
    const reparsed = translateToOcex(regenerated) as OcexAcknowledgment;

    expect(reparsed.type).toBe('acknowledgment');
    expect(reparsed.referencedDocumentId).toBe(ocex.referencedDocumentId);
    expect(reparsed.accepted).toBe(ocex.accepted);
  });
});
