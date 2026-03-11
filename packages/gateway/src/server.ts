import express from 'express';
import type { Storage } from './storage.js';
import { translateToOcex } from '@ediconvert/core';

interface AppConfig {
  storage: Storage;
  requireAuth?: boolean;
}

export function createApp(config: AppConfig): express.Express {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.post('/v1/parse', (req, res) => {
    try {
      const doc = translateToOcex(req.body.edi);
      res.json(doc);
    } catch (err: any) {
      res.status(400).json(err.toJSON ? err.toJSON() : { error: { message: err.message } });
    }
  });

  function resourceRoutes(typeName: string, path: string) {
    app.get(path, (req, res) => {
      const docs = config.storage.listDocuments({
        type: typeName,
        partnerId: req.query.partner as string,
        since: req.query.since as string,
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
  }

  resourceRoutes('invoice', '/v1/invoices');
  resourceRoutes('order', '/v1/orders');
  resourceRoutes('catalog', '/v1/catalogs');
  resourceRoutes('shipment', '/v1/shipments');
  resourceRoutes('acknowledgment', '/v1/acknowledgments');

  return app;
}
