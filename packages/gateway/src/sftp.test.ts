import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { rmSync } from 'node:fs';
import { EDIWatcher, EDISender, LocalTransport } from './sftp.js';

describe('EDIWatcher', () => {
  let inboxDir: string;
  let processedDir: string;
  let transport: LocalTransport;

  beforeEach(() => {
    inboxDir = mkdtempSync(join(tmpdir(), 'edi-inbox-'));
    processedDir = mkdtempSync(join(tmpdir(), 'edi-processed-'));
    transport = new LocalTransport();
  });

  afterEach(() => {
    rmSync(inboxDir, { recursive: true, force: true });
    rmSync(processedDir, { recursive: true, force: true });
  });

  it('processes .edi files from inbox', async () => {
    const sampleEdi = 'ISA*00*...'; // minimal content
    writeFileSync(join(inboxDir, 'test.edi'), sampleEdi);

    const received: string[] = [];
    const watcher = new EDIWatcher(transport, inboxDir, processedDir, async (raw) => {
      received.push(raw);
    });

    const count = await watcher.poll();
    expect(count).toBe(1);
    expect(received).toHaveLength(1);
    expect(existsSync(join(processedDir, 'test.edi'))).toBe(true);
    expect(existsSync(join(inboxDir, 'test.edi'))).toBe(false);
  });

  it('ignores non-.edi files', async () => {
    writeFileSync(join(inboxDir, 'readme.txt'), 'not edi');
    const watcher = new EDIWatcher(transport, inboxDir, processedDir, async () => {});
    const count = await watcher.poll();
    expect(count).toBe(0);
  });

  it('passes filename to onDocument callback', async () => {
    writeFileSync(join(inboxDir, 'order.edi'), 'ISA*00*...');

    const filenames: string[] = [];
    const watcher = new EDIWatcher(transport, inboxDir, processedDir, async (_raw, filename) => {
      filenames.push(filename);
    });

    await watcher.poll();
    expect(filenames).toEqual(['order.edi']);
  });

  it('processes multiple .edi files', async () => {
    writeFileSync(join(inboxDir, 'a.edi'), 'ISA*00*A');
    writeFileSync(join(inboxDir, 'b.edi'), 'ISA*00*B');
    writeFileSync(join(inboxDir, 'notes.txt'), 'ignored');

    const received: string[] = [];
    const watcher = new EDIWatcher(transport, inboxDir, processedDir, async (raw) => {
      received.push(raw);
    });

    const count = await watcher.poll();
    expect(count).toBe(2);
    expect(received).toHaveLength(2);
    expect(existsSync(join(processedDir, 'a.edi'))).toBe(true);
    expect(existsSync(join(processedDir, 'b.edi'))).toBe(true);
  });

  it('returns 0 when inbox is empty', async () => {
    const watcher = new EDIWatcher(transport, inboxDir, processedDir, async () => {});
    const count = await watcher.poll();
    expect(count).toBe(0);
  });

  it('startPolling and stopPolling do not throw', () => {
    const watcher = new EDIWatcher(transport, inboxDir, processedDir, async () => {});
    watcher.startPolling(60000);
    watcher.stopPolling();
  });
});

describe('EDISender', () => {
  let outboxDir: string;
  let transport: LocalTransport;

  beforeEach(() => {
    outboxDir = mkdtempSync(join(tmpdir(), 'edi-outbox-'));
    transport = new LocalTransport();
  });

  afterEach(() => {
    rmSync(outboxDir, { recursive: true, force: true });
  });

  it('writes EDI file to outbox', async () => {
    const sender = new EDISender(transport, outboxDir);
    await sender.send('invoice.edi', 'ISA*00*...');
    expect(existsSync(join(outboxDir, 'invoice.edi'))).toBe(true);
    expect(readFileSync(join(outboxDir, 'invoice.edi'), 'utf-8')).toBe('ISA*00*...');
  });

  it('writes multiple files independently', async () => {
    const sender = new EDISender(transport, outboxDir);
    await sender.send('order1.edi', 'ISA*00*ORDER1');
    await sender.send('order2.edi', 'ISA*00*ORDER2');
    expect(readFileSync(join(outboxDir, 'order1.edi'), 'utf-8')).toBe('ISA*00*ORDER1');
    expect(readFileSync(join(outboxDir, 'order2.edi'), 'utf-8')).toBe('ISA*00*ORDER2');
  });
});

describe('LocalTransport', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'edi-transport-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('list returns only files matching a pattern', async () => {
    writeFileSync(join(dir, 'a.edi'), '');
    writeFileSync(join(dir, 'b.edi'), '');
    writeFileSync(join(dir, 'c.txt'), '');
    const transport = new LocalTransport();
    const files = await transport.list(dir);
    expect(files.sort()).toEqual(['a.edi', 'b.edi'].sort());
  });

  it('read returns file content', async () => {
    writeFileSync(join(dir, 'x.edi'), 'CONTENT');
    const transport = new LocalTransport();
    const content = await transport.read(join(dir, 'x.edi'));
    expect(content).toBe('CONTENT');
  });

  it('write creates a file with given content', async () => {
    const transport = new LocalTransport();
    await transport.write(join(dir, 'out.edi'), 'WRITTEN');
    expect(readFileSync(join(dir, 'out.edi'), 'utf-8')).toBe('WRITTEN');
  });

  it('move relocates a file and removes the source', async () => {
    writeFileSync(join(dir, 'src.edi'), 'DATA');
    const destDir = mkdtempSync(join(tmpdir(), 'edi-dest-'));
    const transport = new LocalTransport();
    try {
      await transport.move(join(dir, 'src.edi'), join(destDir, 'src.edi'));
      expect(existsSync(join(dir, 'src.edi'))).toBe(false);
      expect(readFileSync(join(destDir, 'src.edi'), 'utf-8')).toBe('DATA');
    } finally {
      rmSync(destDir, { recursive: true, force: true });
    }
  });
});

describe('SftpTransport', () => {
  it('throws "SFTP transport not configured" on list', async () => {
    const { SftpTransport } = await import('./sftp.js');
    const t = new SftpTransport({ host: 'localhost', port: 22, username: 'user', privateKey: 'key' });
    await expect(t.list('/')).rejects.toThrow('SFTP transport not configured');
  });

  it('throws "SFTP transport not configured" on read', async () => {
    const { SftpTransport } = await import('./sftp.js');
    const t = new SftpTransport({ host: 'localhost', port: 22, username: 'user', privateKey: 'key' });
    await expect(t.read('/file.edi')).rejects.toThrow('SFTP transport not configured');
  });

  it('throws "SFTP transport not configured" on write', async () => {
    const { SftpTransport } = await import('./sftp.js');
    const t = new SftpTransport({ host: 'localhost', port: 22, username: 'user', privateKey: 'key' });
    await expect(t.write('/file.edi', 'content')).rejects.toThrow('SFTP transport not configured');
  });

  it('throws "SFTP transport not configured" on move', async () => {
    const { SftpTransport } = await import('./sftp.js');
    const t = new SftpTransport({ host: 'localhost', port: 22, username: 'user', privateKey: 'key' });
    await expect(t.move('/a.edi', '/b.edi')).rejects.toThrow('SFTP transport not configured');
  });
});
