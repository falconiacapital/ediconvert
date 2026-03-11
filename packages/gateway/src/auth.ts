import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import type { Storage } from './storage.js';
import type { Request, Response, NextFunction } from 'express';

/** Length of the unhashed prefix stored alongside the key hash. */
const PREFIX_LENGTH = 8;

export class AuthManager {
  constructor(private storage: Storage) {}

  async createKey(opts: { label: string; partnerScope?: string }): Promise<{ rawKey: string; label: string }> {
    const raw = 'edi_live_' + randomBytes(24).toString('hex');
    const prefix = raw.slice(0, PREFIX_LENGTH);
    const hash = await bcrypt.hash(raw, 10);
    this.storage.saveApiKey({ keyHash: hash, prefix, label: opts.label, partnerScope: opts.partnerScope });
    return { rawKey: raw, label: opts.label };
  }

  async validateKey(rawKey: string): Promise<boolean> {
    const prefix = rawKey.slice(0, PREFIX_LENGTH);
    const record = this.storage.getApiKeyByPrefix(prefix);
    if (!record) return false;
    return bcrypt.compare(rawKey, record.keyHash);
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = req.header('X-API-Key');
      if (!key) {
        res.status(401).json({ error: { code: 'GATEWAY_AUTH_REQUIRED', message: 'X-API-Key header required' } });
        return;
      }
      const valid = await this.validateKey(key);
      if (!valid) {
        res.status(403).json({ error: { code: 'GATEWAY_AUTH_INVALID', message: 'Invalid API key' } });
        return;
      }
      next();
    };
  }
}
