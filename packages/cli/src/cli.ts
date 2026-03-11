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
  keys               Manage API keys (requires gateway)

Options:
  --help             Show help`);
}

function run(): void {
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
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

run();
