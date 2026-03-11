import { translateToOcex, translateToX12, GatewayError } from '@ediconvert/core';
import type { OcexDocument } from '@ediconvert/core';

export interface EDIConvertConfig {
  apiKey?: string;
  gateway?: string;
}

function requireGateway(config: EDIConvertConfig): void {
  if (!config.apiKey || !config.gateway) {
    throw new GatewayError('NOT_CONFIGURED', 'Gateway mode requires apiKey and gateway URL');
  }
}

export class EDIConvert {
  private config: EDIConvertConfig;
  constructor(config: EDIConvertConfig = {}) { this.config = config; }

  async parse(raw: string): Promise<OcexDocument> { return translateToOcex(raw); }
  async generate(doc: OcexDocument): Promise<string> { return translateToX12(doc); }

  get invoices() {
    return { list: async (_params: Record<string, unknown>) => { requireGateway(this.config); return []; } };
  }
  get orders() {
    return { list: async (_params: Record<string, unknown>) => { requireGateway(this.config); return []; } };
  }
  get webhooks() {
    return { create: async (_params: Record<string, unknown>) => { requireGateway(this.config); return {}; } };
  }
}
