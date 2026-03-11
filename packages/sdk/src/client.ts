import { translateToOcex, translateToX12, GatewayError } from '@ediconvert/core';
import type { OcexDocument } from '@ediconvert/core';
import { HttpClient } from './http.js';

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
  private http?: HttpClient;

  constructor(config: EDIConvertConfig = {}) {
    this.config = config;
    if (config.apiKey && config.gateway) {
      this.http = new HttpClient(config.gateway, config.apiKey);
    }
  }

  async parse(raw: string): Promise<OcexDocument> { return translateToOcex(raw); }
  async generate(doc: OcexDocument): Promise<string> { return translateToX12(doc); }

  get invoices() {
    const config = this.config;
    const http = this.http;
    return {
      list: async (params: Record<string, unknown>) => {
        if (!http) { requireGateway(config); return []; }
        const result = await http.get<{ data: any[] }>('/v1/invoices', params as Record<string, string>);
        return result.data;
      },
    };
  }

  get orders() {
    const config = this.config;
    const http = this.http;
    return {
      list: async (params: Record<string, unknown>) => {
        if (!http) { requireGateway(config); return []; }
        const result = await http.get<{ data: any[] }>('/v1/orders', params as Record<string, string>);
        return result.data;
      },
    };
  }

  get webhooks() {
    const config = this.config;
    const http = this.http;
    return {
      create: async (params: Record<string, unknown>) => {
        if (!http) { requireGateway(config); return {}; }
        const result = await http.post<{ data: any }>('/v1/webhooks', params);
        return result.data;
      },
    };
  }
}
