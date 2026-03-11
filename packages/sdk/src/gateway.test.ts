import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EDIConvert } from './client.js';
import { createApp } from '../../gateway/src/server.js';
import { Storage } from '../../gateway/src/storage.js';
import http from 'node:http';

describe('EDIConvert — gateway mode', () => {
  let server: http.Server;
  let port: number;
  let storage: Storage;
  let edi: EDIConvert;

  beforeAll(async () => {
    storage = new Storage(':memory:');
    storage.saveDocument({ id: 'inv-1', type: 'invoice', partnerId: 'HD', data: { type: 'invoice', invoiceNumber: 'HD-001', total: 15660 }, rawEdi: '' });
    const app = createApp({ storage, requireAuth: false });
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as any).port;
        resolve();
      });
    });
    edi = new EDIConvert({ apiKey: 'test-key', gateway: `http://localhost:${port}` });
  });

  afterAll(() => { storage.close(); server.close(); });

  it('lists invoices from gateway', async () => {
    const result = await edi.invoices.list({});
    expect(result).toHaveLength(1);
    expect(result[0].data.invoiceNumber).toBe('HD-001');
  });

  it('lists orders (empty)', async () => {
    const result = await edi.orders.list({});
    expect(result).toHaveLength(0);
  });
});
