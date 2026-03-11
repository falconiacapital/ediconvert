import { createApp } from '@ediconvert/gateway';
import { Storage } from '@ediconvert/gateway';
import { EDIConvert } from '@ediconvert/sdk';
import { translateToOcex } from '@ediconvert/core';
import { readFileSync } from 'node:fs';
import http from 'node:http';

// 1. Set up gateway
const storage = new Storage(':memory:');
// Auth disabled for demo. In production, set requireAuth: true
// and create API keys with: ediconvert keys create --db=./edi.db
const app = createApp({ storage, requireAuth: false });
const server = http.createServer(app);

server.listen(3000, async () => {
  console.log('Gateway running on http://localhost:3000');

  // 2. Ingest an EDI document
  const raw = readFileSync('./tests/fixtures/810-basic.edi', 'utf-8');
  const doc = translateToOcex(raw);
  storage.saveDocument({
    id: 'inv-demo-001',
    type: doc.type,
    partnerId: doc.sender.id,
    data: doc as Record<string, unknown>,
    rawEdi: raw,
  });
  console.log('Ingested invoice into gateway');

  // 3. Query via SDK
  const edi = new EDIConvert({ apiKey: 'demo', gateway: 'http://localhost:3000' });
  const invoices = await edi.invoices.list({});
  console.log(`Found ${invoices.length} invoice(s) via API`);
  console.log(JSON.stringify(invoices[0], null, 2));

  server.close();
  storage.close();
});
