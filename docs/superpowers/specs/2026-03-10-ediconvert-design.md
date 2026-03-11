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

Developer-facing interface. Stripe-like API design.

```typescript
import { EDIConvert } from '@ediconvert/sdk';

const edi = new EDIConvert({ apiKey: 'edi_live_...' });

// Parse raw EDI into clean JSON
const invoice = await edi.parse(rawEdiString);

// List invoices from a trading partner
const invoices = await edi.invoices.list({
  partner: 'home-depot',
  since: '2026-01-01'
});

// Generate EDI from structured data
const ediDoc = await edi.generate({
  type: 'purchase-order',
  partner: 'srs',
  items: [{ sku: 'SHG-001', qty: 500 }]
});

// Webhooks (Stripe-style event system)
edi.on('invoice.received', (invoice) => {
  console.log(`New invoice: $${invoice.total}`);
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

- Parses EDI X12 and EDIFACT documents into OCEX JSON
- Generates valid EDI documents from OCEX JSON
- Trading partner profile management (each partner has quirks)
- Validation engine enforcing segment/element rules per transaction set
- Mapping rules stored as declarative config (not hardcoded)

### Layer 4: Gateway Server (`@ediconvert/gateway`)

Self-hostable Express.js server that bridges legacy and modern systems.

- **Inbound:** Receives EDI via AS2/SFTP → parses → fires webhooks
- **Outbound:** Receives API calls → generates EDI → sends via AS2/SFTP
- **Dashboard:** Web UI for monitoring transactions
- **Partner management:** Configure trading partner connections

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
- **Docs:** VitePress or similar

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

## Success Criteria

1. `npm install @ediconvert/sdk` works and provides a clean, documented API
2. Can parse any valid X12 document into OCEX JSON and back without data loss
3. OCEX OpenAPI spec is complete enough that codegen tools produce useful clients
4. Gateway can receive EDI via SFTP and expose it as REST API + webhooks
5. At least one real-world EDI document (construction invoice 810) round-trips cleanly
6. Open-source repo with clear docs, examples, and contribution guidelines
