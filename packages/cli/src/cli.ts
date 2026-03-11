import { readFileSync } from 'node:fs';
import { translateToOcex, translateToX12 } from '@ediconvert/core';

const args = process.argv.slice(2);
const command = args[0];

function printHelp(): void {
  console.log(`Usage: ediconvert <command> [options]

Commands:
  parse <file>       Parse EDI file to OCEX JSON
  validate <file>    Validate an EDI file
  generate <file>    Generate EDI from OCEX JSON file
  keys <create|list> Manage API keys (local SQLite database)

Options:
  --help             Show help
  --db=<path>        Path to SQLite database (default: ediconvert.db)`);
}

async function run(): Promise<void> {
  if (!command || command === '--help') { printHelp(); return; }
  switch (command) {
    case 'parse': {
      const file = args[1];
      if (!file) { console.error('Error: file path required'); process.exit(1); }
      const raw = readFileSync(file, 'utf-8');
      const doc = translateToOcex(raw);
      console.log(JSON.stringify(doc, null, 2));
      break;
    }
    case 'validate': {
      const file = args[1];
      if (!file) { console.error('Error: file path required'); process.exit(1); }
      const raw = readFileSync(file, 'utf-8');
      try { translateToOcex(raw); console.log('Document is valid.'); }
      catch (err) { console.error('Validation failed:', (err as Error).message); process.exit(1); }
      break;
    }
    case 'generate': {
      const file = args[1];
      if (!file) { console.error('Error: file path required'); process.exit(1); }
      const json = readFileSync(file, 'utf-8');
      const doc = JSON.parse(json);
      const edi = translateToX12(doc);
      console.log(edi);
      break;
    }
    case 'keys': {
      const subcommand = args[1];
      const dbPath = args.find(a => a.startsWith('--db='))?.split('=')[1] || 'ediconvert.db';
      const { Storage } = await import('@ediconvert/gateway');
      const { AuthManager } = await import('@ediconvert/gateway');
      const storage = new Storage(dbPath);
      const auth = new AuthManager(storage);

      if (subcommand === 'create') {
        const label = args[2] || 'default';
        const partnerScope = args.find(a => a.startsWith('--partner='))?.split('=')[1];
        const key = await auth.createKey({ label, partnerScope });
        console.log(`API Key created: ${key.rawKey}`);
        console.log(`Name: ${key.label}`);
        if (partnerScope) console.log(`Partner scope: ${partnerScope}`);
        console.log('\nSave this key — it cannot be retrieved again.');
      } else if (subcommand === 'list') {
        const keys = storage.listApiKeys();
        if (keys.length === 0) {
          console.log('No API keys found.');
        } else {
          console.log(`Found ${keys.length} key(s):\n`);
          for (const k of keys) {
            console.log(`  Label: ${k.label}`);
            if (k.partnerScope) console.log(`  Partner scope: ${k.partnerScope}`);
            if (k.createdAt) console.log(`  Created: ${k.createdAt}`);
            console.log();
          }
        }
      } else {
        console.error('Usage: ediconvert keys <create|list> [--db=<path>] [--partner=<id>]');
        storage.close();
        process.exit(1);
      }
      storage.close();
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

run();
