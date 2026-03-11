import express from 'express';
import { randomUUID } from 'node:crypto';
import type { Storage } from './storage.js';
import { translateToOcex } from '@ediconvert/core';
import { WebhookManager } from './webhooks.js';
import type { AuthManager } from './auth.js';
import { addDashboardRoutes } from './dashboard.js';

interface AppConfig {
  storage: Storage;
  requireAuth?: boolean;
  authManager?: AuthManager;
  webhookManager?: WebhookManager;
}

export function createApp(config: AppConfig): express.Express {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const webhookManager = config.webhookManager ?? new WebhookManager(config.storage);

  // Apply auth middleware to all API routes when requireAuth is enabled
  if (config.requireAuth && config.authManager) {
    app.use('/v1', config.authManager.middleware());
  }

  addDashboardRoutes(app, config.storage);

  app.post('/v1/parse', (req, res) => {
    try {
      const doc = translateToOcex(req.body.edi);
      res.json({ data: [doc] });
    } catch (err: any) {
      res.status(400).json(err.toJSON ? err.toJSON() : { error: { message: err.message } });
    }
  });

  function resourceRoutes(typeName: string, path: string) {
    app.get(path, (req, res) => {
      const limitParam = req.query.limit;
      const limit = limitParam !== undefined ? Number(limitParam) : undefined;
      const docs = config.storage.listDocuments({
        type: typeName,
        partnerId: req.query.partner as string,
        since: req.query.since as string,
        limit,
      });
      res.json({ data: docs });
    });

    app.get(`${path}/:id`, (req, res) => {
      const doc = config.storage.getDocument(req.params.id);
      if (!doc || doc.type !== typeName) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
        return;
      }
      res.json({ data: doc });
    });

    app.post(path, async (req, res) => {
      const body = req.body as Record<string, unknown>;
      if (!body || body.type !== typeName) {
        res.status(400).json({ error: { code: 'INVALID_INPUT', message: `type must be "${typeName}"` } });
        return;
      }

      const id = (body.id as string | undefined) ?? `${typeName}-${randomUUID()}`;
      const partnerId = (body.sender as { id?: string } | undefined)?.id ?? 'unknown';

      const record = {
        id,
        type: typeName,
        partnerId,
        data: body,
        rawEdi: '',
      };

      config.storage.saveDocument(record);

      try {
        await webhookManager.deliver(`${typeName}.received`, body);
      } catch {
        // Webhook failures should not prevent the response
      }

      res.status(201).json({ data: record });
    });
  }

  resourceRoutes('invoice', '/v1/invoices');
  resourceRoutes('order', '/v1/orders');
  resourceRoutes('catalog', '/v1/catalogs');
  resourceRoutes('shipment', '/v1/shipments');
  resourceRoutes('acknowledgment', '/v1/acknowledgments');

  app.post('/v1/webhooks', (req, res) => {
    const { url, events, secret } = req.body as { url?: string; events?: string[]; secret?: string };
    if (!url || !Array.isArray(events) || events.length === 0) {
      res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'url and events are required' } });
      return;
    }
    webhookManager.register({ url, events, secret });
    res.status(201).json({ data: { url, events } });
  });

  app.get('/v1/webhooks', (_req, res) => {
    const hooks = config.storage.listWebhooks();
    res.json({ data: hooks });
  });

  return app;
}
