import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import { WebhookManager } from './webhooks.js';
import { Storage } from './storage.js';

describe('WebhookManager', () => {
  let storage: Storage;
  let manager: WebhookManager;
  let server: http.Server;
  let receivedPayloads: any[];
  let serverPort: number;

  beforeEach(async () => {
    storage = new Storage(':memory:');
    manager = new WebhookManager(storage);
    receivedPayloads = [];

    server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        receivedPayloads.push(JSON.parse(body));
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
});
