import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import { createHmac } from 'node:crypto';
import { WebhookManager } from './webhooks.js';
import { Storage } from './storage.js';

describe('WebhookManager', () => {
  let storage: Storage;
  let manager: WebhookManager;
  let server: http.Server;
  let receivedPayloads: any[];
  let receivedHeaders: Record<string, string>[];
  let serverPort: number;

  beforeEach(async () => {
    storage = new Storage(':memory:');
    manager = new WebhookManager(storage);
    receivedPayloads = [];
    receivedHeaders = [];

    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        receivedPayloads.push(JSON.parse(body));
        receivedHeaders.push(req.headers as Record<string, string>);
        res.writeHead(200);
        res.end();
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        serverPort = (server.address() as any).port;
        resolve();
      });
    });
  });

  afterEach(() => {
    storage.close();
    server.close();
  });

  it('registers a webhook', () => {
    manager.register({ url: `http://localhost:${serverPort}/hook`, events: ['invoice.received'] });
    const hooks = storage.listWebhooks();
    expect(hooks).toHaveLength(1);
  });

  it('stores a secret on webhook registration', () => {
    manager.register({ url: `http://localhost:${serverPort}/hook`, events: ['invoice.received'] });
    const hooks = storage.listWebhooks();
    expect(hooks[0].secret).toBeTruthy();
  });

  it('uses provided secret when registering', () => {
    manager.register({ url: `http://localhost:${serverPort}/hook`, events: ['invoice.received'], secret: 'my-secret' });
    const hooks = storage.listWebhooks();
    expect(hooks[0].secret).toBe('my-secret');
  });

  it('delivers webhook on matching event', async () => {
    manager.register({ url: `http://localhost:${serverPort}/hook`, events: ['invoice.received'] });
    await manager.deliver('invoice.received', { type: 'invoice', total: 100 });
    expect(receivedPayloads).toHaveLength(1);
    expect(receivedPayloads[0].event).toBe('invoice.received');
    expect(receivedPayloads[0].data.total).toBe(100);
  });

  it('does not deliver for non-matching events', async () => {
    manager.register({ url: `http://localhost:${serverPort}/hook`, events: ['order.received'] });
    await manager.deliver('invoice.received', { type: 'invoice', total: 100 });
    expect(receivedPayloads).toHaveLength(0);
  });

  it('includes X-EDI-Signature header on delivery', async () => {
    const secret = 'test-secret-key';
    manager.register({ url: `http://localhost:${serverPort}/hook`, events: ['invoice.received'], secret });
    await manager.deliver('invoice.received', { type: 'invoice', total: 200 });

    expect(receivedHeaders).toHaveLength(1);
    const signature = receivedHeaders[0]['x-edi-signature'];
    expect(signature).toBeTruthy();

    // Verify the signature is a valid HMAC-SHA256 of the payload
    const payload = receivedPayloads[0];
    const expectedSig = createHmac('sha256', secret)
      .update(JSON.stringify({ event: payload.event, data: payload.data, timestamp: payload.timestamp }))
      .digest('hex');
    expect(signature).toBe(expectedSig);
  });
});
