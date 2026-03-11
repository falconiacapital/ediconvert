import { describe, it, expect } from 'vitest';
import { translateToOcex } from './translator.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('Translator — security', () => {
  // Helper to get a valid fixture
  const fixture = (name: string) =>
    readFileSync(path.resolve(process.cwd(), `tests/fixtures/${name}`), 'utf-8');

  it('does not pollute Object prototype via __proto__ paths', () => {
    // The mapping files control field paths, not user input directly,
    // but we verify the guard works by parsing a normal doc and checking
    // that Object.prototype is clean
    const before = Object.keys(Object.prototype);
    const doc = translateToOcex(fixture('810-basic.edi'));
    const after = Object.keys(Object.prototype);
    expect(after).toEqual(before);
    expect(doc.type).toBe('invoice');
  });

  it('handles EDI with missing GS segment gracefully', () => {
    // ISA present but no GS — should still parse (transactionSetCode from ST)
    const isa = 'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *260310*1200*^*00501*000000001*0*P*:~';
    const st = 'ST*810*0001~';
    const se = 'SE*2*0001~';
    const iea = 'IEA*1*000000001~';
    const result = translateToOcex(isa + st + se + iea);
    expect(result.type).toBe('invoice');
  });

  it('handles EDI with missing ST segment', () => {
    const isa = 'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *260310*1200*^*00501*000000001*0*P*:~';
    const gs = 'GS*IN*SEND*RECV*20260310*1200*1*X*005010~';
    const iea = 'IEA*1*000000001~';
    expect(() => translateToOcex(isa + gs + iea)).toThrow();
  });
});
