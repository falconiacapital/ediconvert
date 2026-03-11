import { describe, it, expect } from 'vitest';
import { EDIConvertError, ParseError, ValidateError, PartnerError, GatewayError } from './errors.js';

describe('EDIConvertError', () => {
  it('creates error with code and message', () => {
    const err = new EDIConvertError('PARSE_INVALID_SEGMENT', 'Unknown segment');
    expect(err.code).toBe('PARSE_INVALID_SEGMENT');
    expect(err.message).toBe('Unknown segment');
    expect(err).toBeInstanceOf(Error);
  });

  it('includes location and suggestion', () => {
    const err = new EDIConvertError('PARSE_INVALID_SEGMENT', 'Unknown segment', {
      location: { segment: 'ZZZ', position: 14, line: 3 },
      suggestion: 'Did you mean ZA?',
    });
    expect(err.location).toEqual({ segment: 'ZZZ', position: 14, line: 3 });
    expect(err.suggestion).toBe('Did you mean ZA?');
  });

  it('serializes to structured JSON', () => {
    const err = new EDIConvertError('PARSE_INVALID_SEGMENT', 'Bad segment', {
      location: { segment: 'ZZZ', position: 14, line: 3 },
    });
    expect(err.toJSON()).toEqual({
      error: {
        code: 'PARSE_INVALID_SEGMENT',
        message: 'Bad segment',
        location: { segment: 'ZZZ', position: 14, line: 3 },
      },
    });
  });
});

describe('ParseError', () => {
  it('has PARSE_ prefix category', () => {
    const err = new ParseError('INVALID_SEGMENT', 'Bad segment');
    expect(err.code).toBe('PARSE_INVALID_SEGMENT');
  });
});

describe('ValidateError', () => {
  it('has VALIDATE_ prefix category', () => {
    const err = new ValidateError('MISSING_FIELD', 'Field required');
    expect(err.code).toBe('VALIDATE_MISSING_FIELD');
  });
});

describe('PartnerError', () => {
  it('has PARTNER_ prefix category', () => {
    const err = new PartnerError('UNKNOWN', 'Partner not found');
    expect(err.code).toBe('PARTNER_UNKNOWN');
  });
});

describe('GatewayError', () => {
  it('has GATEWAY_ prefix category', () => {
    const err = new GatewayError('NOT_CONFIGURED', 'Missing config');
    expect(err.code).toBe('GATEWAY_NOT_CONFIGURED');
    expect(err.name).toBe('GatewayError');
  });
});
