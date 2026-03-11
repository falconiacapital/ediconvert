# EDIConvert

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/badge/npm-%40ediconvert%2Fsdk-orange)](https://www.npmjs.com/package/@ediconvert/sdk)

EDIConvert is the developer-friendly toolkit for working with X12 EDI — the decades-old B2B data format still used by retailers, logistics providers, and healthcare systems worldwide. It translates legacy EDI (810, 850, 832, 856, 997) to and from **OCEX** (Open Commerce Exchange), a clean JSON-over-REST protocol designed to replace fixed-width flat files with something humans can actually read and debug.

Think of it as Stripe for EDI: a typed SDK, a self-hostable REST gateway, a CLI, and an OpenAPI spec — all in one monorepo.

---

## Quick Start

Parse an EDI 810 invoice in three lines:

```typescript
import { EDIConvert } from '@ediconvert/sdk';

const edi = new EDIConvert();
const invoice = await edi.parse(rawEdiString);
// => { type: 'invoice', invoiceNumber: 'INV-001', total: 499.00, ... }
```

---

## Features

- **5 core document types** — invoices (810), purchase orders (850), catalogs (832), shipments (856), and acknowledgments (997)
- **Bidirectional translation** — parse raw X12 EDI to OCEX JSON, or generate EDI from OCEX documents
- **Stripe-like SDK** — `new EDIConvert()` works locally with no server; point it at a gateway for cloud mode
- **CLI tool** — `ediconvert parse`, `ediconvert validate`, `ediconvert generate` for shell scripting and CI pipelines
- **Self-hostable gateway** — an Express server with SQLite storage, API key auth, webhook delivery, and a built-in dashboard
- **OpenAPI specification** — full OCEX protocol spec at [`protocol/openapi.yaml`](./protocol/openapi.yaml)

---

## Installation

```bash
npm install @ediconvert/sdk
```

For the CLI:

```bash
npm install -g @ediconvert/cli
```

For self-hosting the gateway:

```bash
npm install @ediconvert/gateway @ediconvert/core
```

---

## SDK Usage

### Local mode (no server required)

Parse and generate EDI entirely in-process — no network calls, no API keys:

```typescript
import { EDIConvert } from '@ediconvert/sdk';
import { readFileSync } from 'node:fs';

const edi = new EDIConvert();

// Parse EDI → OCEX JSON
const raw = readFileSync('./invoice.edi', 'utf-8');
const invoice = await edi.parse(raw);
console.log(invoice.sender.name);   // "Acme Corp"
console.log((invoice as any).total); // 1234.56

// Generate EDI ← OCEX JSON
const x12 = await edi.generate(invoice);
console.log(x12); // ISA*00*...
```

### Gateway mode

Point the SDK at a running gateway to list, filter, and retrieve documents via REST:

```typescript
import { EDIConvert } from '@ediconvert/sdk';

const edi = new EDIConvert({
  apiKey: process.env.EDI_API_KEY,
  gateway: 'https://edi.example.com',
});

// List invoices
const invoices = await edi.invoices.list({ limit: 10 });

// List purchase orders
const orders = await edi.orders.list({ partner: 'ACME' });

// Register a webhook
await edi.webhooks.create({
  url: 'https://app.example.com/webhooks/edi',
  events: ['invoice.received', 'order.received'],
});
```

See [`examples/parse-invoice.ts`](./examples/parse-invoice.ts) and [`examples/gateway-quickstart.ts`](./examples/gateway-quickstart.ts) for runnable examples.

---

## CLI Usage

```bash
# Parse an EDI file to OCEX JSON
ediconvert parse invoice.edi

# Validate an EDI file (exits 0 on success, 1 on error)
ediconvert validate invoice.edi

# Generate X12 EDI from an OCEX JSON file
ediconvert generate invoice.json

# Show all commands
ediconvert --help
```

Example output from `ediconvert parse`:

```json
{
  "type": "invoice",
  "invoiceNumber": "INV-2024-001",
  "sender": { "id": "1234567890", "name": "Acme Corp" },
  "receiver": { "id": "0987654321", "name": "Buyer Co" },
  "total": 499.00,
  "currency": "USD",
  "lineItems": [ ... ]
}
```

---

## Gateway Setup

The gateway is a self-contained Express server backed by SQLite. Deploy it anywhere Node.js runs.

### Environment variables

| Variable             | Default              | Description                                         |
|----------------------|----------------------|-----------------------------------------------------|
| `EDI_PORT`           | `3000`               | Port the HTTP server listens on                     |
| `EDI_DB_PATH`        | `./ediconvert.db`    | Path to the SQLite database file                    |
| `EDI_INBOX_DIR`      | _(unset)_            | Directory to watch for incoming EDI files (SFTP/local) |
| `EDI_PROCESSED_DIR`  | _(unset)_            | Directory to move processed EDI files into          |
| `EDI_POLL_INTERVAL`  | `30000`              | Inbox polling interval in milliseconds              |

### Starting the gateway

```bash
EDI_PORT=3000 EDI_DB_PATH=./data/edi.db node packages/gateway/src/index.js
```

Or with Docker:

```bash
docker run -p 3000:3000 -v $(pwd)/data:/data \
  -e EDI_DB_PATH=/data/edi.db \
  ediconvert/gateway
```

### Dashboard

Once running, visit `http://localhost:3000` for a real-time document dashboard showing counts and recent activity across all document types.

### API key management

```bash
# Create a key (via the gateway's auth manager)
curl -X POST http://localhost:3000/v1/keys \
  -H 'X-API-Key: <admin-key>' \
  -d '{ "label": "partner-acme", "partnerScope": "ACME" }'
```

All API endpoints require the key in the `X-API-Key` header.

---

## OCEX Protocol

OCEX (Open Commerce Exchange) is the JSON-native document protocol that EDIConvert translates EDI into and out of. Full spec: [`protocol/openapi.yaml`](./protocol/openapi.yaml).

### Document types

| OCEX type        | EDI equivalent | Description                              |
|------------------|----------------|------------------------------------------|
| `invoice`        | 810            | Request for payment from vendor to buyer |
| `order`          | 850            | Purchase order from buyer to vendor      |
| `catalog`        | 832            | Price/sales catalog from vendor          |
| `shipment`       | 856            | Advance ship notice (ASN)                |
| `acknowledgment` | 997            | Functional acknowledgment                |

All documents share a common envelope with `type`, `sender`, and `receiver` fields:

```json
{
  "type": "invoice",
  "sender":   { "id": "1234567890", "name": "Acme Corp" },
  "receiver": { "id": "0987654321", "name": "Buyer Co" },
  ...
}
```

Errors follow a consistent envelope across all endpoints:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'currency' is required for invoices.",
    "location": "body.currency",
    "suggestion": "Add a three-letter ISO 4217 currency code."
  }
}
```

---

## Project Structure

```
ediconvert/
├── packages/
│   ├── core/          # Translator engine: X12 tokenizer, OCEX mapping, reverse translator
│   ├── sdk/           # @ediconvert/sdk — TypeScript client (local + gateway modes)
│   ├── gateway/       # @ediconvert/gateway — Express server, SQLite storage, auth, webhooks
│   └── cli/           # @ediconvert/cli — Command-line interface
├── protocol/
│   ├── openapi.yaml   # Full OCEX OpenAPI 3.1 specification
│   └── schemas/       # JSON Schema files for each document type
├── mappings/          # YAML field-mapping definitions (EDI ↔ OCEX)
├── tests/
│   ├── fixtures/      # Sample EDI files (810, 850, 832, 856, 997)
│   └── integration/   # End-to-end gateway + SDK tests
└── examples/          # Runnable quickstart scripts
```

---

## Contributing

1. Fork the repository and create a branch from `main`.
2. Install dependencies: `npm install`
3. Run the test suite: `npm test`
4. Make your changes and add tests covering new behavior.
5. Ensure linting passes: `npm run lint`
6. Open a pull request with a clear description of what you changed and why.

All packages are TypeScript-strict. New translators should add a corresponding YAML mapping file under `mappings/` and fixture files under `tests/fixtures/`.

---

## License

MIT — see [LICENSE](./LICENSE) for details.
