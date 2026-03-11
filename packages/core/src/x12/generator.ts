import type { X12Segment, X12Delimiters } from './types.js';

export function generateX12(segments: X12Segment[], delimiters: X12Delimiters): string {
  return segments
    .map((seg) => {
      const parts = [seg.tag, ...seg.elements.map((el) => el.value)];
      return parts.join(delimiters.element) + delimiters.segment;
    })
    .join('');
}
