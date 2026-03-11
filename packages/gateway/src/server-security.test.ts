import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from './server.js';
import { Storage } from './storage.js';
import { unlinkSync } from 'node:fs';

const DB_PATH = 'test-security-gateway.db';

describe('Gateway — security hardening', () => {
  let storage: Storage;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    storage = new Storage(DB_PATH);
    app = createApp({ storage, requireAuth: false });
  });

  afterEach(() => {
    storage.close();
    try { unlinkSync(DB_PATH); } catch {}
    try { unlinkSync(DB_PATH + '-wal'); } catch {}
    try { unlinkSync(DB_PATH + '-shm'); } catch {}
  });

  it('clamps limit parameter to prevent DoS', async () => {
    const res = await request(app).get('/v1/invoices?limit=999999999');
    expect(res.status).toBe(200);
    // Should not crash or return unbounded results
  });

  it('handles negative limit gracefully', async () => {
    const res = await request(app).get('/v1/invoices?limit=-5');
    expect(res.status).toBe(200);
  });

  it('handles non-numeric limit gracefully', async () => {
    const res = await request(app).get('/v1/invoices?limit=abc');
    expect(res.status).toBe(200);
  });

  it('rejects webhook with invalid URL scheme', async () => {
    const res = await request(app)
      .post('/v1/webhooks')
      .send({ url: 'file:///etc/passwd', events: ['invoice.received'] });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('http');
  });

  it('rejects webhook with non-URL string', async () => {
    const res = await request(app)
      .post('/v1/webhooks')
      .send({ url: 'not-a-url', events: ['invoice.received'] });
    expect(res.status).toBe(400);
  });

  it('rejects webhook with javascript: URL', async () => {
    const res = await request(app)
      .post('/v1/webhooks')
      .send({ url: 'javascript:alert(1)', events: ['invoice.received'] });
    expect(res.status).toBe(400);
  });

  it('accepts webhook with valid https URL', async () => {
    const res = await request(app)
      .post('/v1/webhooks')
      .send({ url: 'https://example.com/hook', events: ['invoice.received'] });
    expect(res.status).toBe(201);
  });

  it('does not leak stack traces on parse errors', async () => {
    const res = await request(app)
      .post('/v1/parse')
      .send({ edi: 'GARBAGE INPUT' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(JSON.stringify(res.body)).not.toContain('at ');
    expect(JSON.stringify(res.body)).not.toContain('.ts:');
  });

  it('handles missing body on POST /v1/parse', async () => {
    const res = await request(app)
      .post('/v1/parse')
      .send({});
    expect(res.status).toBe(400);
  });

  it('SQL injection attempt in type filter is safe', async () => {
    const res = await request(app)
      .get("/v1/invoices?partner='; DROP TABLE documents--");
    expect(res.status).toBe(200);
    // Verify DB still works
    const res2 = await request(app).get('/v1/invoices');
    expect(res2.status).toBe(200);
  });
});
