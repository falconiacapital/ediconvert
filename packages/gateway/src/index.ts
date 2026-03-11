import { createApp } from './server.js';
import { Storage } from './storage.js';
import { AuthManager } from './auth.js';
import { WebhookManager } from './webhooks.js';
import { EDIWatcher, LocalTransport } from './sftp.js';
import { translateToOcex, type OcexDocument } from '@ediconvert/core';

const PORT = parseInt(process.env.EDI_PORT || '3000', 10);
const DB_PATH = process.env.EDI_DB_PATH || './ediconvert.db';
const INBOX_DIR = process.env.EDI_INBOX_DIR;
const PROCESSED_DIR = process.env.EDI_PROCESSED_DIR;
const POLL_INTERVAL = parseInt(process.env.EDI_POLL_INTERVAL || '30000', 10);

const storage = new Storage(DB_PATH);
const auth = new AuthManager(storage);
const webhookManager = new WebhookManager(storage);

const app = createApp({ storage, requireAuth: true, authManager: auth, webhookManager });

// Start SFTP watcher if inbox configured
if (INBOX_DIR && PROCESSED_DIR) {
  const transport = new LocalTransport();
  const watcher = new EDIWatcher(transport, INBOX_DIR, PROCESSED_DIR, async (raw, filename) => {
    try {
      const doc = translateToOcex(raw);
      storage.saveDocument({
        id: `${doc.type}-${Date.now()}`,
        type: doc.type,
        partnerId: doc.sender.id || 'unknown',
        data: doc as unknown as Record<string, unknown>,
        rawEdi: raw,
      });
      await webhookManager.deliver(`${doc.type}.received`, doc as unknown as Record<string, unknown>);
      console.log(`Processed: ${filename}`);
    } catch (err) {
      console.error(`Failed to process ${filename}:`, err);
    }
  });
  watcher.startPolling(POLL_INTERVAL);
  console.log(`SFTP watcher started: polling ${INBOX_DIR} every ${POLL_INTERVAL}ms`);
}

app.listen(PORT, () => {
  console.log(`EDIConvert Gateway running on port ${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});
