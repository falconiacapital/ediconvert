export interface ErrorLocation {
  segment?: string;
  position?: number;
  line?: number;
  element?: number;
}

export interface ErrorOptions {
  location?: ErrorLocation;
  suggestion?: string;
}

export class EDIConvertError extends Error {
  public readonly code: string;
  public readonly location?: ErrorLocation;
  public readonly suggestion?: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message);
    this.name = 'EDIConvertError';
    this.code = code;
    this.location = options?.location;
    this.suggestion = options?.suggestion;
  }

  toJSON(): Record<string, unknown> {
    const error: Record<string, unknown> = {
      code: this.code,
      message: this.message,
    };
    if (this.location) error.location = this.location;
    if (this.suggestion) error.suggestion = this.suggestion;
    return { error };
  }
}

export class ParseError extends EDIConvertError {
  constructor(subcode: string, message: string, options?: ErrorOptions) {
    super(`PARSE_${subcode}`, message, options);
    this.name = 'ParseError';
  }
}

export class ValidateError extends EDIConvertError {
  constructor(subcode: string, message: string, options?: ErrorOptions) {
    super(`VALIDATE_${subcode}`, message, options);
    this.name = 'ValidateError';
  }
}

export class PartnerError extends EDIConvertError {
  constructor(subcode: string, message: string, options?: ErrorOptions) {
    super(`PARTNER_${subcode}`, message, options);
    this.name = 'PartnerError';
  }
}

export class GatewayError extends EDIConvertError {
  constructor(subcode: string, message: string, options?: ErrorOptions) {
    super(`GATEWAY_${subcode}`, message, options);
    this.name = 'GatewayError';
  }
}
