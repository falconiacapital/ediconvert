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
  label: string;
  partnerScope?: string;
  createdAt?: string;
}

export interface WebhookRecord {
  id: string;
  url: string;
  events: string[];
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
        label TEXT NOT NULL,
        partner_scope TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        events TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
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
    const limitClause = filter.limit !== undefined ? `LIMIT ${filter.limit}` : '';
    const sql = `SELECT id, type, partner_id, data, raw_edi, created_at FROM documents ${where} ORDER BY created_at DESC ${limitClause}`;

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

  saveApiKey(key: ApiKeyRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO api_keys (key_hash, label, partner_scope)
      VALUES (?, ?, ?)
    `);
    stmt.run(key.keyHash, key.label, key.partnerScope ?? null);
  }

  listApiKeys(): ApiKeyRecord[] {
    const stmt = this.db.prepare(`
      SELECT key_hash, label, partner_scope, created_at FROM api_keys
    `);
    const rows = stmt.all() as { key_hash: string; label: string; partner_scope: string | null; created_at: string }[];
    return rows.map(row => ({
      keyHash: row.key_hash,
      label: row.label,
      partnerScope: row.partner_scope ?? undefined,
      createdAt: row.created_at,
    }));
  }

  saveWebhook(webhook: WebhookRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO webhooks (id, url, events)
      VALUES (?, ?, ?)
    `);
    stmt.run(webhook.id, webhook.url, JSON.stringify(webhook.events));
  }

  listWebhooks(): WebhookRecord[] {
    const stmt = this.db.prepare(`
      SELECT id, url, events, created_at FROM webhooks
    `);
    const rows = stmt.all() as { id: string; url: string; events: string; created_at: string }[];
    return rows.map(row => ({
      id: row.id,
      url: row.url,
      events: JSON.parse(row.events) as string[],
      createdAt: row.created_at,
    }));
  }

  close(): void {
    this.db.close();
  }
}
