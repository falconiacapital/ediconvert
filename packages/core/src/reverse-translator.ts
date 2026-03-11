import { generateX12 } from './x12/generator.js';
import type { X12Segment, X12Delimiters } from './x12/types.js';
import type { OcexDocument, OcexInvoice } from './types.js';

const DEFAULT_DELIMITERS: X12Delimiters = {
  element: '*',
  segment: '~',
  component: ':',
  repetition: '^',
};

/** Pad a string to a fixed length, truncating if necessary */
function padRight(str: string, len: number): string {
  return str.slice(0, len).padEnd(len, ' ');
}

/** Convert ISO date (YYYY-MM-DD) to X12 format (YYYYMMDD) */
function dateToX12(isoDate: string): string {
  return isoDate.replace(/-/g, '');
}

/** Build an X12Segment from a tag and element values */
function seg(tag: string, ...elements: (string | number)[]): X12Segment {
  const elStrs = elements.map((e) => String(e));
  const raw = [tag, ...elStrs].join('*') + '~';
  return {
    tag,
    elements: elStrs.map((value) => ({ value })),
    raw,
  };
}

/** Build the ISA envelope segment (fixed-width fields) */
function buildISA(senderId: string, receiverId: string, controlNumber: string): X12Segment {
  const now = new Date();
  const year = String(now.getUTCFullYear()).slice(2);
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');
  const minute = String(now.getUTCMinutes()).padStart(2, '0');
  const date = `${year}${month}${day}`;
  const time = `${hour}${minute}`;

  const paddedControlNumber = controlNumber.padStart(9, '0');

  const elements = [
    '00',                          // ISA01 auth info qualifier
    '          ',                  // ISA02 auth info (10 spaces)
    '00',                          // ISA03 security info qualifier
    '          ',                  // ISA04 security info (10 spaces)
    'ZZ',                          // ISA05 sender id qualifier
    padRight(senderId, 15),        // ISA06 sender id
    'ZZ',                          // ISA07 receiver id qualifier
    padRight(receiverId, 15),      // ISA08 receiver id
    date,                          // ISA09 date
    time,                          // ISA10 time
    '^',                           // ISA11 repetition separator
    '00501',                       // ISA12 control version
    paddedControlNumber,           // ISA13 control number
    '0',                           // ISA14 acknowledgment requested
    'P',                           // ISA15 usage indicator
    ':',                           // ISA16 component separator
  ];

  const raw = ['ISA', ...elements].join('*') + '~';
  return {
    tag: 'ISA',
    elements: elements.map((value) => ({ value })),
    raw,
  };
}

/** Build invoice (810) segments from ST through SE */
function buildInvoiceSegments(doc: OcexInvoice): X12Segment[] {
  const segments: X12Segment[] = [];

  segments.push(seg('ST', '810', '0001'));
  segments.push(seg('BIG', dateToX12(doc.documentDate), doc.invoiceNumber, doc.purchaseOrderRef ?? ''));
  segments.push(seg('CUR', 'SE', doc.currency));
  segments.push(seg('N1', 'SE', doc.sender.name, '92', doc.sender.id));
  segments.push(seg('N1', 'BY', doc.receiver.name, '92', doc.receiver.id));

  for (const item of doc.lineItems) {
    segments.push(seg('IT1', item.lineNumber, item.quantity, item.unitOfMeasure, item.unitPrice, '', 'VP', item.sku));
    segments.push(seg('PID', 'F', '', '', '', item.description));
  }

  // TDS: total expressed in cents (implied 2 decimal places)
  const tdsValue = Math.round(doc.total * 100);
  segments.push(seg('TDS', tdsValue));

  // SE: segment count includes ST and SE themselves
  const segmentCount = segments.length + 1; // +1 for SE itself
  segments.push(seg('SE', segmentCount, '0001'));

  return segments;
}

/**
 * Translate an OCEX document into a valid X12 EDI string.
 */
export function translateToX12(doc: OcexDocument): string {
  const controlNumber = '000000001';
  const isa = buildISA(doc.sender.id, doc.receiver.id, controlNumber);

  let transactionSegments: X12Segment[];

  switch (doc.type) {
    case 'invoice':
      transactionSegments = buildInvoiceSegments(doc as OcexInvoice);
      break;
    default:
      throw new Error(`X12 generation not yet supported for type: ${(doc as OcexDocument).type}`);
  }

  const now = new Date();
  const gsDate = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0'),
  ].join('');
  const gsTime = [
    String(now.getUTCHours()).padStart(2, '0'),
    String(now.getUTCMinutes()).padStart(2, '0'),
  ].join('');

  const gs = seg('GS', 'IN', doc.sender.id, doc.receiver.id, gsDate, gsTime, '1', 'X', '005010');
  const ge = seg('GE', '1', '1');
  const iea = seg('IEA', '1', controlNumber.padStart(9, '0'));

  const allSegments: X12Segment[] = [isa, gs, ...transactionSegments, ge, iea];

  return generateX12(allSegments, DEFAULT_DELIMITERS);
}
