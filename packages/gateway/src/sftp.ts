import { readdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join, basename } from 'node:path';

// ---------------------------------------------------------------------------
// FileTransport interface — pluggable backend (local fs or real SFTP)
// ---------------------------------------------------------------------------

export interface FileTransport {
  /** List all .edi filenames (not full paths) inside a directory. */
  list(dir: string): Promise<string[]>;
  /** Read a file and return its content as a UTF-8 string. */
  read(filepath: string): Promise<string>;
  /** Write content to a file path (creates or overwrites). */
  write(filepath: string, content: string): Promise<void>;
  /** Move a file from one path to another. */
  move(from: string, to: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// LocalTransport — backed by Node fs/promises (for testing and development)
// ---------------------------------------------------------------------------

export class LocalTransport implements FileTransport {
  async list(dir: string): Promise<string[]> {
    const entries = await readdir(dir);
    return entries.filter((name) => name.endsWith('.edi'));
  }

  async read(filepath: string): Promise<string> {
    return readFile(filepath, 'utf-8');
  }

  async write(filepath: string, content: string): Promise<void> {
    await writeFile(filepath, content, 'utf-8');
  }

  async move(from: string, to: string): Promise<void> {
    await rename(from, to);
  }
}

// ---------------------------------------------------------------------------
// SftpTransport — stub for production SFTP (ssh2-sftp-client not yet installed)
// ---------------------------------------------------------------------------

export interface SftpConfig {
  host: string;
  port: number;
  username: string;
  privateKey: string;
}

export class SftpTransport implements FileTransport {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_config: SftpConfig) {
    // Config stored for future implementation when ssh2-sftp-client is added.
  }

  async list(_dir: string): Promise<string[]> {
    throw new Error('SFTP transport not configured');
  }

  async read(_filepath: string): Promise<string> {
    throw new Error('SFTP transport not configured');
  }

  async write(_filepath: string, _content: string): Promise<void> {
    throw new Error('SFTP transport not configured');
  }

  async move(_from: string, _to: string): Promise<void> {
    throw new Error('SFTP transport not configured');
  }
}

// ---------------------------------------------------------------------------
// EDIWatcher — polls an inbox directory for new .edi files
// ---------------------------------------------------------------------------

export class EDIWatcher {
  private intervalId: ReturnType<typeof setInterval> | undefined;

  constructor(
    private transport: FileTransport,
    private inboxDir: string,
    private processedDir: string,
    private onDocument: (raw: string, filename: string) => Promise<void>,
  ) {}

  /**
   * Perform a single poll cycle:
   * 1. List .edi files in inboxDir.
   * 2. For each file: read content, invoke onDocument callback, move to processedDir.
   * 3. Return the number of files processed.
   */
  async poll(): Promise<number> {
    const filenames = await this.transport.list(this.inboxDir);
    let count = 0;

    for (const filename of filenames) {
      const srcPath = join(this.inboxDir, filename);
      const destPath = join(this.processedDir, filename);

      try {
        const raw = await this.transport.read(srcPath);
        await this.onDocument(raw, filename);
        await this.transport.move(srcPath, destPath);
        count++;
      } catch (err) {
        console.error(`[EDIWatcher] Error processing ${filename}:`, err);
      }
    }

    return count;
  }

  /** Start polling on a recurring interval (default 30 s). */
  startPolling(intervalMs: number = 30_000): void {
    this.intervalId = setInterval(() => {
      this.poll().catch((err) => console.error('[EDIWatcher] Poll error:', err));
    }, intervalMs);
  }

  /** Stop the recurring polling interval. */
  stopPolling(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}

// ---------------------------------------------------------------------------
// EDISender — writes outbound EDI files to an outbox directory
// ---------------------------------------------------------------------------

export class EDISender {
  constructor(
    private transport: FileTransport,
    private outboxDir: string,
  ) {}

  /** Write ediContent to outboxDir/filename via the configured transport. */
  async send(filename: string, ediContent: string): Promise<void> {
    const destPath = join(this.outboxDir, filename);
    await this.transport.write(destPath, ediContent);
  }
}
