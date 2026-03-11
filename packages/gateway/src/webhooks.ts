import { randomUUID } from 'node:crypto';
import type { Storage } from './storage.js';

export interface RegisterWebhookOptions {
  url: string;
  events: string[];
}

export class WebhookManager {
  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  register(options: RegisterWebhookOptions): void {
    this.storage.saveWebhook({
      id: randomUUID(),
      url: options.url,
      events: options.events,
    });
  }

  async deliver(event: string, data: Record<string, unknown>): Promise<void> {
    const webhooks = this.storage.listWebhooks();
    const matching = webhooks.filter((hook) => hook.events.includes(event));

    const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });

    await Promise.all(
      matching.map(async (hook) => {
        try {
          const res = await fetch(hook.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
          });
          console.log(`[webhook] Delivered ${event} to ${hook.url} — status ${res.status}`);
        } catch (err) {
          console.error(`[webhook] Failed to deliver ${event} to ${hook.url}:`, err);
        }
      })
    );
  }
}
