import { describe, it, expect } from 'vitest';
import { tokenize, detectDelimiters } from './tokenizer.js';

const SAMPLE_ISA =
  'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *210901*1234*^*00501*000000001*0*P*:~';

const SAMPLE_997 = `${SAMPLE_ISA}GS*FA*SENDER*RECEIVER*20210901*1234*1*X*005010~ST*997*0001~AK1*PO*1~AK9*A*1*1*1~SE*4*0001~GE*1*1~IEA*1*000000001~`;

describe('detectDelimiters', () => {
  it('detects standard delimiters from ISA segment', () => {
    const d = detectDelimiters(SAMPLE_ISA);
    expect(d.element).toBe('*');
    expect(d.segment).toBe('~');
    expect(d.component).toBe(':');
    expect(d.repetition).toBe('^');
  });

  it('throws ParseError for non-ISA input', () => {
    expect(() => detectDelimiters('NOT*AN*EDI')).toThrow('PARSE_MISSING_ISA');
  });
});

describe('tokenize', () => {
  it('parses a complete 997 into segments', () => {
    const envelope = tokenize(SAMPLE_997);
    expect(envelope.transactionSetCode).toBe('997');
    expect(envelope.segments.length).toBeGreaterThan(0);
    const tags = envelope.segments.map((s) => s.tag);
    expect(tags).toContain('ISA');
    expect(tags).toContain('GS');
    expect(tags).toContain('ST');
    expect(tags).toContain('AK1');
    expect(tags).toContain('AK9');
    expect(tags).toContain('SE');
    expect(tags).toContain('GE');
    expect(tags).toContain('IEA');
  });

  it('splits elements correctly', () => {
    const envelope = tokenize(SAMPLE_997);
    const ak1 = envelope.segments.find((s) => s.tag === 'AK1')!;
    expect(ak1.elements[0].value).toBe('PO');
    expect(ak1.elements[1].value).toBe('1');
  });

  it('extracts ISA control number', () => {
    const envelope = tokenize(SAMPLE_997);
    expect(envelope.isaControlNumber).toBe('000000001');
  });

  it('extracts GS control number', () => {
    const envelope = tokenize(SAMPLE_997);
    expect(envelope.gsControlNumber).toBe('1');
  });

  it('handles whitespace and newlines in input', () => {
    const withNewlines = SAMPLE_997.replace(/~/g, '~\n');
    const envelope = tokenize(withNewlines);
    expect(envelope.transactionSetCode).toBe('997');
  });
});
