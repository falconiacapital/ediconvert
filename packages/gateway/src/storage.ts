import Database from 'better-sqlite3';

export interface DocumentRecord {
  id: string;
  type: string;
  partnerId: string;
  data: Record<string, unknown>;
  rawEdi: string;
  createdAt?: string;
}

export interface ApiKeyRecord {
  keyHash: string;
  prefix: string;
  label: string;
  partnerScope?: string;
  createdAt?: string;
}

export interface WebhookRecord {
  id: string;
  url: string;
  events: string[];
  secret: string;
  createdAt?: string;
}

export interface ListDocumentsFilter {
  type?: string;
  partnerId?: string;
  since?: string;
  limit?: number;
}

export class Storage {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        partner_id TEXT NOT NULL,
        data TEXT NOT NULL,
        raw_edi TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        key_hash TEXT PRIMARY KEY,
        prefix TEXT NOT NULL DEFAULT '',
        label TEXT NOT NULL,
        partner_scope TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        events TEXT NOT NULL,
        secret TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Migrate existing tables to add new columns if they don't exist yet
    try {
      this.db.exec(`ALTER TABLE api_keys ADD COLUMN prefix TEXT NOT NULL DEFAULT ''`);
    } catch {
      // Column already exists
    }
    try {
      this.db.exec(`ALTER TABLE webhooks ADD COLUMN secret TEXT NOT NULL DEFAULT ''`);
    } catch {
      // Column already exists
    }
  }

  saveDocument(doc: DocumentRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO documents (id, type, partner_id, data, raw_edi)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(doc.id, doc.type, doc.partnerId, JSON.stringify(doc.data), doc.rawEdi);
  }

  getDocument(id: string): DocumentRecord | undefined {
    const stmt = this.db.prepare(`
      SELECT id, type, partner_id, data, raw_edi, created_at FROM documents WHERE id = ?
    `);
    const row = stmt.get(id) as { id: string; type: string; partner_id: string; data: string; raw_edi: string; created_at: string } | undefined;
    if (!row) return undefined;
    return {
      id: row.id,
      type: row.type,
      partnerId: row.partner_id,
      data: JSON.parse(row.data) as Record<string, unknown>,
      rawEdi: row.raw_edi,
      createdAt: row.created_at,
    };
  }

  listDocuments(filter: ListDocumentsFilter = {}): DocumentRecord[] {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.type !== undefined) {
      conditions.push('type = ?');
      params.push(filter.type);
    }
    if (filter.partnerId !== undefined) {
      conditions.push('partner_id = ?');
      params.push(filter.partnerId);
    }
    if (filter.since !== undefined) {
      conditions.push('created_at >= ?');
      params.push(filter.since);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    let sql = `SELECT id, type, partner_id, data, raw_edi, created_at FROM documents ${where} ORDER BY created_at DESC`;

    if (filter.limit !== undefined) {
      sql += ' LIMIT ?';
      params.push(Number(filter.limit));
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as { id: string; type: string; partner_id: string; data: string; raw_edi: string; created_at: string }[];

    return rows.map(row => ({
      id: row.id,
      type: row.type,
      partnerId: row.partner_id,
      data: JSON.parse(row.data) as Record<string, unknown>,
      rawEdi: row.raw_edi,
      createdAt: row.created_at,
    }));
  }

  countDocuments(filter: Pick<ListDocumentsFilter, 'type' | 'partnerId' | 'since'> = {}): number {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.type !== undefined) {
      conditions.push('type = ?');
      params.push(filter.type);
    }
    if (filter.partnerId !== undefined) {
      conditions.push('partner_id = ?');
      params.push(filter.partnerId);
    }
    if (filter.since !== undefined) {
      conditions.push('created_at >= ?');
      params.push(filter.since);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT COUNT(*) as count FROM documents ${where}`;

    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params) as { count: number };
    return row.count;
  }

  saveApiKey(key: ApiKeyRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO api_keys (key_hash, prefix, label, partner_scope)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(key.keyHash, key.prefix, key.label, key.partnerScope ?? null);
  }

  listApiKeys(): ApiKeyRecord[] {
    const stmt = this.db.prepare(`
      SELECT key_hash, prefix, label, partner_scope, created_at FROM api_keys
    `);
    const rows = stmt.all() as { key_hash: string; prefix: string; label: string; partner_scope: string | null; created_at: string }[];
    return rows.map(row => ({
      keyHash: row.key_hash,
      prefix: row.prefix,
      label: row.label,
      partnerScope: row.partner_scope ?? undefined,
      createdAt: row.created_at,
    }));
  }

  getApiKeyByPrefix(prefix: string): ApiKeyRecord | undefined {
    const stmt = this.db.prepare(`
      SELECT key_hash, prefix, label, partner_scope, created_at FROM api_keys WHERE prefix = ?
    `);
    const row = stmt.get(prefix) as { key_hash: string; prefix: string; label: string; partner_scope: string | null; created_at: string } | undefined;
    if (!row) return undefined;
    return {
      keyHash: row.key_hash,
      prefix: row.prefix,
      label: row.label,
      partnerScope: row.partner_scope ?? undefined,
      createdAt: row.created_at,
    };
  }

  saveWebhook(webhook: WebhookRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO webhooks (id, url, events, secret)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(webhook.id, webhook.url, JSON.stringify(webhook.events), webhook.secret);
  }

  listWebhooks(): WebhookRecord[] {
    const stmt = this.db.prepare(`
      SELECT id, url, events, secret, created_at FROM webhooks
    `);
    const rows = stmt.all() as { id: string; url: string; events: string; secret: string; created_at: string }[];
    return rows.map(row => ({
      id: row.id,
      url: row.url,
      events: JSON.parse(row.events) as string[],
      secret: row.secret,
      createdAt: row.created_at,
    }));
  }

  close(): void {
    this.db.close();
  }
}
