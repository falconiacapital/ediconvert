import { describe, it, expect, beforeEach } from 'vitest';
import { Storage } from './storage.js';

describe('Storage', () => {
  let storage: Storage;
  beforeEach(() => { storage = new Storage(':memory:'); });

  it('stores and retrieves a document', () => {
    storage.saveDocument({ id: 'inv-001', type: 'invoice', partnerId: 'HOMEDEPOT', data: { type: 'invoice', total: 15660 }, rawEdi: 'ISA*...' });
    const doc = storage.getDocument('inv-001');
    expect(doc).toBeDefined();
    expect(doc!.type).toBe('invoice');
    expect(doc!.data.total).toBe(15660);
  });

  it('lists documents by type', () => {
    storage.saveDocument({ id: '1', type: 'invoice', partnerId: 'HD', data: {}, rawEdi: '' });
    storage.saveDocument({ id: '2', type: 'order', partnerId: 'HD', data: {}, rawEdi: '' });
    storage.saveDocument({ id: '3', type: 'invoice', partnerId: 'HD', data: {}, rawEdi: '' });
    const invoices = storage.listDocuments({ type: 'invoice' });
    expect(invoices).toHaveLength(2);
  });

  it('lists documents by partner', () => {
    storage.saveDocument({ id: '1', type: 'invoice', partnerId: 'HD', data: {}, rawEdi: '' });
    storage.saveDocument({ id: '2', type: 'invoice', partnerId: 'SRS', data: {}, rawEdi: '' });
    const docs = storage.listDocuments({ partnerId: 'HD' });
    expect(docs).toHaveLength(1);
  });
});
