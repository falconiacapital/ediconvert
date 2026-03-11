import { EDIConvert } from '@ediconvert/sdk';
import { readFileSync } from 'node:fs';

const edi = new EDIConvert();

// Parse an EDI 810 invoice
const raw = readFileSync('./tests/fixtures/810-basic.edi', 'utf-8');
const doc = await edi.parse(raw);

console.log('Parsed Invoice:');
if (doc.type === 'invoice') {
  console.log(`  Number: ${doc.invoiceNumber}`);
  console.log(`  Total: $${doc.total}`);
  console.log(`  From: ${doc.sender.name}`);
  console.log(`  To: ${doc.receiver.name}`);
  console.log(`  Line Items: ${doc.lineItems.length}`);
} else {
  console.log(`  (document type: ${doc.type})`);
}
console.log();
console.log('Full OCEX JSON:');
console.log(JSON.stringify(doc, null, 2));
