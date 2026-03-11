import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from './server.js';
import { Storage } from './storage.js';
import request from 'supertest';

describe('Gateway API', () => {
  let app: any;
  let storage: Storage;

  beforeAll(() => {
    storage = new Storage(':memory:');
    app = createApp({ storage, requireAuth: false });
  });
  afterAll(() => storage.close());

  it('POST /v1/parse returns OCEX JSON from raw EDI', async () => {
    const edi = 'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *210901*1234*^*00501*000000001*0*P*:~GS*FA*SENDER*RECEIVER*20210901*1234*1*X*005010~ST*997*0001~AK1*PO*1~AK9*A*1*1*1~SE*4*0001~GE*1*1~IEA*1*000000001~';
    const res = await request(app).post('/v1/parse').send({ edi }).expect(200);
    expect(res.body.type).toBe('acknowledgment');
  });

  it('GET /v1/invoices returns stored invoices', async () => {
    storage.saveDocument({ id: 'inv-1', type: 'invoice', partnerId: 'HD', data: { type: 'invoice', total: 100 }, rawEdi: '' });
    const res = await request(app).get('/v1/invoices').expect(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('GET /v1/invoices/:id returns single invoice', async () => {
    const res = await request(app).get('/v1/invoices/inv-1').expect(200);
    expect(res.body.data.type).toBe('invoice');
  });

  it('returns 404 for unknown document', async () => {
    await request(app).get('/v1/invoices/nope').expect(404);
  });
});
