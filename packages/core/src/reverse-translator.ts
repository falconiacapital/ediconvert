import { generateX12 } from './x12/generator.js';
import type { X12Segment, X12Delimiters } from './x12/types.js';
import type {
  OcexDocument,
  OcexInvoice,
  OcexOrder,
  OcexCatalog,
  OcexShipment,
  OcexAcknowledgment,
} from './types.js';

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

/** Build purchase order (850) segments from ST through SE */
function buildOrderSegments(doc: OcexOrder): X12Segment[] {
  const segments: X12Segment[] = [];

  segments.push(seg('ST', '850', '0001'));
  // BEG: purpose code '00' = original order
  segments.push(seg('BEG', '00', 'NE', doc.orderNumber, '', dateToX12(doc.documentDate)));
  if (doc.currency) {
    segments.push(seg('CUR', 'BY', doc.currency));
  }
  // N1 for buyer (sender) and seller (receiver)
  segments.push(seg('N1', 'BY', doc.sender.name, '92', doc.sender.id));
  segments.push(seg('N1', 'SE', doc.receiver.name, '92', doc.receiver.id));

  // Ship-to address
  if (doc.shipTo) {
    segments.push(seg('N3', doc.shipTo.street));
    segments.push(seg('N4', doc.shipTo.city, doc.shipTo.state, doc.shipTo.zip, doc.shipTo.country ?? ''));
  }

  for (const item of doc.lineItems) {
    segments.push(seg('PO1', item.lineNumber, item.quantity, item.unitOfMeasure, item.unitPrice, '', 'VP', item.sku));
    segments.push(seg('PID', 'F', '', '', '', item.description));
  }

  // CTT: line item count
  segments.push(seg('CTT', doc.lineItems.length));

  const segmentCount = segments.length + 1;
  segments.push(seg('SE', segmentCount, '0001'));

  return segments;
}

/** Build price catalog (832) segments from ST through SE */
function buildCatalogSegments(doc: OcexCatalog): X12Segment[] {
  const segments: X12Segment[] = [];

  segments.push(seg('ST', '832', '0001'));
  // BCT: catalog transmission type '00' = initial
  segments.push(seg('BCT', '00', doc.catalogId));
  // DTM: effective date, qualifier '007' = effective
  segments.push(seg('DTM', '007', dateToX12(doc.effectiveDate)));

  // Support both doc.items (typed) and doc.lineItems (produced by forward translator)
  const items: OcexCatalog['items'] = doc.items ?? (doc as unknown as { lineItems: OcexCatalog['items'] }).lineItems ?? [];
  for (const item of items) {
    // LIN: line item identification; qualifier 'VP' = vendor product number
    segments.push(seg('LIN', '', 'VP', item.sku));
    segments.push(seg('PID', 'F', '', '', '', item.description));
    // CTP: price; qualifier 'WS' = wholesale
    segments.push(seg('CTP', 'WS', '', item.unitPrice, item.quantity ?? 1, item.unitOfMeasure ?? 'EA'));
  }

  const segmentCount = segments.length + 1;
  segments.push(seg('SE', segmentCount, '0001'));

  return segments;
}

/** Build ship notice (856) segments from ST through SE */
function buildShipmentSegments(doc: OcexShipment): X12Segment[] {
  const segments: X12Segment[] = [];

  segments.push(seg('ST', '856', '0001'));
  // BSN: shipment ID and ship date (documentDate maps to BSN element 2 per 856 mapping)
  segments.push(seg('BSN', '00', doc.shipmentId, dateToX12(doc.documentDate ?? doc.shipDate)));

  // HL shipment level (HL01=id, HL02=parent, HL03=level code 'S'=shipment)
  segments.push(seg('HL', '1', '', 'S', '1'));

  // Carrier info
  segments.push(seg('TD5', '', 'ZZ', doc.carrier));

  // Tracking number reference
  if (doc.trackingNumber) {
    segments.push(seg('REF', 'CN', doc.trackingNumber));
  }

  // Ship-from party
  if (doc.shipFrom) {
    segments.push(seg('N1', 'SF', doc.shipFrom.city ?? ''));
  }

  // Ship-to party
  if (doc.shipTo) {
    segments.push(seg('N1', 'ST', doc.shipTo.city ?? ''));
  }

  // HL order level
  segments.push(seg('HL', '2', '1', 'O', '1'));
  segments.push(seg('PRF', doc.orderRef));

  // HL item level for each line item
  let hlId = 3;
  for (const item of doc.lineItems) {
    segments.push(seg('HL', hlId, '2', 'I', '0'));
    // SN1 must come before LIN since SN1 is the loopSegment in the 856 mapping
    segments.push(seg('SN1', '', item.quantity, item.unitOfMeasure ?? 'EA'));
    segments.push(seg('LIN', '', 'VP', item.sku));
    hlId++;
  }

  const segmentCount = segments.length + 1;
  segments.push(seg('SE', segmentCount, '0001'));

  return segments;
}

/** Build functional acknowledgment (997) segments from ST through SE */
function buildAcknowledgmentSegments(doc: OcexAcknowledgment): X12Segment[] {
  const segments: X12Segment[] = [];

  segments.push(seg('ST', '997', '0001'));
  // AK1: functional group response; use referencedDocumentId as group control number
  segments.push(seg('AK1', 'FA', doc.referencedDocumentId));
  // AK9: accepted = 'A', rejected = 'R'
  const acceptCode = doc.accepted ? 'A' : 'R';
  segments.push(seg('AK9', acceptCode, '1', '1', doc.accepted ? '1' : '0'));

  const segmentCount = segments.length + 1;
  segments.push(seg('SE', segmentCount, '0001'));

  return segments;
}

/** Map OCEX document type to GS functional identifier code */
function getGsFunctionalId(type: OcexDocument['type']): string {
  switch (type) {
    case 'invoice':       return 'IN';
    case 'order':         return 'PO';
    case 'catalog':       return 'SC';
    case 'shipment':      return 'SH';
    case 'acknowledgment': return 'FA';
    default:              return 'XX';
  }
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
    case 'order':
      transactionSegments = buildOrderSegments(doc as OcexOrder);
      break;
    case 'catalog':
      transactionSegments = buildCatalogSegments(doc as OcexCatalog);
      break;
    case 'shipment':
      transactionSegments = buildShipmentSegments(doc as OcexShipment);
      break;
    case 'acknowledgment':
      transactionSegments = buildAcknowledgmentSegments(doc as OcexAcknowledgment);
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

  const gsFuncId = getGsFunctionalId(doc.type);
  const gs = seg('GS', gsFuncId, doc.sender.id, doc.receiver.id, gsDate, gsTime, '1', 'X', '005010');
  const ge = seg('GE', '1', '1');
  const iea = seg('IEA', '1', controlNumber.padStart(9, '0'));

  const allSegments: X12Segment[] = [isa, gs, ...transactionSegments, ge, iea];

  return generateX12(allSegments, DEFAULT_DELIMITERS);
}
