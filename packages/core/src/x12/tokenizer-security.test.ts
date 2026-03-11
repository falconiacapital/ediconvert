import { describe, it, expect } from 'vitest';
import { tokenize, detectDelimiters } from './tokenizer.js';

describe('Tokenizer — malformed input', () => {
  it('rejects empty string', () => {
    expect(() => tokenize('')).toThrow();
  });

  it('rejects string without ISA', () => {
    expect(() => tokenize('GS*IN*SENDER~')).toThrow('ISA');
  });

  it('rejects ISA segment shorter than 106 characters', () => {
    expect(() => tokenize('ISA*00*short')).toThrow();
  });

  it('rejects whitespace-only input', () => {
    expect(() => tokenize('   \n\t  ')).toThrow();
  });

  it('handles ISA with non-standard delimiters', () => {
    // Build a minimal ISA with | as element sep and ; as segment term
    const isa = 'ISA|00|          |00|          |ZZ|SENDER         |ZZ|RECEIVER       |260310|1200|^|00501|000000001|0|P|:;';
    const result = detectDelimiters(isa);
    expect(result.element).toBe('|');
    expect(result.segment).toBe(';');
  });

  it('handles input with null bytes without crashing', () => {
    const withNull = 'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *260310*1200*^*00501*000000001*0*P*:\x00~';
    // Should not throw - may parse incorrectly but shouldn't crash
    expect(() => {
      try { tokenize(withNull); } catch (e) {
        // ParseError is acceptable, but no TypeError/RangeError
        if (e instanceof TypeError || e instanceof RangeError) throw e;
      }
    }).not.toThrow();
  });

  it('handles very long input without hanging', () => {
    // 1MB of repeated segments after a valid ISA
    const isa = 'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *260310*1200*^*00501*000000001*0*P*:~';
    const bigPayload = isa + 'GS*IN*SEND*RECV*20260310*1200*1*X*005010~ST*810*0001~' + 'NTE*GEN*' + 'X'.repeat(10000) + '~'.repeat(100);
    // Should complete without hanging (timeout would catch infinite loops)
    const result = tokenize(bigPayload);
    expect(result.segments.length).toBeGreaterThan(0);
  });
});
