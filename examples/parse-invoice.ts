import { EDIConvert } from '@ediconvert/sdk';
import { readFileSync } from 'node:fs';

const edi = new EDIConvert();

// Parse an EDI 810 invoice
const raw = readFileSync('./tests/fixtures/810-basic.edi', 'utf-8');
const invoice = await edi.parse(raw);

console.log('Parsed Invoice:');
console.log(`  Number: ${(invoice as any).invoiceNumber}`);
console.log(`  Total: $${(invoice as any).total}`);
console.log(`  From: ${invoice.sender.name}`);
console.log(`  To: ${invoice.receiver.name}`);
console.log(`  Line Items: ${(invoice as any).lineItems.length}`);
console.log();
console.log('Full OCEX JSON:');
console.log(JSON.stringify(invoice, null, 2));
