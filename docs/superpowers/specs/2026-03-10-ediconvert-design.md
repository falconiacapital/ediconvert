# EDIConvert — Design Specification

## Vision

EDIConvert is an open-source protocol and SDK that makes EDI invisible. Like Stripe abstracted payment processing behind a clean API, EDIConvert abstracts EDI behind an OpenAPI specification — the **Open Commerce Exchange Protocol (OCEX)**.

Companies using EDI don't need to change anything on day one. EDIConvert translates between the OCEX protocol and legacy EDI formats (X12, EDIFACT). Over time, as adoption grows, trading partners connect directly via the protocol — making EDI obsolete.

## Problem

EDI (Electronic Data Interchange) remains the backbone of B2B commerce across construction, healthcare, retail, logistics, and finance. The technology dates to the 1970s and uses cryptic segment/element syntax with rigid trading partner requirements. Modern developers expect REST APIs with JSON; instead they get fixed-width files transmitted over AS2/SFTP.

This creates a massive integration gap. Companies like Home Depot, SRS, and GMS in construction — and thousands of others across industries — force their partners to speak EDI. Developers building modern platforms (like SimplyWise) cannot integrate with these systems without expensive, specialized middleware.

## Approach: Protocol-First (Stripe Model)

- Define an open specification (OpenAPI 3.x) for B2B data exchange
- Build a reference implementation as an open-source TypeScript SDK
- Provide a self-hostable gateway that bridges legacy EDI systems
- Revenue from managed cloud platform, not the protocol itself

## Architecture — Four Layers

### Layer 1: TypeScript SDK (`@ediconvert/sdk`)

The SDK operates in two modes:

- **Local mode** (no API key required): `parse()` and `generate()` run entirely in-process using `@ediconvert/core`. No network calls. Useful for CLI tools, scripts, and self-hosted setups.
- **Gateway mode** (API key required): Resource methods like `invoices.list()` and `orders.create()` make HTTP calls to a gateway instance (self-hosted or cloud). Webhooks are delivered as HTTP POST callbacks to a URL you configure.

```typescript
import { EDIConvert } from '@ediconvert/sdk';

// Local mode — no API key, pure parsing/generation
const edi = new EDIConvert();
const invoice = await edi.parse(rawEdiString);   // local, CPU-only
const ediDoc = await edi.generate({ type: 'purchase-order', ... }); // local

// Gateway mode — connects to a running gateway
const edi = new EDIConvert({
  apiKey: 'edi_live_...',
  gateway: 'https://gateway.yourcompany.com'
});

const invoices = await edi.invoices.list({
  partner: 'home-depot',
  since: '2026-01-01'
});

// Webhook registration (HTTP POST callbacks, configured via gateway API)
await edi.webhooks.create({
  url: 'https://yourapp.com/hooks/edi',
  events: ['invoice.received', 'order.created']
});
```

### Layer 2: OCEX Protocol Spec (OpenAPI 3.x)

The open standard. Defines schemas for all B2B document types, industry-agnostic with opt-in extensions.

**Core document types (universal):**

| EDI Transaction | OCEX Endpoint      | Description          |
|-----------------|---------------------|----------------------|
| 810             | `/invoices`         | Invoices             |
| 850             | `/orders`           | Purchase orders      |
| 832             | `/catalogs`         | Price/product catalogs |
| 856             | `/shipments`        | Advance ship notices |
| 997             | `/acknowledgments`  | Functional acknowledgments |

**Industry extensions (opt-in):**

| EDI Transaction | OCEX Endpoint      | Industry     |
|-----------------|---------------------|--------------|
| 837             | `/claims`           | Healthcare   |
| 270/271         | `/eligibility`      | Healthcare   |
| —               | `/lien-waivers`     | Construction |
| 846             | `/inventory`        | Retail       |

The spec lives as an OpenAPI 3.x YAML document with JSON Schema definitions for each document type.

### Layer 3: Translation Engine (`@ediconvert/core`)

Bidirectional EDI-to-OCEX conversion engine.

- Parses EDI X12 documents into OCEX JSON (EDIFACT support deferred to post-v1)
- Generates valid EDI X12 documents from OCEX JSON
- Trading partner profile management — profiles define: delimiter overrides, segment allowlists/denylists, endpoint URLs, and partner-specific field mappings
- Validation engine enforcing segment/element rules per transaction set. On validation failure, returns structured errors with segment location, rule violated, and suggested fix
- Mapping rules stored as YAML config files (not hardcoded). Each transaction set has a YAML file defining segment-to-field mappings, enabling community contributions without code changes

### Layer 4: Gateway Server (`@ediconvert/gateway`)

Self-hostable Express.js server that bridges legacy and modern systems.

