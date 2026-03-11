import { ParseError } from '../errors.js';
import type { X12Delimiters, X12Element, X12Segment, X12Envelope } from './types.js';

export function detectDelimiters(raw: string): X12Delimiters {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith('ISA')) {
    throw new ParseError('MISSING_ISA', 'PARSE_MISSING_ISA: EDI document must start with ISA segment');
  }

  // ISA is fixed-length: element separator is char at position 3
  const element = trimmed[3];
  // Component separator is at ISA16 (position 104)
  // Segment terminator follows ISA16 (position 105)
  const isaContent = trimmed.substring(0, 107);
  const component = isaContent[104];
  const segment = isaContent[105];

  // ISA11 is the repetition separator in version 00501+
  const isaElements = isaContent.split(element);
  const repetition = isaElements.length > 11 ? isaElements[11] : '^';

  return { element, segment, component, repetition };
}

export function tokenize(raw: string): X12Envelope {
  const delimiters = detectDelimiters(raw);
  const cleaned = raw.replace(/\r?\n/g, '');

  const rawSegments = cleaned
    .split(delimiters.segment)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const segments: X12Segment[] = rawSegments.map((rawSeg) => {
    const parts = rawSeg.split(delimiters.element);
    const tag = parts[0];
    const elements: X12Element[] = parts.slice(1).map((val) => {
      if (val.includes(delimiters.component)) {
        return { value: val, components: val.split(delimiters.component) };
      }
      return { value: val };
    });
    return { tag, elements, raw: rawSeg };
  });

  const isa = segments.find((s) => s.tag === 'ISA');
  const gs = segments.find((s) => s.tag === 'GS');
  const st = segments.find((s) => s.tag === 'ST');

  const isaControlNumber = isa?.elements[12]?.value?.trim() ?? '';
  const gsControlNumber = gs?.elements[5]?.value?.trim() ?? '';
  const transactionSetCode = st?.elements[0]?.value?.trim() ?? '';

  return { delimiters, segments, isaControlNumber, gsControlNumber, transactionSetCode };
}
