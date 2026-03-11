# EDIConvert Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an open-source protocol and SDK that translates EDI X12 into clean REST/JSON APIs via the OCEX (Open Commerce Exchange Protocol) specification.

**Architecture:** TypeScript monorepo with four packages: `core` (X12 parser/generator + OCEX translation), `sdk` (Stripe-like developer SDK), `gateway` (Express server with SQLite + SFTP + webhooks), and `cli` (command-line tool). The OCEX protocol is defined as an OpenAPI 3.x spec. V1 covers five X12 transaction sets: 810, 850, 832, 856, 997.

**Tech Stack:** TypeScript (strict), Node.js, npm workspaces, Express.js, SQLite (better-sqlite3), Vitest, tsup, ESLint + Prettier

**Spec:** `docs/superpowers/specs/2026-03-10-ediconvert-design.md`

---

## Chunk 1: Foundation — Monorepo, Shared Types, X12 Tokenizer

### Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json` (root)
- Create: `tsconfig.json` (root)
- Create: `tsconfig.base.json`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/sdk/package.json`
- Create: `packages/sdk/tsconfig.json`
- Create: `packages/sdk/src/index.ts`
- Create: `packages/gateway/package.json`
- Create: `packages/gateway/tsconfig.json`
- Create: `packages/gateway/src/index.ts`
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/src/index.ts`
- Create: `vitest.config.ts`
- Create: `.eslintrc.json`
- Create: `.prettierrc`

- [ ] **Step 1: Create root package.json with workspaces**

```json
{
  "name": "ediconvert",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint 'packages/*/src/**/*.ts'",
    "format": "prettier --write 'packages/*/src/**/*.ts'"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

- [ ] **Step 3: Create root tsconfig.json**

```json
{
  "extends": "./tsconfig.base.json",
  "references": [
    { "path": "packages/core" },
    { "path": "packages/sdk" },
    { "path": "packages/gateway" },
    { "path": "packages/cli" }
  ],
  "compilerOptions": {
    "composite": true
  }
}
```

- [ ] **Step 4: Create packages/core scaffold**

`packages/core/package.json`:
```json
{
  "name": "@ediconvert/core",
  "version": "0.1.0",
  "description": "EDI X12 parser/generator and OCEX translation engine",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch"
  },
  "license": "MIT"
}
```

`packages/core/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

`packages/core/src/index.ts`:
```typescript
export const VERSION = '0.1.0';
```

- [ ] **Step 5: Create packages/sdk, packages/gateway, packages/cli scaffolds**

`packages/sdk/package.json`:
```json
{
  "name": "@ediconvert/sdk",
  "version": "0.1.0",
  "description": "Stripe-like TypeScript SDK for EDI/OCEX",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch"
  },
  "dependencies": {
    "@ediconvert/core": "*"
  },
  "license": "MIT"
}
```

`packages/gateway/package.json`:
```json
{
  "name": "@ediconvert/gateway",
  "version": "0.1.0",
  "description": "Self-hostable EDI gateway server",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch"
  },
  "dependencies": {
    "@ediconvert/core": "*",
    "express": "^4.21.0",
    "better-sqlite3": "^11.0.0",
    "bcrypt": "^5.1.0"
  },
  "license": "MIT"
}
```

`packages/cli/package.json`:
```json
{
  "name": "@ediconvert/cli",
  "version": "0.1.0",
  "description": "CLI tool for EDI parsing, validation, and generation",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "ediconvert": "./dist/index.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format cjs --dts",
    "dev": "tsup src/index.ts --format cjs --dts --watch"
  },
  "dependencies": {
    "@ediconvert/core": "*"
  },
  "license": "MIT"
}
```

Each gets the same `tsconfig.json` pattern as core and a minimal `src/index.ts` exporting VERSION.

- [ ] **Step 6: Create .gitignore, vitest.config.ts, .eslintrc.json, .prettierrc**

`.gitignore`:
```
node_modules/
dist/
*.db
.env
```

`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['packages/*/src/**/*.test.ts'],
  },
});
```

`.eslintrc.json`:
```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

`.prettierrc`:
```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

- [ ] **Step 7: Run npm install and verify build**

Run: `npm install && npm run build`
Expected: All four packages build successfully with dist/ output.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: scaffold monorepo with core, sdk, gateway, cli packages"
```

---

### Task 2: Shared Error Types

**Files:**
- Create: `packages/core/src/errors.ts`
- Create: `packages/core/src/errors.test.ts`

- [ ] **Step 1: Write failing test for EDIConvertError**

```typescript
// packages/core/src/errors.test.ts
import { describe, it, expect } from 'vitest';
import { EDIConvertError, ParseError, ValidateError, PartnerError } from './errors.js';

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
```

(Update import to include `GatewayError`)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/src/errors.test.ts`
Expected: FAIL — cannot find module `./errors.js`

- [ ] **Step 3: Implement error classes**

```typescript
// packages/core/src/errors.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/core/src/errors.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Export from index and commit**

Add to `packages/core/src/index.ts`:
```typescript
export * from './errors.js';
```

```bash
git add packages/core/src/errors.ts packages/core/src/errors.test.ts packages/core/src/index.ts
git commit -m "feat(core): add structured error types with categories"
```

---

### Task 3: OCEX Document Types

**Files:**
- Create: `packages/core/src/types.ts`
- Create: `packages/core/src/types.test.ts`

- [ ] **Step 1: Write failing test for OCEX type definitions**

```typescript
// packages/core/src/types.test.ts
import { describe, it, expect } from 'vitest';
import type {
  OcexDocument,
  OcexInvoice,
  OcexOrder,
  OcexCatalog,
  OcexShipment,
  OcexAcknowledgment,
  OcexLineItem,
  OcexAddress,
  OcexParty,
} from './types.js';

