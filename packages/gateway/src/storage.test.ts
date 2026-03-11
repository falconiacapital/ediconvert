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

  it('respects limit parameter in listDocuments', () => {
    storage.saveDocument({ id: '1', type: 'invoice', partnerId: 'HD', data: {}, rawEdi: '' });
    storage.saveDocument({ id: '2', type: 'invoice', partnerId: 'HD', data: {}, rawEdi: '' });
    storage.saveDocument({ id: '3', type: 'invoice', partnerId: 'HD', data: {}, rawEdi: '' });
    const docs = storage.listDocuments({ limit: 2 });
    expect(docs).toHaveLength(2);
  });

  it('countDocuments returns correct count by type', () => {
    storage.saveDocument({ id: '1', type: 'invoice', partnerId: 'HD', data: {}, rawEdi: '' });
    storage.saveDocument({ id: '2', type: 'order', partnerId: 'HD', data: {}, rawEdi: '' });
    storage.saveDocument({ id: '3', type: 'invoice', partnerId: 'HD', data: {}, rawEdi: '' });
    expect(storage.countDocuments({ type: 'invoice' })).toBe(2);
    expect(storage.countDocuments({ type: 'order' })).toBe(1);
    expect(storage.countDocuments({ type: 'catalog' })).toBe(0);
    expect(storage.countDocuments()).toBe(3);
  });

  it('stores and retrieves api key by prefix', () => {
    storage.saveApiKey({ keyHash: 'hash1', prefix: 'abcd1234', label: 'test', partnerScope: undefined });
    const keys = storage.getApiKeysByPrefix('abcd1234');
    expect(keys).toHaveLength(1);
    expect(keys[0].label).toBe('test');
    expect(keys[0].keyHash).toBe('hash1');
  });

  it('getApiKeysByPrefix returns empty array for unknown prefix', () => {
    const keys = storage.getApiKeysByPrefix('unknown_');
    expect(keys).toHaveLength(0);
  });

  it('stores and retrieves webhook with secret', () => {
    storage.saveWebhook({ id: 'wh-1', url: 'http://example.com', events: ['invoice.received'], secret: 'mysecret' });
    const hooks = storage.listWebhooks();
    expect(hooks).toHaveLength(1);
    expect(hooks[0].secret).toBe('mysecret');
  });
});
