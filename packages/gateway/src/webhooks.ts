import { randomUUID, createHmac, randomBytes } from 'node:crypto';
import type { Storage } from './storage.js';

export interface RegisterWebhookOptions {
  url: string;
  events: string[];
  secret?: string;
}

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeSignature(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export class WebhookManager {
  private storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  register(options: RegisterWebhookOptions): void {
    const secret = options.secret && options.secret.length >= 16
      ? options.secret
      : randomBytes(32).toString('hex');
    this.storage.saveWebhook({
      id: randomUUID(),
      url: options.url,
      events: options.events,
      secret,
    });
  }

  async deliver(event: string, data: Record<string, unknown>): Promise<void> {
    const webhooks = this.storage.listWebhooks();
    const matching = webhooks.filter((hook) => hook.events.includes(event));

    const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });

    await Promise.all(
      matching.map(async (hook) => {
        const signature = computeSignature(hook.secret, payload);

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            const res = await fetch(hook.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-EDI-Signature': signature,
              },
              body: payload,
            });
            console.log(`[webhook] Delivered ${event} to ${hook.url} — status ${res.status}`);
            return; // success, stop retrying
          } catch (err) {
            if (attempt < MAX_ATTEMPTS) {
              const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
              console.warn(`[webhook] Attempt ${attempt} failed for ${hook.url}, retrying in ${delay}ms:`, err);
              await sleep(delay);
            } else {
              console.error(`[webhook] Failed to deliver ${event} to ${hook.url} after ${MAX_ATTEMPTS} attempts:`, err);
            }
          }
        }
      })
    );
  }
}