- **Inbound:** Receives EDI via SFTP → parses → fires webhook (HTTP POST) to configured URLs. AS2 support deferred to post-v1 due to protocol complexity (MDN receipts, certificate exchange).
- **Outbound:** Receives API calls → generates EDI → sends via SFTP
- **Dashboard:** Server-rendered HTML status pages (transaction log, partner status, error log). Not a full SPA — minimal frontend footprint for v1.
- **Partner management:** Configure trading partner connections via API and config files
- **Storage:** SQLite by default (zero-config), with a pluggable adapter interface for Postgres in production deployments. Stores transaction log, parsed documents, and partner configs.
- **Auth:** API key-based authentication. Keys are generated and managed via CLI (`ediconvert keys create`). Keys are scoped per partner or global. No external auth service dependency for self-hosted.

## Project Structure

```
ediconvert/
├── packages/
│   ├── core/          — EDI parser/generator + OCEX translation
│   ├── sdk/           — Developer-facing TypeScript SDK
│   ├── gateway/       — Self-hostable API gateway server
│   └── cli/           — CLI tool (ediconvert parse, validate, convert)
├── protocol/
│   ├── openapi.yaml   — OCEX OpenAPI 3.x specification
│   └── schemas/       — JSON Schema definitions per document type
├── mappings/
│   ├── x12/           — X12 transaction set → OCEX mapping rules
│   └── edifact/       — EDIFACT message → OCEX mapping rules
├── partners/
│   └── templates/     — Trading partner profile templates
├── docs/              — Documentation site
├── examples/          — Integration examples
└── tests/             — Test fixtures (sample EDI documents)
```

TypeScript monorepo managed with npm workspaces. Each package is independently publishable to npm under the `@ediconvert` scope.

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js
- **Package management:** npm workspaces (monorepo)
- **Gateway framework:** Express.js
- **Protocol format:** OpenAPI 3.x + JSON Schema
- **Testing:** Vitest
- **Linting:** ESLint + Prettier
- **Build:** tsup (fast TypeScript bundler)
- **Docs:** VitePress

## Revenue Model

### Free / Open Source
- OCEX Protocol Specification
- Core translation engine (`@ediconvert/core`)
- TypeScript SDK (`@ediconvert/sdk`)
- CLI tool (`@ediconvert/cli`)
- Self-hosted gateway (`@ediconvert/gateway`)
- Community trading partner profiles

### Paid / Cloud Platform
- Managed gateway hosting
- Pre-built trading partner connections
- Transaction monitoring dashboard
- Compliance and audit logging
- Priority support and SLAs
- Enterprise SSO and team management

## Protocol Versioning

OCEX uses URL-based versioning (`/v1/invoices`, `/v2/invoices`). The spec itself follows semantic versioning (e.g., `ocex-1.2.0`). Breaking changes increment the URL version. Non-breaking additions (new optional fields, new endpoints) increment the spec minor version within the same URL version.

## Error Handling

All layers return structured errors following a consistent schema:

```json
{
  "error": {
    "code": "PARSE_INVALID_SEGMENT",
    "message": "Unknown segment 'ZZZ' at position 14",
    "location": { "segment": "ZZZ", "position": 14, "line": 3 },
    "suggestion": "Did you mean 'ZA'? Check trading partner spec for allowed segments."
  }
}
```

Error categories: `PARSE_*` (malformed EDI), `VALIDATE_*` (structurally valid but semantically wrong), `PARTNER_*` (partner-specific rule violation), `GATEWAY_*` (connectivity/auth errors).

## Security

- All gateway API endpoints require TLS (HTTPS). The gateway refuses to start with HTTP in production mode.
- SFTP connections use key-based authentication (no password auth).
- API keys are stored hashed (bcrypt). Raw keys are shown once at creation.
- Parsed documents containing PII (healthcare extensions) are flagged and can be configured for encryption at rest via the storage adapter.
- The core parsing library has no network access and no side effects — safe to run on untrusted input.

## V1 Scope

**In scope:**
- X12 transaction sets: 810, 850, 832, 856, 997
- SFTP transport (inbound and outbound)
- Core SDK (local + gateway modes)
- CLI tool with commands: `parse`, `validate`, `generate`, `keys`
- Gateway with SQLite storage and webhook delivery
- OCEX OpenAPI v1 spec for the five core document types

**Deferred to post-v1:**
- EDIFACT support
- AS2 transport
- Industry extensions (healthcare, construction, retail)
- Dashboard UI beyond basic status pages
- Postgres storage adapter

## Success Criteria

1. `npm install @ediconvert/sdk` works and provides a clean, documented API
2. Can parse the five core X12 transaction sets (810, 850, 832, 856, 997) into OCEX JSON and back with semantic equivalence (business data preserved; envelope metadata like ISA/GS control numbers may be regenerated)
3. OCEX OpenAPI spec is complete enough that codegen tools produce useful clients
4. Gateway can receive EDI via SFTP and expose it as REST API + webhooks
5. At least one real-world EDI document (construction invoice 810) round-trips cleanly
6. Open-source repo with clear docs, examples, and contribution guidelines
