import { describe, it, expect } from 'vitest';
import { EDIConvert } from '../../packages/sdk/src/client.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const edi = new EDIConvert();
const fixturesDir = path.resolve(process.cwd(), 'tests/fixtures');

describe('End-to-End Round Trip', () => {
  describe('810 Invoice', () => {
    it('parses to OCEX and back with semantic equivalence', async () => {
      const raw = readFileSync(path.join(fixturesDir, '810-basic.edi'), 'utf-8');
      const doc = await edi.parse(raw);
      expect(doc.type).toBe('invoice');

      if (doc.type !== 'invoice') throw new Error('Expected invoice');
      expect(doc.invoiceNumber).toBe('HD-2026-0001');
      expect(doc.purchaseOrderRef).toBe('PO-5001');
      expect(doc.currency).toBe('USD');
      expect(doc.total).toBe(17600);
      expect(doc.lineItems).toHaveLength(2);
      expect(doc.lineItems[0].sku).toBe('SHG-001');
      expect(doc.lineItems[0].quantity).toBe(500);
      expect(doc.lineItems[0].unitPrice).toBe(29);
      expect(doc.lineItems[1].sku).toBe('NL-042');

      const regenerated = await edi.generate(doc);
      expect(typeof regenerated).toBe('string');
      expect(regenerated).toContain('ST*810');

      const reparsed = await edi.parse(regenerated);
      expect(reparsed.type).toBe(doc.type);

      if (reparsed.type !== 'invoice') throw new Error('Expected invoice after re-parse');
      expect(reparsed.invoiceNumber).toBe(doc.invoiceNumber);
      expect(reparsed.purchaseOrderRef).toBe(doc.purchaseOrderRef);
      expect(reparsed.currency).toBe(doc.currency);
      expect(reparsed.total).toBe(doc.total);
      expect(reparsed.lineItems).toHaveLength(doc.lineItems.length);
      expect(reparsed.lineItems[0].sku).toBe(doc.lineItems[0].sku);
      expect(reparsed.lineItems[0].quantity).toBe(doc.lineItems[0].quantity);
      expect(reparsed.lineItems[0].unitPrice).toBe(doc.lineItems[0].unitPrice);
      expect(reparsed.lineItems[1].sku).toBe(doc.lineItems[1].sku);
    });
  });

  describe('850 Purchase Order', () => {
    it('parses to OCEX JSON', async () => {
      const raw = readFileSync(path.join(fixturesDir, '850-basic.edi'), 'utf-8');
      const doc = await edi.parse(raw);
      expect(doc.type).toBe('order');

      if (doc.type !== 'order') throw new Error('Expected order');
      expect(doc.orderNumber).toBe('PO-5001');
      expect(doc.lineItems).toHaveLength(2);
      expect(doc.lineItems[0].sku).toBe('SHG-001');
      expect(doc.lineItems[1].sku).toBe('NL-042');
    });
  });

  describe('832 Price Catalog', () => {
    it('parses to OCEX JSON', async () => {
      const raw = readFileSync(path.join(fixturesDir, '832-basic.edi'), 'utf-8');
      const doc = await edi.parse(raw);
      expect(doc.type).toBe('catalog');

      if (doc.type !== 'catalog') throw new Error('Expected catalog');
      expect(doc.catalogId).toBe('CAT-2026-Q1');
      expect(doc.effectiveDate).toBe('2021-09-01');
    });
  });

  describe('856 Ship Notice', () => {
    it('parses to OCEX JSON', async () => {
      const raw = readFileSync(path.join(fixturesDir, '856-basic.edi'), 'utf-8');
      const doc = await edi.parse(raw);
      expect(doc.type).toBe('shipment');

      if (doc.type !== 'shipment') throw new Error('Expected shipment');
      expect(doc.shipmentId).toBe('SHIP-001');
      expect(doc.trackingNumber).toBe('TRACK123456');
      expect(doc.carrier).toBe('FEDX');
    });
  });

  describe('997 Functional Acknowledgment', () => {
    it('parses to OCEX JSON', async () => {
      const raw = readFileSync(path.join(fixturesDir, '997-basic.edi'), 'utf-8');
      const doc = await edi.parse(raw);
      expect(doc.type).toBe('acknowledgment');

      if (doc.type !== 'acknowledgment') throw new Error('Expected acknowledgment');
      expect(doc.accepted).toBe(true);
    });
  });
});
