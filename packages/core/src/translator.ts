import { tokenize } from './x12/tokenizer.js';
import { getMappingForTransactionSet } from './mapping/registry.js';
import { ParseError } from './errors.js';
import type { X12Segment } from './x12/types.js';
import type { FieldMapping } from './mapping/types.js';
import type { OcexDocument, OcexLineItem } from './types.js';

/** Set a value on an object using a dot-path string, e.g. "sender.id" */
function setNestedField(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

/** Find segments that match a tag and whose first element matches a qualifier */
function findSegmentsWithQualifier(
  segments: X12Segment[],
  tag: string,
  qualifier: string,
): X12Segment[] {
  return segments.filter(
    (seg) => seg.tag === tag && seg.elements[0]?.value?.trim() === qualifier,
  );
}

/** Apply a transform to a raw element value */
function applyTransform(
  value: string,
  transform: FieldMapping['transform'],
  segmentTag: string,
): unknown {
  const trimmed = value.trim();
  switch (transform) {
    case 'trim':
      return trimmed;
    case 'number': {
      const n = parseFloat(trimmed);
      // TDS uses implied 2 decimal places (pennies → dollars)
      return segmentTag === 'TDS' ? n / 100 : n;
    }
    case 'date':
      // YYYYMMDD → YYYY-MM-DD
      if (/^\d{8}$/.test(trimmed)) {
        return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
      }
      return trimmed;
    case 'acceptCode':
      return trimmed === 'A';
    default:
      return trimmed;
  }
}

/** Extract a value from a segment given a field mapping (no qualifier logic here) */
function extractValue(
  segment: X12Segment,
  fieldMapping: FieldMapping,
): unknown | undefined {
  const element = segment.elements[fieldMapping.element];
  if (element === undefined) return undefined;

  const raw =
    fieldMapping.component !== undefined
      ? (element.components?.[fieldMapping.component] ?? element.value)
      : element.value;

  if (raw === undefined || raw === '') return undefined;

  return applyTransform(raw, fieldMapping.transform, segment.tag);
}

/** Apply a single top-level field mapping to the result object */
function applyFieldMapping(
  segments: X12Segment[],
  fieldMapping: FieldMapping,
  result: Record<string, unknown>,
): void {
  const matching = segments.filter((s) => s.tag === fieldMapping.segment);

  for (const segment of matching) {
    if (fieldMapping.qualifier !== undefined) {
      // Qualified segment: first element must match the qualifier
      const qualifierValue = segment.elements[0]?.value?.trim();
      if (qualifierValue !== fieldMapping.qualifier) continue;
    }

    const value = extractValue(segment, fieldMapping);
    if (value !== undefined) {
      setNestedField(result, fieldMapping.field, value);
      break; // use first match
    }
  }
}

/** Extract line items from loop segments */
function extractLineItems(
  segments: X12Segment[],
  loopSegment: string,
  fieldMappings: FieldMapping[],
): OcexLineItem[] {
  const items: OcexLineItem[] = [];
  let currentItem: Record<string, unknown> | null = null;
  // Track which segments belong to the current loop item
  let inLoop = false;

  for (const segment of segments) {
    if (segment.tag === loopSegment) {
      // Save the previous item if any
      if (currentItem !== null) {
        items.push(currentItem as unknown as OcexLineItem);
      }
      currentItem = {};
      inLoop = true;
    }

    if (!inLoop || currentItem === null) continue;

    // Apply all field mappings that target this segment
    for (const fm of fieldMappings) {
      if (fm.segment !== segment.tag) continue;

      const value = extractValue(segment, fm);
      if (value !== undefined) {
        setNestedField(currentItem, fm.field, value);
      }
    }
  }

  // Push the last item
  if (currentItem !== null) {
    items.push(currentItem as unknown as OcexLineItem);
  }

  return items;
}

/**
 * Translate a raw X12 EDI string into an OCEX JSON document.
 */
export function translateToOcex(raw: string): OcexDocument {
  const envelope = tokenize(raw);
  const { transactionSetCode, segments } = envelope;

  if (!transactionSetCode) {
    throw new ParseError('MISSING_ST', 'Could not determine transaction set code from ST segment');
  }

  const mapping = getMappingForTransactionSet(transactionSetCode);

  const result: Record<string, unknown> = {
    type: mapping.ocexType,
  };

  // Apply top-level field mappings
  for (const fieldMapping of mapping.fields) {
    applyFieldMapping(segments, fieldMapping, result);
  }

  // Extract line items if configured
  if (mapping.lineItems) {
    result.lineItems = extractLineItems(
      segments,
      mapping.lineItems.loopSegment,
      mapping.lineItems.fields,
    );
  }

  // Invoice-specific defaults
  if (mapping.ocexType === 'invoice') {
    if (result.subtotal === undefined) {
      result.subtotal = result.total;
    }
    if (result.tax === undefined) {
      result.tax = 0;
    }
  }

  // Derive a stable document id from ISA control number
  result.id = envelope.isaControlNumber || 'unknown';
  result.version = '1.0';

  return result as unknown as OcexDocument;
}