describe('OCEX Types', () => {
  it('creates a valid invoice document', () => {
    const invoice: OcexInvoice = {
      type: 'invoice',
      id: 'INV-001',
      version: 'ocex-1.0.0',
      sender: { id: 'HOMEDEPOT', name: 'Home Depot' },
      receiver: { id: 'SUPPLIER1', name: 'ABC Supply' },
      documentDate: '2026-03-10',
      invoiceNumber: 'HD-2026-0001',
      purchaseOrderRef: 'PO-5001',
      currency: 'USD',
      lineItems: [
        {
          lineNumber: 1,
          sku: 'SHG-001',
          description: 'Architectural Shingles',
          quantity: 500,
          unitOfMeasure: 'EA',
          unitPrice: 29.00,
          totalPrice: 14500.00,
        },
      ],
      subtotal: 14500.00,
      tax: 1160.00,
      total: 15660.00,
    };
    expect(invoice.type).toBe('invoice');
    expect(invoice.lineItems).toHaveLength(1);
    expect(invoice.total).toBe(15660.00);
  });

  it('creates a valid purchase order', () => {
    const order: OcexOrder = {
      type: 'order',
      id: 'ORD-001',
      version: 'ocex-1.0.0',
      sender: { id: 'SUPPLIER1', name: 'ABC Supply' },
      receiver: { id: 'HOMEDEPOT', name: 'Home Depot' },
      documentDate: '2026-03-10',
      orderNumber: 'PO-5001',
      shipTo: { street: '123 Main St', city: 'Atlanta', state: 'GA', zip: '30301', country: 'US' },
      lineItems: [
        {
          lineNumber: 1,
          sku: 'SHG-001',
          description: 'Architectural Shingles',
          quantity: 500,
          unitOfMeasure: 'EA',
          unitPrice: 29.00,
          totalPrice: 14500.00,
        },
      ],
      total: 14500.00,
    };
    expect(order.type).toBe('order');
  });

  it('creates a valid acknowledgment', () => {
    const ack: OcexAcknowledgment = {
      type: 'acknowledgment',
      id: 'ACK-001',
      version: 'ocex-1.0.0',
      sender: { id: 'HOMEDEPOT', name: 'Home Depot' },
      receiver: { id: 'SUPPLIER1', name: 'ABC Supply' },
      documentDate: '2026-03-10',
      referencedDocumentId: 'ORD-001',
      accepted: true,
      errors: [],
    };
    expect(ack.accepted).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/src/types.test.ts`
Expected: FAIL — cannot find module `./types.js`

- [ ] **Step 3: Implement OCEX type definitions**

```typescript
// packages/core/src/types.ts
export interface OcexParty {
  id: string;
  name: string;
  qualifier?: string;
}

export interface OcexAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  street2?: string;
}

export interface OcexLineItem {
  lineNumber: number;
  sku: string;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  totalPrice: number;
  upc?: string;
  buyerPartNumber?: string;
  vendorPartNumber?: string;
}

interface OcexDocumentBase {
  id: string;
  version: string;
  sender: OcexParty;
  receiver: OcexParty;
  documentDate: string;
  metadata?: Record<string, unknown>;
}

export interface OcexInvoice extends OcexDocumentBase {
  type: 'invoice';
  invoiceNumber: string;
  purchaseOrderRef?: string;
  currency: string;
  lineItems: OcexLineItem[];
  subtotal?: number;
  tax?: number;
  total: number;
  shipTo?: OcexAddress;
  billTo?: OcexAddress;
  dueDate?: string;
  terms?: string;
}

export interface OcexOrder extends OcexDocumentBase {
  type: 'order';
  orderNumber: string;
  shipTo: OcexAddress;
  lineItems: OcexLineItem[];
  total: number;
  billTo?: OcexAddress;
  requestedDeliveryDate?: string;
  currency?: string;
}

export interface OcexCatalog extends OcexDocumentBase {
  type: 'catalog';
  catalogId: string;
  effectiveDate: string;
  expirationDate?: string;
  items: OcexLineItem[];
}

export interface OcexShipment extends OcexDocumentBase {
  type: 'shipment';
  shipmentId: string;
  orderRef: string;
  carrier: string;
  trackingNumber?: string;
  shipDate: string;
  estimatedDelivery?: string;
  shipFrom: OcexAddress;
  shipTo: OcexAddress;
  lineItems: OcexLineItem[];
}

export interface OcexAcknowledgment extends OcexDocumentBase {
  type: 'acknowledgment';
  referencedDocumentId: string;
  accepted: boolean;
  errors: Array<{ code: string; message: string }>;
}

export type OcexDocument =
  | OcexInvoice
  | OcexOrder
  | OcexCatalog
  | OcexShipment
  | OcexAcknowledgment;

export type OcexDocumentType = OcexDocument['type'];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/core/src/types.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 5: Export from index and commit**

Add to `packages/core/src/index.ts`:
```typescript
export * from './types.js';
```

```bash
git add packages/core/src/types.ts packages/core/src/types.test.ts packages/core/src/index.ts
git commit -m "feat(core): add OCEX document type definitions"
```

---

### Task 4: X12 Tokenizer

**Files:**
- Create: `packages/core/src/x12/tokenizer.ts`
- Create: `packages/core/src/x12/tokenizer.test.ts`
- Create: `packages/core/src/x12/types.ts`

The tokenizer takes raw EDI X12 text and splits it into structured segments and elements. This is the lowest-level parsing — no semantic understanding, just structural decomposition.

- [ ] **Step 1: Write X12 internal types**

```typescript
// packages/core/src/x12/types.ts
export interface X12Delimiters {
  element: string;    // typically '*'
  segment: string;    // typically '~'
  component: string;  // typically ':'
  repetition: string; // typically '^'
}

export interface X12Element {
  value: string;
  components?: string[];
}

export interface X12Segment {
  tag: string;
  elements: X12Element[];
  raw: string;
}

export interface X12Envelope {
  delimiters: X12Delimiters;
  segments: X12Segment[];
  isaControlNumber: string;
  gsControlNumber: string;
  transactionSetCode: string;
}
```

- [ ] **Step 2: Write failing tokenizer tests**

```typescript
// packages/core/src/x12/tokenizer.test.ts
import { describe, it, expect } from 'vitest';
import { tokenize, detectDelimiters } from './tokenizer.js';

const SAMPLE_ISA =
  'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *210901*1234*^*00501*000000001*0*P*:~';

const SAMPLE_997 = `${SAMPLE_ISA}GS*FA*SENDER*RECEIVER*20210901*1234*1*X*005010~ST*997*0001~AK1*PO*1~AK9*A*1*1*1~SE*4*0001~GE*1*1~IEA*1*000000001~`;

describe('detectDelimiters', () => {
  it('detects standard delimiters from ISA segment', () => {
    const d = detectDelimiters(SAMPLE_ISA);
    expect(d.element).toBe('*');
    expect(d.segment).toBe('~');
    expect(d.component).toBe(':');
    expect(d.repetition).toBe('^');
  });

  it('throws ParseError for non-ISA input', () => {
    expect(() => detectDelimiters('NOT*AN*EDI')).toThrow('PARSE_MISSING_ISA');
  });
});

describe('tokenize', () => {
  it('parses a complete 997 into segments', () => {
    const envelope = tokenize(SAMPLE_997);
    expect(envelope.transactionSetCode).toBe('997');
    expect(envelope.segments.length).toBeGreaterThan(0);
    const tags = envelope.segments.map((s) => s.tag);
    expect(tags).toContain('ISA');
    expect(tags).toContain('GS');
    expect(tags).toContain('ST');
    expect(tags).toContain('AK1');
    expect(tags).toContain('AK9');
    expect(tags).toContain('SE');
    expect(tags).toContain('GE');
    expect(tags).toContain('IEA');
  });

  it('splits elements correctly', () => {
    const envelope = tokenize(SAMPLE_997);
    const ak1 = envelope.segments.find((s) => s.tag === 'AK1')!;
    expect(ak1.elements[0].value).toBe('PO');
    expect(ak1.elements[1].value).toBe('1');
  });

  it('extracts ISA control number', () => {
    const envelope = tokenize(SAMPLE_997);
    expect(envelope.isaControlNumber).toBe('000000001');
  });

  it('extracts GS control number', () => {
    const envelope = tokenize(SAMPLE_997);
    expect(envelope.gsControlNumber).toBe('1');
  });

  it('handles whitespace and newlines in input', () => {
    const withNewlines = SAMPLE_997.replace(/~/g, '~\n');
    const envelope = tokenize(withNewlines);
    expect(envelope.transactionSetCode).toBe('997');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run packages/core/src/x12/tokenizer.test.ts`
Expected: FAIL — cannot find module `./tokenizer.js`

- [ ] **Step 4: Implement tokenizer**

```typescript
// packages/core/src/x12/tokenizer.ts
import { ParseError } from '../errors.js';
import type { X12Delimiters, X12Element, X12Segment, X12Envelope } from './types.js';

export function detectDelimiters(raw: string): X12Delimiters {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith('ISA')) {
    throw new ParseError('MISSING_ISA', 'EDI document must start with ISA segment');
  }

  // ISA is fixed-length: element separator is char at position 3
  const element = trimmed[3];
  // Component separator is at ISA16 (position 104)
  // Segment terminator follows ISA16 (position 105)
  // Repetition separator is at ISA11 — extract from the ISA elements
  const isaContent = trimmed.substring(0, 107);
  const component = isaContent[104];
  const segment = isaContent[105];

  // ISA11 is the repetition separator in version 00501+
  const isaElements = isaContent.split(element);
  const repetition = isaElements.length > 11 ? isaElements[11] : '^';

  return { element, segment, component, repetition };
}

export function tokenize(raw: string): X12Envelope {
  const delimiters = detectDelimiters(raw);
  const cleaned = raw.replace(/\r?\n/g, '');

  const rawSegments = cleaned
    .split(delimiters.segment)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const segments: X12Segment[] = rawSegments.map((rawSeg) => {
    const parts = rawSeg.split(delimiters.element);
    const tag = parts[0];
    const elements: X12Element[] = parts.slice(1).map((val) => {
      if (val.includes(delimiters.component)) {
        return { value: val, components: val.split(delimiters.component) };
      }
      return { value: val };
    });
    return { tag, elements, raw: rawSeg };
  });

  // Extract envelope metadata
  const isa = segments.find((s) => s.tag === 'ISA');
  const gs = segments.find((s) => s.tag === 'GS');
  const st = segments.find((s) => s.tag === 'ST');

  const isaControlNumber = isa?.elements[12]?.value?.trim() ?? '';
  const gsControlNumber = gs?.elements[5]?.value?.trim() ?? '';
  const transactionSetCode = st?.elements[0]?.value?.trim() ?? '';

  return {
    delimiters,
    segments,
    isaControlNumber,
    gsControlNumber,
    transactionSetCode,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run packages/core/src/x12/tokenizer.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 6: Export and commit**

Add to `packages/core/src/index.ts`:
```typescript
export * from './x12/types.js';
export { tokenize, detectDelimiters } from './x12/tokenizer.js';
```

```bash
git add packages/core/src/x12/
git commit -m "feat(core): add X12 tokenizer with delimiter detection"
```

---

### Task 5: X12 Generator (Serializer)

**Files:**
- Create: `packages/core/src/x12/generator.ts`
- Create: `packages/core/src/x12/generator.test.ts`

The generator takes X12Segment arrays and serializes them back to raw EDI text. This is the reverse of the tokenizer.

- [ ] **Step 1: Write failing generator tests**

```typescript
// packages/core/src/x12/generator.test.ts
import { describe, it, expect } from 'vitest';
import { generateX12 } from './generator.js';
import type { X12Segment, X12Delimiters } from './types.js';

const DEFAULT_DELIMITERS: X12Delimiters = {
  element: '*',
  segment: '~',
  component: ':',
  repetition: '^',
};

describe('generateX12', () => {
  it('serializes segments to EDI string', () => {
    const segments: X12Segment[] = [
      { tag: 'ST', elements: [{ value: '997' }, { value: '0001' }], raw: '' },
      { tag: 'AK1', elements: [{ value: 'PO' }, { value: '1' }], raw: '' },
      { tag: 'AK9', elements: [{ value: 'A' }, { value: '1' }, { value: '1' }, { value: '1' }], raw: '' },
      { tag: 'SE', elements: [{ value: '4' }, { value: '0001' }], raw: '' },
    ];
    const result = generateX12(segments, DEFAULT_DELIMITERS);
    expect(result).toBe('ST*997*0001~AK1*PO*1~AK9*A*1*1*1~SE*4*0001~');
  });

  it('handles component separators', () => {
    const segments: X12Segment[] = [
      {
        tag: 'SV1',
        elements: [{ value: 'HC:99213', components: ['HC', '99213'] }],
        raw: '',
      },
    ];
    const result = generateX12(segments, DEFAULT_DELIMITERS);
    expect(result).toBe('SV1*HC:99213~');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/src/x12/generator.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement generator**

```typescript
// packages/core/src/x12/generator.ts
import type { X12Segment, X12Delimiters } from './types.js';

export function generateX12(segments: X12Segment[], delimiters: X12Delimiters): string {
  return segments
    .map((seg) => {
      const parts = [seg.tag, ...seg.elements.map((el) => el.value)];
      return parts.join(delimiters.element) + delimiters.segment;
    })
    .join('');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/core/src/x12/generator.test.ts`
Expected: All 2 tests PASS

- [ ] **Step 5: Export and commit**

Add to `packages/core/src/index.ts`:
```typescript
export { generateX12 } from './x12/generator.js';
```

```bash
git add packages/core/src/x12/generator.ts packages/core/src/x12/generator.test.ts packages/core/src/index.ts
git commit -m "feat(core): add X12 generator for serializing segments to EDI"
```

---

## Chunk 2: OCEX Mapping Engine — X12 ↔ JSON Translation

### Task 6: YAML Mapping Loader

**Files:**
- Create: `packages/core/src/mapping/loader.ts`
- Create: `packages/core/src/mapping/loader.test.ts`
- Create: `packages/core/src/mapping/types.ts`
- Create: `mappings/x12/810.yaml`

The mapping engine uses YAML config files that define how X12 segments/elements map to OCEX JSON fields. Each transaction set gets its own YAML file.

- [ ] **Step 1: Define mapping types**

```typescript
// packages/core/src/mapping/types.ts
export interface FieldMapping {
  segment: string;
  element: number;
  component?: number;
  field: string;        // dot-path in OCEX JSON, e.g. "sender.id"
  transform?: 'trim' | 'number' | 'date';
  qualifier?: string;   // e.g. "SE" for seller N1, "BY" for buyer N1
}

export interface LineItemMapping {
  loopSegment: string;  // segment that starts each line item loop (e.g. 'IT1')
  fields: FieldMapping[];
}

export interface TransactionMapping {
  transactionSet: string;
  ocexType: string;
  fields: FieldMapping[];
  lineItems?: LineItemMapping;
}
```

- [ ] **Step 2: Create 810 invoice mapping YAML**

```yaml
# mappings/x12/810.yaml
transactionSet: "810"
ocexType: "invoice"
fields:
  - segment: BIG
    element: 0
    field: documentDate
    transform: date
  - segment: BIG
    element: 1
    field: invoiceNumber
  - segment: BIG
    element: 2
    field: purchaseOrderRef
  - segment: N1
    element: 1
    field: sender.name
    qualifier: "SE"
  - segment: N1
    element: 3
    field: sender.id
    qualifier: "SE"
  - segment: N1
    element: 1
    field: receiver.name
    qualifier: "BY"
  - segment: N1
    element: 3
    field: receiver.id
    qualifier: "BY"
  - segment: TDS
    element: 0
    field: total
    transform: number
  - segment: CUR
    element: 1
    field: currency
lineItems:
  loopSegment: IT1
  fields:
    - segment: IT1
      element: 0
      field: lineNumber
      transform: number
    - segment: IT1
      element: 1
      field: quantity
      transform: number
    - segment: IT1
      element: 2
      field: unitOfMeasure
    - segment: IT1
      element: 3
      field: unitPrice
      transform: number
    - segment: IT1
      element: 6
      field: sku
    - segment: PID
      element: 4
      field: description
```

- [ ] **Step 3: Write failing loader tests**

```typescript
// packages/core/src/mapping/loader.test.ts
import { describe, it, expect } from 'vitest';
import { loadMapping, MAPPINGS_DIR } from './loader.js';
import { resolve } from 'node:path';

describe('loadMapping', () => {
  it('loads 810 mapping from YAML', () => {
    const mappingPath = resolve(MAPPINGS_DIR, '810.yaml');
    const mapping = loadMapping(mappingPath);
    expect(mapping.transactionSet).toBe('810');
    expect(mapping.ocexType).toBe('invoice');
    expect(mapping.fields.length).toBeGreaterThan(0);
  });

  it('parses field mappings correctly', () => {
    const mappingPath = resolve(MAPPINGS_DIR, '810.yaml');
    const mapping = loadMapping(mappingPath);
    const dateField = mapping.fields.find((f) => f.field === 'documentDate');
    expect(dateField).toBeDefined();
    expect(dateField!.segment).toBe('BIG');
    expect(dateField!.element).toBe(0);
    expect(dateField!.transform).toBe('date');
  });

  it('parses line item mappings', () => {
    const mappingPath = resolve(MAPPINGS_DIR, '810.yaml');
    const mapping = loadMapping(mappingPath);
    expect(mapping.lineItems).toBeDefined();
    expect(mapping.lineItems!.loopSegment).toBe('IT1');
    expect(mapping.lineItems!.fields.length).toBeGreaterThan(0);
  });

  it('throws for non-existent file', () => {
    expect(() => loadMapping('/not/real.yaml')).toThrow();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run packages/core/src/mapping/loader.test.ts`
Expected: FAIL

- [ ] **Step 5: Install yaml dependency and implement loader**

Run: `npm install yaml --workspace=packages/core`

```typescript
// packages/core/src/mapping/loader.ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import YAML from 'yaml';
import type { TransactionMapping } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const MAPPINGS_DIR = resolve(__dirname, '../../../mappings/x12');

export function loadMapping(filePath: string): TransactionMapping {
  const content = readFileSync(filePath, 'utf-8');
  return YAML.parse(content) as TransactionMapping;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run packages/core/src/mapping/loader.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/mapping/ mappings/x12/810.yaml
git commit -m "feat(core): add YAML mapping loader with 810 invoice mapping"
```

---

### Task 7: X12-to-OCEX Translator (810 Invoice)

**Files:**
- Create: `packages/core/src/translator.ts`
- Create: `packages/core/src/translator.test.ts`
- Create: `tests/fixtures/810-basic.edi`

This is the core of the product — translating a tokenized X12 document into an OCEX JSON document using the YAML mapping rules.

- [ ] **Step 1: Create test fixture — sample 810 invoice EDI**

```
ISA*00*          *00*          *ZZ*HOMEDEPOT      *ZZ*SUPPLIER1      *210901*1234*^*00501*000000001*0*P*:~
GS*IN*HOMEDEPOT*SUPPLIER1*20210901*1234*1*X*005010~
ST*810*0001~
BIG*20210901*HD-2026-0001*PO-5001~
CUR*SE*USD~
N1*SE*Home Depot*92*HOMEDEPOT~
N1*BY*ABC Supply*92*SUPPLIER1~
IT1*1*500*EA*29.00**VP*SHG-001~
PID*F****Architectural Shingles~
IT1*2*200*EA*15.50**VP*NL-042~
PID*F****Roofing Nails 1.5in~
TDS*1760000~
SE*11*0001~
GE*1*1~
IEA*1*000000001~
```

Save to `tests/fixtures/810-basic.edi`.

- [ ] **Step 2: Write failing translator test**

```typescript
// packages/core/src/translator.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { translateToOcex } from './translator.js';
import type { OcexInvoice } from './types.js';

const fixturesDir = path.resolve(__dirname, '../../tests/fixtures');

describe('translateToOcex', () => {
  it('translates an 810 EDI to an OCEX invoice', () => {
    const raw = readFileSync(path.join(fixturesDir, '810-basic.edi'), 'utf-8');
    const doc = translateToOcex(raw) as OcexInvoice;

    expect(doc.type).toBe('invoice');
    expect(doc.invoiceNumber).toBe('HD-2026-0001');
    expect(doc.purchaseOrderRef).toBe('PO-5001');
    expect(doc.currency).toBe('USD');
    expect(doc.sender.name).toBe('Home Depot');
    expect(doc.sender.id).toBe('HOMEDEPOT');
    expect(doc.receiver.name).toBe('ABC Supply');
    expect(doc.receiver.id).toBe('SUPPLIER1');
  });

  it('extracts line items from IT1/PID loops', () => {
    const raw = readFileSync(path.join(fixturesDir, '810-basic.edi'), 'utf-8');
    const doc = translateToOcex(raw) as OcexInvoice;

    expect(doc.lineItems).toHaveLength(2);
    expect(doc.lineItems[0].sku).toBe('SHG-001');
    expect(doc.lineItems[0].quantity).toBe(500);
    expect(doc.lineItems[0].unitPrice).toBe(29.0);
    expect(doc.lineItems[0].description).toBe('Architectural Shingles');
    expect(doc.lineItems[1].sku).toBe('NL-042');
    expect(doc.lineItems[1].quantity).toBe(200);
  });

  it('parses total from TDS (implied decimal)', () => {
    const raw = readFileSync(path.join(fixturesDir, '810-basic.edi'), 'utf-8');
    const doc = translateToOcex(raw) as OcexInvoice;
    // TDS*1760000 = $17,600.00 (implied 2 decimal places)
    expect(doc.total).toBe(17600.0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run packages/core/src/translator.test.ts`
Expected: FAIL

- [ ] **Step 4: Implement translator**

```typescript
// packages/core/src/translator.ts
import { tokenize } from './x12/tokenizer.js';
import { loadMapping, MAPPINGS_DIR } from './mapping/loader.js';
import { ParseError } from './errors.js';
import { resolve } from 'node:path';
import type { X12Segment } from './x12/types.js';
import type { TransactionMapping, FieldMapping } from './mapping/types.js';
import type { OcexDocument } from './types.js';

function applyTransform(value: string, transform?: string): unknown {
  if (!value) return value;
  switch (transform) {
    case 'trim':
      return value.trim();
    case 'number': {
      const n = Number(value);
      return isNaN(n) ? value : n;
    }
    case 'date':
      // X12 dates are YYYYMMDD or YYMMDD
      return value.length === 8
        ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
        : value;
    default:
      return value.trim();
  }
}

function setNestedField(obj: Record<string, unknown>, dotPath: string, value: unknown): void {
  const parts = dotPath.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current)) {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

function findSegmentsWithQualifier(
  segments: X12Segment[],
  tag: string,
  qualifier?: string,
): X12Segment | undefined {
  return segments.find((s) => {
    if (s.tag !== tag) return false;
    if (qualifier && s.elements[0]?.value !== qualifier) return false;
    return true;
  });
}

function extractLineItems(
  segments: X12Segment[],
  mapping: TransactionMapping,
): Record<string, unknown>[] {
  if (!mapping.lineItems) return [];

  const items: Record<string, unknown>[] = [];
  let currentItem: Record<string, unknown> | null = null;

  for (const seg of segments) {
    if (seg.tag === mapping.lineItems.loopSegment) {
      if (currentItem) items.push(currentItem);
      currentItem = {};
      for (const fm of mapping.lineItems.fields) {
        if (fm.segment === seg.tag) {
          const val = seg.elements[fm.element]?.value;
          if (val) setNestedField(currentItem, fm.field, applyTransform(val, fm.transform));
        }
      }
    } else if (currentItem) {
      for (const fm of mapping.lineItems.fields) {
        if (fm.segment === seg.tag) {
          const val = seg.elements[fm.element]?.value;
          if (val) setNestedField(currentItem, fm.field, applyTransform(val, fm.transform));
        }
      }
    }
  }
  if (currentItem) items.push(currentItem);

  // Calculate totalPrice for each item
  return items.map((item) => {
    const qty = typeof item.quantity === 'number' ? item.quantity : 0;
    const price = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
    return { ...item, totalPrice: qty * price };
  });
}

export function translateToOcex(raw: string): OcexDocument {
  const envelope = tokenize(raw);

  if (!envelope.transactionSetCode) {
    throw new ParseError('MISSING_ST', 'No ST segment found — cannot determine transaction set');
  }

  const mappingPath = resolve(MAPPINGS_DIR, `${envelope.transactionSetCode}.yaml`);
  let mapping: TransactionMapping;
  try {
    mapping = loadMapping(mappingPath);
  } catch {
    throw new ParseError(
      'UNSUPPORTED_TRANSACTION',
      `No mapping found for transaction set ${envelope.transactionSetCode}`,
    );
  }

  const doc: Record<string, unknown> = {
    type: mapping.ocexType,
    id: `${mapping.ocexType}-${envelope.isaControlNumber}`,
    version: 'ocex-1.0.0',
  };

  // Apply field mappings
  for (const fm of mapping.fields) {
    const qualifier = fm.qualifier;
    const seg = findSegmentsWithQualifier(envelope.segments, fm.segment, qualifier);
    if (seg) {
      const val = seg.elements[fm.element]?.value;
      if (val) {
        let transformed = applyTransform(val, fm.transform);
        // Special handling for TDS (implied decimal)
        if (fm.segment === 'TDS' && typeof transformed === 'number') {
          transformed = transformed / 100;
        }
        setNestedField(doc, fm.field, transformed);
      }
    }
  }

  // Extract line items
  const lineItems = extractLineItems(envelope.segments, mapping);
  if (lineItems.length > 0) {
    doc.lineItems = lineItems;
  }

  // Set documentDate from the doc or fall back
  if (!doc.documentDate) {
    doc.documentDate = new Date().toISOString().slice(0, 10);
  }

  // Default optional financial fields
  if (doc.type === 'invoice') {
    if (!('subtotal' in doc)) doc.subtotal = doc.total as number;
    if (!('tax' in doc)) doc.tax = 0;
  }

  return doc as OcexDocument;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run packages/core/src/translator.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 6: Export and commit**

```bash
git add packages/core/src/translator.ts packages/core/src/translator.test.ts tests/fixtures/810-basic.edi
git commit -m "feat(core): add X12-to-OCEX translator with 810 invoice mapping"
```

---

### Task 8: OCEX-to-X12 Reverse Translator

**Files:**
- Create: `packages/core/src/reverse-translator.ts`
- Create: `packages/core/src/reverse-translator.test.ts`

Takes an OCEX JSON document and generates valid X12 EDI output. This completes the bidirectional round-trip. V1 implements reverse translation for 810 (invoice). The `default` case in the switch throws with a clear message listing supported types. Reverse translation for 850, 832, 856, 997 follows the same pattern and should be added as the mapping work matures — each is a straightforward `build*Segments()` function following the 810 template.

- [ ] **Step 1: Write failing reverse translator test**

```typescript
// packages/core/src/reverse-translator.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { translateToOcex } from './translator.js';
import { translateToX12 } from './reverse-translator.js';
import { tokenize } from './x12/tokenizer.js';
import type { OcexInvoice } from './types.js';

const fixturesDir = path.resolve(__dirname, '../../tests/fixtures');

describe('translateToX12', () => {
  it('generates valid X12 from an OCEX invoice', () => {
    const invoice: OcexInvoice = {
      type: 'invoice',
      id: 'INV-001',
      version: 'ocex-1.0.0',
      sender: { id: 'HOMEDEPOT', name: 'Home Depot' },
      receiver: { id: 'SUPPLIER1', name: 'ABC Supply' },
      documentDate: '2021-09-01',
      invoiceNumber: 'HD-2026-0001',
      purchaseOrderRef: 'PO-5001',
      currency: 'USD',
      lineItems: [
        {
          lineNumber: 1,
          sku: 'SHG-001',
          description: 'Architectural Shingles',
          quantity: 500,
          unitOfMeasure: 'EA',
          unitPrice: 29.0,
          totalPrice: 14500.0,
        },
      ],
      subtotal: 14500.0,
      tax: 1160.0,
      total: 15660.0,
    };

    const edi = translateToX12(invoice);
    expect(edi).toContain('ST*810*');
    expect(edi).toContain('BIG*20210901*HD-2026-0001*PO-5001');
    expect(edi).toContain('N1*SE*Home Depot*92*HOMEDEPOT');
    expect(edi).toContain('N1*BY*ABC Supply*92*SUPPLIER1');
    expect(edi).toContain('IT1*1*500*EA*29');
    expect(edi).toContain('TDS*1566000');
    expect(edi).toContain('SE*');
  });

  it('round-trips an 810 with semantic equivalence', () => {
    const raw = readFileSync(path.join(fixturesDir, '810-basic.edi'), 'utf-8');
    const ocex = translateToOcex(raw) as OcexInvoice;
    const regenerated = translateToX12(ocex);

    // Re-parse the regenerated EDI
    const reparsed = translateToOcex(regenerated) as OcexInvoice;

    // Business data should match
    expect(reparsed.invoiceNumber).toBe(ocex.invoiceNumber);
    expect(reparsed.purchaseOrderRef).toBe(ocex.purchaseOrderRef);
    expect(reparsed.sender.id).toBe(ocex.sender.id);
    expect(reparsed.receiver.id).toBe(ocex.receiver.id);
    expect(reparsed.total).toBe(ocex.total);
    expect(reparsed.lineItems.length).toBe(ocex.lineItems.length);
    expect(reparsed.lineItems[0].sku).toBe(ocex.lineItems[0].sku);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/core/src/reverse-translator.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement reverse translator**

```typescript
// packages/core/src/reverse-translator.ts
import { generateX12 } from './x12/generator.js';
import type { X12Segment, X12Delimiters } from './x12/types.js';
import type { OcexDocument, OcexInvoice, OcexOrder, OcexAcknowledgment } from './types.js';

const DEFAULT_DELIMITERS: X12Delimiters = {
  element: '*',
  segment: '~',
  component: ':',
  repetition: '^',
};

function padRight(str: string, len: number): string {
  return str.padEnd(len, ' ').slice(0, len);
}

function dateToX12(isoDate: string): string {
  return isoDate.replace(/-/g, '');
}

function seg(tag: string, ...elements: string[]): X12Segment {
  return {
    tag,
    elements: elements.map((v) => ({ value: v })),
    raw: '',
  };
}

function buildISA(senderId: string, receiverId: string, controlNumber: string): X12Segment {
  const now = new Date();
  const date = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  return seg(
    'ISA', '00', padRight('', 10), '00', padRight('', 10),
    'ZZ', padRight(senderId, 15), 'ZZ', padRight(receiverId, 15),
    date, time, '^', '00501', controlNumber.padStart(9, '0'), '0', 'P', ':',
  );
}

function buildInvoiceSegments(doc: OcexInvoice): X12Segment[] {
  const segments: X12Segment[] = [];
  const controlNum = '0001';

  segments.push(seg('ST', '810', controlNum));
  segments.push(seg('BIG', dateToX12(doc.documentDate), doc.invoiceNumber, doc.purchaseOrderRef ?? ''));
  if (doc.currency) segments.push(seg('CUR', 'SE', doc.currency));
  segments.push(seg('N1', 'SE', doc.sender.name, '92', doc.sender.id));
  segments.push(seg('N1', 'BY', doc.receiver.name, '92', doc.receiver.id));

  for (const item of doc.lineItems) {
    segments.push(seg('IT1', String(item.lineNumber), String(item.quantity), item.unitOfMeasure, String(item.unitPrice), '', 'VP', item.sku));
    if (item.description) {
      segments.push(seg('PID', 'F', '', '', '', item.description));
    }
  }

  // TDS is total in cents (implied 2 decimal)
  segments.push(seg('TDS', String(Math.round(doc.total * 100))));
  const segCount = segments.length + 1; // +1 for SE itself
  segments.push(seg('SE', String(segCount), controlNum));

  return segments;
}

export function translateToX12(doc: OcexDocument): string {
  const controlNumber = '000000001';
  let innerSegments: X12Segment[];

  switch (doc.type) {
    case 'invoice':
      innerSegments = buildInvoiceSegments(doc);
      break;
    default:
      throw new Error(`X12 generation not yet supported for type: ${doc.type}`);
  }

  const allSegments: X12Segment[] = [
    buildISA(doc.sender.id, doc.receiver.id, controlNumber),
    seg('GS', 'IN', doc.sender.id, doc.receiver.id, dateToX12(doc.documentDate), '1234', '1', 'X', '005010'),
    ...innerSegments,
    seg('GE', '1', '1'),
    seg('IEA', '1', controlNumber),
  ];

  return generateX12(allSegments, DEFAULT_DELIMITERS);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/core/src/reverse-translator.test.ts`
Expected: All 2 tests PASS

- [ ] **Step 5: Export and commit**

Add to `packages/core/src/index.ts`:
```typescript
export { translateToOcex } from './translator.js';
export { translateToX12 } from './reverse-translator.js';
```

```bash
git add packages/core/src/reverse-translator.ts packages/core/src/reverse-translator.test.ts packages/core/src/index.ts
git commit -m "feat(core): add OCEX-to-X12 reverse translator with round-trip support"
```

---

### Task 9: Additional Transaction Set Mappings (850, 832, 856, 997)

**Files:**
- Create: `mappings/x12/850.yaml`
- Create: `mappings/x12/832.yaml`
- Create: `mappings/x12/856.yaml`
- Create: `mappings/x12/997.yaml`
- Create: `tests/fixtures/850-basic.edi`
- Create: `tests/fixtures/997-basic.edi`
- Create: `packages/core/src/mapping/registry.ts`
- Create: `packages/core/src/mapping/registry.test.ts`

- [ ] **Step 1: Create mapping YAML files for 850, 832, 856, 997**

`mappings/x12/850.yaml`:
```yaml
transactionSet: "850"
ocexType: "order"
fields:
  - segment: BEG
    element: 2
    field: orderNumber
  - segment: BEG
    element: 4
    field: documentDate
    transform: date
  - segment: N1
    element: 1
    field: sender.name
    qualifier: "BY"
  - segment: N1
    element: 3
    field: sender.id
    qualifier: "BY"
  - segment: N1
    element: 1
    field: receiver.name
    qualifier: "SE"
  - segment: N1
    element: 3
    field: receiver.id
    qualifier: "SE"
  - segment: N3
    element: 0
    field: shipTo.street
    qualifier: "ST"
  - segment: N4
    element: 0
    field: shipTo.city
    qualifier: "ST"
  - segment: N4
    element: 1
    field: shipTo.state
    qualifier: "ST"
  - segment: N4
    element: 2
    field: shipTo.zip
    qualifier: "ST"
  - segment: N4
    element: 3
    field: shipTo.country
    qualifier: "ST"
lineItems:
  loopSegment: PO1
  fields:
    - segment: PO1
      element: 0
      field: lineNumber
      transform: number
    - segment: PO1
      element: 1
      field: quantity
      transform: number
    - segment: PO1
      element: 2
      field: unitOfMeasure
    - segment: PO1
      element: 3
      field: unitPrice
      transform: number
    - segment: PO1
      element: 6
      field: sku
    - segment: PID
      element: 4
      field: description
```

`mappings/x12/997.yaml`:
```yaml
transactionSet: "997"
ocexType: "acknowledgment"
fields:
  - segment: AK1
    element: 1
    field: referencedDocumentId
  - segment: AK9
    element: 0
    field: accepted
    transform: acceptCode
```

Note: The translator must handle the `acceptCode` transform: convert AK9 element 0 value "A" (Accepted) to boolean `true`, "R" (Rejected) to `false`. Add this transform in the `applyTransform` function:
```typescript
case 'acceptCode':
  return value === 'A';
```

`mappings/x12/832.yaml`:
```yaml
transactionSet: "832"
ocexType: "catalog"
fields:
  - segment: BCT
    element: 1
    field: catalogId
  - segment: DTM
    element: 1
    field: effectiveDate
    transform: date
lineItems:
  loopSegment: LIN
  fields:
    - segment: LIN
      element: 2
      field: sku
    - segment: PID
      element: 4
      field: description
    - segment: CTP
      element: 2
      field: unitPrice
      transform: number
    - segment: CTP
      element: 3
      field: quantity
      transform: number
```

`mappings/x12/856.yaml`:
```yaml
transactionSet: "856"
ocexType: "shipment"
fields:
  - segment: BSN
    element: 1
    field: shipmentId
  - segment: BSN
    element: 2
    field: documentDate
    transform: date
  - segment: TD5
    element: 2
    field: carrier
  - segment: REF
    element: 1
    field: trackingNumber
    qualifier: "CN"
  - segment: N1
    element: 1
    field: shipFrom.name
    qualifier: "SF"
  - segment: N1
    element: 1
    field: shipTo.name
    qualifier: "ST"
lineItems:
  loopSegment: SN1
  fields:
    - segment: SN1
      element: 1
      field: quantity
      transform: number
    - segment: SN1
      element: 2
      field: unitOfMeasure
    - segment: LIN
      element: 2
      field: sku
```

- [ ] **Step 2: Write mapping registry test**

```typescript
// packages/core/src/mapping/registry.test.ts
import { describe, it, expect } from 'vitest';
import { getMappingForTransactionSet, SUPPORTED_TRANSACTION_SETS } from './registry.js';

describe('mapping registry', () => {
  it('lists all v1 supported transaction sets', () => {
    expect(SUPPORTED_TRANSACTION_SETS).toEqual(['810', '832', '850', '856', '997']);
  });

  it('returns mapping for each supported set', () => {
    for (const ts of SUPPORTED_TRANSACTION_SETS) {
      const mapping = getMappingForTransactionSet(ts);
      expect(mapping.transactionSet).toBe(ts);
    }
  });

  it('throws for unsupported transaction set', () => {
    expect(() => getMappingForTransactionSet('999')).toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run packages/core/src/mapping/registry.test.ts`
Expected: FAIL

- [ ] **Step 4: Implement registry**

```typescript
// packages/core/src/mapping/registry.ts
import { resolve } from 'node:path';
import { loadMapping, MAPPINGS_DIR } from './loader.js';
import { ParseError } from '../errors.js';
import type { TransactionMapping } from './types.js';

export const SUPPORTED_TRANSACTION_SETS = ['810', '832', '850', '856', '997'];

const cache = new Map<string, TransactionMapping>();

export function getMappingForTransactionSet(transactionSet: string): TransactionMapping {
  if (cache.has(transactionSet)) return cache.get(transactionSet)!;

  if (!SUPPORTED_TRANSACTION_SETS.includes(transactionSet)) {
    throw new ParseError(
      'UNSUPPORTED_TRANSACTION',
      `Transaction set ${transactionSet} is not supported. Supported: ${SUPPORTED_TRANSACTION_SETS.join(', ')}`,
    );
  }

  const mapping = loadMapping(resolve(MAPPINGS_DIR, `${transactionSet}.yaml`));
  cache.set(transactionSet, mapping);
  return mapping;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run packages/core/src/mapping/registry.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 6: Create test fixtures and commit**

`tests/fixtures/850-basic.edi`:
```
ISA*00*          *00*          *ZZ*SUPPLIER1      *ZZ*HOMEDEPOT      *210901*1234*^*00501*000000002*0*P*:~
GS*PO*SUPPLIER1*HOMEDEPOT*20210901*1234*1*X*005010~
ST*850*0001~
BEG*00*NE*PO-5001**20210901~
N1*BY*ABC Supply*92*SUPPLIER1~
N1*SE*Home Depot*92*HOMEDEPOT~
N1*ST*Job Site~
N3*456 Oak Ave~
N4*Atlanta*GA*30301*US~
PO1*1*500*EA*29.00**VP*SHG-001~
PID*F****Architectural Shingles~
PO1*2*200*EA*15.50**VP*NL-042~
PID*F****Roofing Nails 1.5in~
SE*12*0001~
GE*1*1~
IEA*1*000000002~
```

`tests/fixtures/997-basic.edi`:
```
ISA*00*          *00*          *ZZ*HOMEDEPOT      *ZZ*SUPPLIER1      *210901*1234*^*00501*000000003*0*P*:~
GS*FA*HOMEDEPOT*SUPPLIER1*20210901*1234*1*X*005010~
ST*997*0001~
AK1*PO*1~
AK9*A*1*1*1~
SE*4*0001~
GE*1*1~
IEA*1*000000003~
```

```bash
git add mappings/ packages/core/src/mapping/ tests/fixtures/
git commit -m "feat(core): add mapping YAML for all v1 transaction sets (810, 832, 850, 856, 997)"
```

---

## Chunk 3: SDK, CLI, and OCEX OpenAPI Spec

### Task 10: OCEX OpenAPI Specification

**Files:**
- Create: `protocol/openapi.yaml`
- Create: `protocol/schemas/invoice.json`
- Create: `protocol/schemas/order.json`
- Create: `protocol/schemas/catalog.json`
- Create: `protocol/schemas/shipment.json`
- Create: `protocol/schemas/acknowledgment.json`

- [ ] **Step 1: Create the OpenAPI 3.x spec**

Write `protocol/openapi.yaml` defining:
- Info block: title "OCEX — Open Commerce Exchange Protocol", version "1.0.0"
- Paths: `/v1/invoices`, `/v1/orders`, `/v1/catalogs`, `/v1/shipments`, `/v1/acknowledgments` — each with GET (list), GET by ID, POST (create)
- Components/schemas referencing the JSON Schema files
- Security scheme: API key in header (`X-API-Key`)

- [ ] **Step 2: Create JSON Schema for each document type**

Each schema mirrors the TypeScript types from `packages/core/src/types.ts`. Include required fields, types, descriptions.

- [ ] **Step 3: Validate the spec**

Run: `npx @redocly/cli lint protocol/openapi.yaml`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add protocol/
git commit -m "feat(protocol): add OCEX OpenAPI 3.x specification with JSON schemas"
```

---

### Task 11: SDK — Local Mode

**Files:**
- Create: `packages/sdk/src/client.ts`
- Create: `packages/sdk/src/client.test.ts`

- [ ] **Step 1: Write failing SDK test for local mode**

```typescript
// packages/sdk/src/client.test.ts
import { describe, it, expect } from 'vitest';
import { EDIConvert } from './client.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('EDIConvert — local mode', () => {
  const edi = new EDIConvert();

  it('parses an 810 EDI string to OCEX JSON', async () => {
    const raw = readFileSync(
      path.resolve(__dirname, '../../../tests/fixtures/810-basic.edi'),
      'utf-8',
    );
    const doc = await edi.parse(raw);
    expect(doc.type).toBe('invoice');
    expect((doc as any).invoiceNumber).toBe('HD-2026-0001');
  });

  it('generates X12 from OCEX JSON', async () => {
    const raw = readFileSync(
      path.resolve(__dirname, '../../../tests/fixtures/810-basic.edi'),
      'utf-8',
    );
    const doc = await edi.parse(raw);
    const x12 = await edi.generate(doc);
    expect(x12).toContain('ST*810*');
    expect(x12).toContain('HD-2026-0001');
  });

  it('throws if gateway methods called without config', async () => {
    await expect(edi.invoices.list({})).rejects.toThrow('Gateway mode requires');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/sdk/src/client.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement SDK client**

```typescript
// packages/sdk/src/client.ts
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

  constructor(config: EDIConvertConfig = {}) {
    this.config = config;
  }

  async parse(raw: string): Promise<OcexDocument> {
    return translateToOcex(raw);
  }

  async generate(doc: OcexDocument): Promise<string> {
    return translateToX12(doc);
  }

  get invoices() {
    return {
      list: async (_params: Record<string, unknown>) => {
        requireGateway(this.config);
        // Gateway HTTP call — implemented in Task 15
        return [];
      },
    };
  }

  get orders() {
    return {
      list: async (_params: Record<string, unknown>) => {
        requireGateway(this.config);
        return [];
      },
    };
  }

  get webhooks() {
    return {
      create: async (_params: Record<string, unknown>) => {
        requireGateway(this.config);
        return {};
      },
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/sdk/src/client.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 5: Export and commit**

Update `packages/sdk/src/index.ts`:
```typescript
export { EDIConvert } from './client.js';
export type { EDIConvertConfig } from './client.js';
```

```bash
git add packages/sdk/src/
git commit -m "feat(sdk): add EDIConvert client with local mode parse/generate"
```

---

### Task 12: CLI Tool

**Files:**
- Create: `packages/cli/src/commands/parse.ts`
- Create: `packages/cli/src/commands/validate.ts`
- Create: `packages/cli/src/commands/generate.ts`
- Create: `packages/cli/src/cli.ts`
- Create: `packages/cli/src/cli.test.ts`

- [ ] **Step 1: Write failing CLI test**

```typescript
// packages/cli/src/cli.test.ts
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';

const CLI = path.resolve(__dirname, '../dist/index.js');
const FIXTURE = path.resolve(__dirname, '../../../tests/fixtures/810-basic.edi');

describe('CLI', () => {
  it('parse command outputs JSON', () => {
    const result = execSync(`node ${CLI} parse ${FIXTURE}`, { encoding: 'utf-8' });
    const doc = JSON.parse(result);
    expect(doc.type).toBe('invoice');
  });

  it('validate command reports valid document', () => {
    const result = execSync(`node ${CLI} validate ${FIXTURE}`, { encoding: 'utf-8' });
    expect(result).toContain('valid');
  });

  it('shows help with no arguments', () => {
    const result = execSync(`node ${CLI} --help`, { encoding: 'utf-8' });
    expect(result).toContain('parse');
    expect(result).toContain('validate');
    expect(result).toContain('generate');
  });
});
```

- [ ] **Step 2: Build CLI before running tests** — CLI tests require compiled JS

Run: `npm run build --workspace=packages/core && npm run build --workspace=packages/cli`

- [ ] **Step 3: Implement CLI**

```typescript
// packages/cli/src/cli.ts
import { readFileSync } from 'node:fs';
import { translateToOcex, translateToX12 } from '@ediconvert/core';

const args = process.argv.slice(2);
const command = args[0];

function printHelp(): void {
  console.log(`Usage: ediconvert <command> [options]

Commands:
  parse <file>       Parse EDI file to OCEX JSON
  validate <file>    Validate an EDI file
  generate <file>    Generate EDI from OCEX JSON file
  keys               Manage API keys (requires gateway)

Options:
  --help             Show help`);
}

function run(): void {
  if (!command || command === '--help') {
    printHelp();
    return;
  }

  switch (command) {
    case 'parse': {
      const file = args[1];
      if (!file) { console.error('Error: file path required'); process.exit(1); }
      const raw = readFileSync(file, 'utf-8');
      const doc = translateToOcex(raw);
      console.log(JSON.stringify(doc, null, 2));
      break;
    }
    case 'validate': {
      const file = args[1];
      if (!file) { console.error('Error: file path required'); process.exit(1); }
      const raw = readFileSync(file, 'utf-8');
      try {
        translateToOcex(raw);
        console.log('Document is valid.');
      } catch (err) {
        console.error('Validation failed:', (err as Error).message);
        process.exit(1);
      }
      break;
    }
    case 'generate': {
      const file = args[1];
      if (!file) { console.error('Error: file path required'); process.exit(1); }
      const json = readFileSync(file, 'utf-8');
      const doc = JSON.parse(json);
      const edi = translateToX12(doc);
      console.log(edi);
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

run();
```

Set `packages/cli/src/index.ts` to:
```typescript
#!/usr/bin/env node
import './cli.js';
```

- [ ] **Step 4: Build and run tests**

Run: `npm run build --workspace=packages/core && npm run build --workspace=packages/cli && npx vitest run packages/cli/src/cli.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/cli/
git commit -m "feat(cli): add ediconvert CLI with parse, validate, generate commands"
```

---

## Chunk 4: Gateway Server

### Task 13: Gateway — Express Server + SQLite Storage

**Files:**
- Create: `packages/gateway/src/server.ts`
- Create: `packages/gateway/src/storage.ts`
- Create: `packages/gateway/src/storage.test.ts`
- Create: `packages/gateway/src/auth.ts`
- Create: `packages/gateway/src/auth.test.ts`

- [ ] **Step 1: Install gateway dependencies**

Run: `npm install express better-sqlite3 bcrypt --workspace=packages/gateway && npm install @types/express @types/better-sqlite3 @types/bcrypt --save-dev --workspace=packages/gateway`

- [ ] **Step 2: Write failing storage test**

```typescript
// packages/gateway/src/storage.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Storage } from './storage.js';

describe('Storage', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new Storage(':memory:');
  });

  it('stores and retrieves a document', () => {
    storage.saveDocument({
      id: 'inv-001',
      type: 'invoice',
      partnerId: 'HOMEDEPOT',
      data: { type: 'invoice', total: 15660 },
      rawEdi: 'ISA*...',
    });
    const doc = storage.getDocument('inv-001');
    expect(doc).toBeDefined();
    expect(doc!.type).toBe('invoice');
    expect(doc!.data.total).toBe(15660);
  });

  it('lists documents by type', () => {
    storage.saveDocument({ id: '1', type: 'invoice', partnerId: 'HD', data: {}, rawEdi: '' });
    storage.saveDocument({ id: '2', type: 'order', partnerId: 'HD', data: {}, rawEdi: '' });
    storage.saveDocument({ id: '3', type: 'invoice', partnerId: 'HD', data: {}, rawEdi: '' });
    const invoices = storage.listDocuments({ type: 'invoice' });
    expect(invoices).toHaveLength(2);
  });

  it('lists documents by partner', () => {
    storage.saveDocument({ id: '1', type: 'invoice', partnerId: 'HD', data: {}, rawEdi: '' });
    storage.saveDocument({ id: '2', type: 'invoice', partnerId: 'SRS', data: {}, rawEdi: '' });
    const docs = storage.listDocuments({ partnerId: 'HD' });
    expect(docs).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Implement storage**

```typescript
// packages/gateway/src/storage.ts
import Database from 'better-sqlite3';

export interface DocumentRecord {
  id: string;
  type: string;
  partnerId: string;
  data: Record<string, unknown>;
  rawEdi: string;
  createdAt?: string;
}

export interface ListFilters {
  type?: string;
  partnerId?: string;
  since?: string;
  limit?: number;
}

export class Storage {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        partner_id TEXT NOT NULL,
        data TEXT NOT NULL,
        raw_edi TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
      CREATE INDEX IF NOT EXISTS idx_documents_partner ON documents(partner_id);

      CREATE TABLE IF NOT EXISTS api_keys (
        key_hash TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        partner_scope TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        events TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  saveDocument(doc: DocumentRecord): void {
    this.db.prepare(
      'INSERT OR REPLACE INTO documents (id, type, partner_id, data, raw_edi) VALUES (?, ?, ?, ?, ?)',
    ).run(doc.id, doc.type, doc.partnerId, JSON.stringify(doc.data), doc.rawEdi);
  }

  getDocument(id: string): DocumentRecord | undefined {
    const row = this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      type: row.type,
      partnerId: row.partner_id,
      data: JSON.parse(row.data),
      rawEdi: row.raw_edi,
      createdAt: row.created_at,
    };
  }

  listDocuments(filters: ListFilters = {}): DocumentRecord[] {
    let sql = 'SELECT * FROM documents WHERE 1=1';
    const params: unknown[] = [];
    if (filters.type) { sql += ' AND type = ?'; params.push(filters.type); }
    if (filters.partnerId) { sql += ' AND partner_id = ?'; params.push(filters.partnerId); }
    if (filters.since) { sql += ' AND created_at >= ?'; params.push(filters.since); }
    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(filters.limit ?? 100);

    return (this.db.prepare(sql).all(...params) as any[]).map((row) => ({
      id: row.id,
      type: row.type,
      partnerId: row.partner_id,
      data: JSON.parse(row.data),
      rawEdi: row.raw_edi,
      createdAt: row.created_at,
    }));
  }

  close(): void {
    this.db.close();
  }
}
```

- [ ] **Step 4: Run storage tests**

Run: `npx vitest run packages/gateway/src/storage.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 5: Write failing auth test**

```typescript
// packages/gateway/src/auth.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthManager } from './auth.js';
import { Storage } from './storage.js';

describe('AuthManager', () => {
  let auth: AuthManager;

  beforeEach(() => {
    const storage = new Storage(':memory:');
    auth = new AuthManager(storage);
  });

  it('creates an API key and returns the raw key', async () => {
    const result = await auth.createKey({ label: 'test-key' });
    expect(result.rawKey).toMatch(/^edi_live_/);
    expect(result.label).toBe('test-key');
  });

  it('validates a correct API key', async () => {
    const { rawKey } = await auth.createKey({ label: 'test-key' });
    const valid = await auth.validateKey(rawKey);
    expect(valid).toBe(true);
  });

  it('rejects an invalid API key', async () => {
    const valid = await auth.validateKey('edi_live_invalid');
    expect(valid).toBe(false);
  });

  it('creates partner-scoped keys', async () => {
    const { rawKey } = await auth.createKey({ label: 'hd-key', partnerScope: 'HOMEDEPOT' });
    const valid = await auth.validateKey(rawKey);
    expect(valid).toBe(true);
  });
});
```

- [ ] **Step 6: Implement auth**

```typescript
// packages/gateway/src/auth.ts
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import type { Storage } from './storage.js';
import type { Request, Response, NextFunction } from 'express';

export class AuthManager {
  constructor(private storage: Storage) {}

  async createKey(opts: { label: string; partnerScope?: string }): Promise<{ rawKey: string; label: string }> {
    const raw = 'edi_live_' + randomBytes(24).toString('hex');
    const hash = await bcrypt.hash(raw, 10);
    this.storage.saveApiKey({ keyHash: hash, label: opts.label, partnerScope: opts.partnerScope });
    return { rawKey: raw, label: opts.label };
  }

  async validateKey(rawKey: string): Promise<boolean> {
    const keys = this.storage.listApiKeys();
    for (const k of keys) {
      if (await bcrypt.compare(rawKey, k.keyHash)) return true;
    }
    return false;
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = req.header('X-API-Key');
      if (!key) { res.status(401).json({ error: { code: 'GATEWAY_AUTH_REQUIRED', message: 'X-API-Key header required' } }); return; }
      const valid = await this.validateKey(key);
      if (!valid) { res.status(403).json({ error: { code: 'GATEWAY_AUTH_INVALID', message: 'Invalid API key' } }); return; }
      next();
    };
  }
}
```

Add helper methods to `Storage` class for API key persistence:
```typescript
saveApiKey(key: { keyHash: string; label: string; partnerScope?: string }): void {
  this.db.prepare('INSERT INTO api_keys (key_hash, label, partner_scope) VALUES (?, ?, ?)').run(key.keyHash, key.label, key.partnerScope ?? null);
}

listApiKeys(): Array<{ keyHash: string; label: string; partnerScope: string | null }> {
  return (this.db.prepare('SELECT * FROM api_keys').all() as any[]).map(r => ({ keyHash: r.key_hash, label: r.label, partnerScope: r.partner_scope }));
}
```

- [ ] **Step 7: Run auth tests**

Run: `npx vitest run packages/gateway/src/auth.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/storage.ts packages/gateway/src/storage.test.ts packages/gateway/src/auth.ts packages/gateway/src/auth.test.ts
git commit -m "feat(gateway): add SQLite storage and API key auth"
```

---

### Task 14: Gateway — REST API Routes

**Files:**
- Create: `packages/gateway/src/server.ts`
- Create: `packages/gateway/src/server.test.ts`

All routes are defined inline in `server.ts` using a `resourceRoutes()` factory function. No separate route files — keeps it simple for v1.

- [ ] **Step 1: Write failing server integration test**

```typescript
// packages/gateway/src/server.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from './server.js';
import { Storage } from './storage.js';
import type { Express } from 'express';
import request from 'supertest';

describe('Gateway API', () => {
  let app: Express;
  let storage: Storage;

  beforeAll(() => {
    storage = new Storage(':memory:');
    app = createApp({ storage, requireAuth: false });
  });

  afterAll(() => storage.close());

  it('POST /v1/parse returns OCEX JSON from raw EDI', async () => {
    const edi = `ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *210901*1234*^*00501*000000001*0*P*:~GS*FA*SENDER*RECEIVER*20210901*1234*1*X*005010~ST*997*0001~AK1*PO*1~AK9*A*1*1*1~SE*4*0001~GE*1*1~IEA*1*000000001~`;

    const res = await request(app).post('/v1/parse').send({ edi }).expect(200);
    expect(res.body.type).toBe('acknowledgment');
  });

  it('GET /v1/invoices returns stored invoices', async () => {
    storage.saveDocument({
      id: 'inv-1', type: 'invoice', partnerId: 'HD',
      data: { type: 'invoice', total: 100 }, rawEdi: '',
    });
    const res = await request(app).get('/v1/invoices').expect(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('GET /v1/invoices/:id returns single invoice', async () => {
    const res = await request(app).get('/v1/invoices/inv-1').expect(200);
    expect(res.body.data.type).toBe('invoice');
  });

  it('returns 404 for unknown document', async () => {
    await request(app).get('/v1/invoices/nope').expect(404);
  });
});
```

- [ ] **Step 2: Install supertest**

Run: `npm install supertest @types/supertest --save-dev --workspace=packages/gateway`

- [ ] **Step 3: Implement server and routes**

`packages/gateway/src/server.ts`:
```typescript
import express from 'express';
import type { Storage } from './storage.js';
import { translateToOcex } from '@ediconvert/core';

interface AppConfig {
  storage: Storage;
  requireAuth?: boolean;
}

export function createApp(config: AppConfig): express.Express {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Parse endpoint
  app.post('/v1/parse', (req, res) => {
    try {
      const doc = translateToOcex(req.body.edi);
      res.json(doc);
    } catch (err: any) {
      res.status(400).json(err.toJSON ? err.toJSON() : { error: { message: err.message } });
    }
  });

  // Generic resource routes factory
  function resourceRoutes(typeName: string, path: string) {
    app.get(path, (req, res) => {
      const docs = config.storage.listDocuments({
        type: typeName,
        partnerId: req.query.partner as string,
        since: req.query.since as string,
      });
      res.json({ data: docs });
    });

    app.get(`${path}/:id`, (req, res) => {
      const doc = config.storage.getDocument(req.params.id);
      if (!doc || doc.type !== typeName) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
        return;
      }
      res.json({ data: doc });
    });
  }

  resourceRoutes('invoice', '/v1/invoices');
  resourceRoutes('order', '/v1/orders');
  resourceRoutes('catalog', '/v1/catalogs');
  resourceRoutes('shipment', '/v1/shipments');
  resourceRoutes('acknowledgment', '/v1/acknowledgments');

  return app;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run packages/gateway/src/server.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/
git commit -m "feat(gateway): add Express REST API with resource routes and parse endpoint"
```

---

### Task 15: Gateway — Webhook Delivery

**Files:**
- Create: `packages/gateway/src/webhooks.ts`
- Create: `packages/gateway/src/webhooks.test.ts`

- [ ] **Step 1: Write failing webhook test**

Test that when a document is ingested, registered webhook URLs receive HTTP POST with the document payload.

- [ ] **Step 2: Implement webhook manager**

Store webhook registrations in SQLite. On document ingest, fire HTTP POST to all matching URLs. Log delivery status.

- [ ] **Step 3: Run tests, commit**

```bash
git commit -m "feat(gateway): add webhook delivery system"
```

---

### Task 16: Gateway — SFTP Watcher

**Files:**
- Create: `packages/gateway/src/sftp.ts`
- Create: `packages/gateway/src/sftp.test.ts`

- [ ] **Step 1: Install ssh2-sftp-client**

Run: `npm install ssh2-sftp-client --workspace=packages/gateway && npm install @types/ssh2-sftp-client --save-dev --workspace=packages/gateway`

- [ ] **Step 2: Write SFTP watcher**

Polls a configured SFTP directory for new `.edi` files. On new file: download → parse with core → store in SQLite → fire webhooks → move file to processed directory.

- [ ] **Step 3: Write SFTP sender**

Generates EDI from OCEX JSON and uploads to partner's SFTP directory.

- [ ] **Step 4: Test with local SFTP mock, commit**

```bash
git commit -m "feat(gateway): add SFTP watcher and sender"
```

---

### Task 17: SDK — Gateway Mode

**Files:**
- Modify: `packages/sdk/src/client.ts`
- Create: `packages/sdk/src/http.ts`
- Create: `packages/sdk/src/gateway.test.ts`

- [ ] **Step 1: Write failing gateway mode test**

Test that `edi.invoices.list()` makes HTTP GET to `${gateway}/v1/invoices` with API key header.

- [ ] **Step 2: Implement HTTP client layer**

Add `packages/sdk/src/http.ts` — thin fetch wrapper that adds `X-API-Key` header to all requests.

- [ ] **Step 3: Wire gateway mode into SDK client**

Update `invoices.list()`, `orders.list()`, `webhooks.create()` to use HTTP client when gateway is configured.

- [ ] **Step 4: Run tests, commit**

```bash
git commit -m "feat(sdk): add gateway mode with HTTP client for remote API calls"
```

---

### Task 18: Gateway — Entry Point and Dashboard

**Files:**
- Create: `packages/gateway/src/index.ts` (main entry, starts server)
- Create: `packages/gateway/src/dashboard.ts` (basic status pages)

- [ ] **Step 1: Implement main entry point**

CLI-style entry that reads config (port, db path, SFTP settings) from env vars or config file, initializes storage, starts Express server and SFTP watcher.

- [ ] **Step 2: Add minimal dashboard routes**

`GET /` — HTML status page showing: server uptime, document counts by type, recent transactions, partner connection status.

- [ ] **Step 3: Test startup, commit**

```bash
git commit -m "feat(gateway): add server entry point and status dashboard"
```

---

## Chunk 5: Integration, Examples, and Polish

### Task 19: End-to-End Integration Test

**Files:**
- Create: `tests/integration/round-trip.test.ts`

- [ ] **Step 1: Write integration test**

Full flow: raw EDI string → parse via SDK (local) → verify OCEX JSON → generate back to X12 → re-parse → verify semantic equivalence. Test all five transaction sets.

- [ ] **Step 2: Run and verify**

Run: `npx vitest run tests/integration/`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git commit -m "test: add end-to-end round-trip integration tests for all v1 transaction sets"
```

---

### Task 20: Examples and README

**Files:**
- Create: `examples/parse-invoice.ts`
- Create: `examples/gateway-quickstart.ts`
- Create: `README.md`

- [ ] **Step 1: Create example scripts**

`examples/parse-invoice.ts` — reads an 810 EDI file, parses it, prints clean JSON.
`examples/gateway-quickstart.ts` — starts gateway, ingests EDI, queries via SDK.

- [ ] **Step 2: Write README**

Cover: what EDIConvert is, installation, quick start (parse EDI in 3 lines), SDK API reference overview, CLI usage, gateway setup, OCEX protocol link, contributing guide, license (MIT).

- [ ] **Step 3: Commit**

```bash
git commit -m "docs: add README, examples, and quickstart guide"
```

---

### Task 21: CI and Package Publishing Setup

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/publish.yml`

- [ ] **Step 1: Create CI workflow**

On push/PR: install deps, lint, type-check, run all tests.

- [ ] **Step 2: Create publish workflow**

On tag push (`v*`): build all packages, publish to npm under `@ediconvert` scope.

- [ ] **Step 3: Commit**

```bash
git commit -m "ci: add GitHub Actions for CI and npm publishing"
```
