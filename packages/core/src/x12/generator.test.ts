import { describe, it, expect } from 'vitest';
import { generateX12 } from './generator.js';
import type { X12Segment, X12Delimiters } from './types.js';

const DEFAULT_DELIMITERS: X12Delimiters = {
  element: '*',
  segment: '~',
  component: ':',
  repetition: '^',
};

describe('generateX12', () => {
  it('serializes segments to EDI string', () => {
    const segments: X12Segment[] = [
      { tag: 'ST', elements: [{ value: '997' }, { value: '0001' }], raw: '' },
      { tag: 'AK1', elements: [{ value: 'PO' }, { value: '1' }], raw: '' },
      { tag: 'AK9', elements: [{ value: 'A' }, { value: '1' }, { value: '1' }, { value: '1' }], raw: '' },
      { tag: 'SE', elements: [{ value: '4' }, { value: '0001' }], raw: '' },
    ];
    const result = generateX12(segments, DEFAULT_DELIMITERS);
    expect(result).toBe('ST*997*0001~AK1*PO*1~AK9*A*1*1*1~SE*4*0001~');
  });

  it('handles component separators', () => {
    const segments: X12Segment[] = [
      {
        tag: 'SV1',
        elements: [{ value: 'HC:99213', components: ['HC', '99213'] }],
        raw: '',
      },
    ];
    const result = generateX12(segments, DEFAULT_DELIMITERS);
    expect(result).toBe('SV1*HC:99213~');
  });
});
