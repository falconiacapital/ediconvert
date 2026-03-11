export class HttpClient {
  constructor(private baseUrl: string, private apiKey: string) {}

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) url.searchParams.set(k, v);
      }
    }
    const res = await fetch(url.toString(), {
      headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`Gateway error: ${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const url = new URL(path, this.baseUrl);
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Gateway error: ${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
  }
}
