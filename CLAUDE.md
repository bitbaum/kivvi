# Kivvi ERP — Engineering Bible

**Inherits**: `@~/.claude/CLAUDE.md` (global engineering standards)
**Product Identity**: See `PRODUCT.md` for mission, vision, target customers, and positioning.
**Last Updated**: 2026-04-03

---

## What Is Kivvi

Kivvi is an ERP for businesses that sell used, donated, and refurbished goods — Brockenhäuser, computer refurbishers, vintage shops, repair workshops. Unlike generic ERPs that assume linear buy-new/sell-new flows, Kivvi handles intake, condition grading, repair workflows, flexible pricing, and impact tracking natively. AI-first, Swiss-native, open source.

---

## First Principles

Don't reason by analogy ("other ERPs do X, so we do X"). Reason from ground truth.

### Ground Truths

These are irreducible facts. Everything else is derived from them.

1. **A business transaction either happened or it didn't.** There is no "sort of" in accounting. Every transaction must be recorded completely and atomically, or not at all. Partial state = corrupted books = legal liability.

2. **Money is not a float.** `0.1 + 0.2 !== 0.3` in IEEE 754. Financial software that uses floating-point arithmetic will produce wrong numbers. Wrong numbers on invoices break trust, violate tax law, and lose customers.

3. **Swiss law governs Swiss businesses.** VAT rates, QR-bill format, document retention, chart of accounts structure — these aren't preferences, they're legal requirements. Non-compliance has consequences ranging from fines to criminal liability.

4. **Data belongs to its owner, absolutely.** Company A must never see Company B's data. Not through a bug, not through a race condition, not through a missing WHERE clause. Tenant isolation is a security invariant, not a feature.

5. **The system must be authoritative.** If the ERP says the balance is CHF 47,231.50, it must be CHF 47,231.50. If there are two sources of truth, there are zero sources of truth. One schema, one definition, one place.

6. **Humans shouldn't do what machines can do.** Data entry, number generation, VAT calculation, document conversion, payment matching — these are mechanical. Every hour a bookkeeper spends on mechanical work is an hour not spent on judgment work.

### Derived Principles

From these truths, every architectural decision follows:

**From Truth #1** (transactions are atomic):

- Use `db.transaction()` for all multi-table operations
- Document creation + journal entries + stock movements = one transaction
- If any step fails, nothing is committed

**From Truth #2** (money is not a float):

- Use `decimal.js` for all financial calculations
- Round at the LINE ITEM level (Swiss standard), not at the total
- CHF rounds to nearest 0.05 (Rappen rounding)
- Test financial code with exact expected values, never approximate

**From Truth #3** (Swiss law governs):

- VAT rates (8.1% / 2.6% / 0%) come from config, never hardcoded
- Every invoice generates a valid Swiss QR payment slip (legally required since 2022)
- Swiss KMU Kontenrahmen (1000-9999) seeded on company creation
- Currency: CHF default. Locale: `de-CH`. Date display: DD.MM.YYYY
- Document prefixes: German abbreviations (RE, AN, AU, GU, LS, MA, BE, ER)

**From Truth #4** (data belongs to its owner):

- Every table has `companyId`. Every query filters by it. No exceptions.
- Domain functions take `companyId` as a required parameter
- A missing `companyId` clause is a security vulnerability, not a bug

**From Truth #5** (system must be authoritative):

- `packages/database/src/schema.ts` defines reality. Types derived from it.
- One unified `documents` table — not separate tables per document type
- Zod schemas mirror DB schema. Config originates from schema definitions.
- If data exists in two places, one of them is wrong. Eliminate it.

**From Truth #6** (automate mechanical work):

- AI tools call the exact same domain functions as human-triggered Server Actions
- Number sequences auto-generate. Totals auto-calculate. Journal entries auto-create.
- Document conversion (Quote -> Order -> Invoice) is a type change, not re-entry
- CSV import with auto-detection — migration is self-service, not engineering work

### The Test

Before any decision, ask: **"Which ground truth does this serve?"**

If the answer is "none" or "convention" or "that's how other ERPs do it" — stop and rethink from scratch.

---

## Critical Rules

Violating these will break the system. Treat them as compiler errors.

### NEVER

- **NEVER** use floating-point for money. Use `decimal.js` or integer arithmetic.
- **NEVER** write a query without `companyId` filtering (except auth/users tables).
- **NEVER** define TypeScript types separately from the schema. Derive with `$inferSelect` / `$inferInsert`.
- **NEVER** put business logic in React components or Server Actions. Domain logic lives in `packages/core/src/domain/`.
- **NEVER** create a separate table for a new document type. Use the unified `documents` table with the type discriminator.
- **NEVER** use API routes for mutations. Use Server Actions. API routes are ONLY for streaming (AI chat) and webhooks.
- **NEVER** import from `@kivvi/core` barrel export in client components. It pulls in postgres driver. Import specific domain files directly.
- **NEVER** hardcode VAT rates, account codes, or document prefixes. Use config/constants.
- **NEVER** edit an existing migration file. Create a new one.

### ALWAYS

- **ALWAYS** use `db.transaction()` for operations that touch multiple tables.
- **ALWAYS** derive types from the Drizzle schema: `type Contact = typeof contacts.$inferSelect`.
- **ALWAYS** return `ActionResult<T>` from Server Actions: `{ success: boolean; data?: T; error?: string }`.
- **ALWAYS** validate inputs with Zod at the domain boundary.
- **ALWAYS** use `getSession()` helper in Server Actions (throws if unauthorized, returns companyId + userId).
- **ALWAYS** call `revalidatePath()` after mutations in Server Actions.
- **ALWAYS** store dates as ISO 8601, display as DD.MM.YYYY using `de-CH` locale.
- **ALWAYS** test financial calculations with known expected values (not approximate).

---

## Architecture

### Monorepo Structure

```
kivvi/
├── apps/
│   └── web/                        # Next.js 14 (App Router)
│       ├── app/
│       │   ├── (auth)/             # Login, register (no sidebar)
│       │   ├── (dashboard)/        # All authenticated pages (with sidebar)
│       │   ├── (onboarding)/       # 3-step onboarding wizard
│       │   ├── api/                # ONLY streaming + webhooks
│       │   └── actions/            # Server Actions (ALL mutations)
│       ├── components/             # UI components
│       │   └── ui/                 # shadcn/ui primitives
│       ├── hooks/                  # Client-side hooks
│       └── lib/
│           ├── auth.ts             # NextAuth v5 config
│           ├── db.ts               # DB client for Server Actions
│           ├── config/             # UI config (document-types, etc.)
│           └── utils.ts            # Formatting, helpers
├── packages/
│   ├── database/                   # Drizzle schema + migrations
│   │   └── src/
│   │       ├── schema.ts           # THE source of truth (all tables)
│   │       ├── index.ts            # DB client factory
│   │       └── seeds/              # Seed data (chart of accounts)
│   ├── core/                       # Domain logic (pure functions)
│   │   └── src/domain/             # One file per domain
│   │       ├── contacts.ts         # CRUD + search
│   │       ├── products.ts         # CRUD + search
│   │       ├── documents.ts        # Unified doc model (778 lines)
│   │       ├── accounting.ts       # Chart of accounts, journal entries
│   │       ├── accounting-integration.ts  # Auto journal entries
│   │       ├── banking.ts          # Bank accounts, reconciliation
│   │       ├── inventory.ts        # Warehouses, stock, serial numbers
│   │       ├── number-sequences.ts # Auto-incrementing numbers
│   │       ├── dunning.ts          # Overdue detection, dunning levels
│   │       ├── projects.ts         # Project tracking
│   │       ├── reports.ts          # Balance sheet, P&L, VAT report
│   │       ├── pricing.ts          # Price lists, rules
│   │       ├── onboarding.ts       # Company initialization
│   │       ├── import-mappings.ts  # CSV mapping profiles (pure, no DB)
│   │       └── import-bulk.ts      # Bulk insert functions
│   ├── ai/                         # AI tools + providers
│   │   └── src/
│   │       ├── tools/              # AI tool definitions
│   │       └── providers/          # Anthropic, OpenAI, OpenRouter, Ollama
│   └── events/                     # Event system (minimal)
```

### Data Flow

```
User Action / AI Tool Call
        ↓
Server Action (apps/web/app/actions/)
  - Authenticates (getSession)
  - Validates (Zod)
  - Opens transaction
        ↓
Domain Function (packages/core/src/domain/)
  - Business logic
  - Financial calculations
  - Data persistence
        ↓
Database (packages/database/src/schema.ts)
  - Drizzle ORM
  - PostgreSQL
        ↓
Server Action
  - revalidatePath()
  - Returns ActionResult<T>
```

### The Unified Document Model

The single most important architectural decision in Kivvi. ALL business documents share one table:

```
documents table (type discriminator)
├── quote          (AN-2026-00001)
├── order          (AU-2026-00001)
├── order_confirmation (AB-2026-00001)
├── delivery_note  (LS-2026-00001)
├── invoice        (RE-2026-00001)  → generates QR-bill, creates journal entries
├── credit_note    (GU-2026-00001)
├── dunning        (MA-2026-00001)
├── purchase_order (BE-2026-00001)
└── purchase_invoice (ER-2026-00001) → creates journal entries
```

**Why**: Enables document conversion (Quote -> Order -> Invoice) by copying rows and changing type. Shared status/workflow logic. One set of CRUD functions handles all types.

**Document lifecycle**:

```
draft → sent → confirmed → delivered → paid
                                     → partially_paid → paid
         → cancelled
         → overdue → dunning_1 → dunning_2 → dunning_3
```

**Config-driven behavior** (`apps/web/lib/config/document-types.ts`):
Each document type has: label, statuses, conversionTargets, hasDueDate, hasPayments, canCreate, contactFilter. UI components read this config — they don't hardcode behavior per type.

---

## SSOT File Locations

| What                        | Where                                                   | Why It Matters                             |
| --------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| All database tables & types | `packages/database/src/schema.ts`                       | THE truth. Types derived here.             |
| All business logic          | `packages/core/src/domain/*.ts`                         | Pure functions. Used by actions AND AI.    |
| All mutations               | `apps/web/app/actions/*.ts`                             | Server Actions only. No API routes.        |
| Document type config        | `apps/web/lib/config/document-types.ts`                 | Labels, statuses, conversion targets.      |
| Number sequence formats     | `packages/core/src/domain/number-sequences.ts`          | Prefixes: RE, AN, AU, GU, LS, MA, BE, ER.  |
| Chart of accounts seed      | `packages/database/src/seeds/swiss-kmu-kontenrahmen.ts` | 227 Swiss KMU accounts.                    |
| Auth config                 | `apps/web/lib/auth.ts`                                  | NextAuth v5, JWT strategy, credentials.    |
| Middleware                  | `apps/web/middleware.ts`                                | Rate limiting, auth, onboarding redirects. |
| AI tools                    | `packages/ai/src/tools/index.ts`                        | All AI capabilities registered here.       |
| Import profiles             | `packages/core/src/domain/import-mappings.ts`           | Kivitendo CSV column mappings.             |

---

## Patterns

### Server Action Pattern

Every mutation follows this exact structure:

```typescript
"use server";

export async function createContactAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId, userId } = await getSession(); // 1. Auth
    const parsed = createContactSchema.safeParse(input); // 2. Validate
    if (!parsed.success)
      return { success: false, error: formatZodError(parsed.error) };

    const contact = await db.transaction(async (tx) => {
      // 3. Transaction
      return createContact(tx, companyId, parsed.data); // 4. Domain function
    });

    revalidatePath("/contacts"); // 5. Revalidate
    return { success: true, data: { id: contact.id } }; // 6. Return
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to create contact"),
    };
  }
}
```

### Domain Function Pattern

Every domain function follows this structure:

```typescript
export async function createContact(
  db: Database, // Always first param: DB or transaction
  companyId: string, // Always second param: tenant isolation
  input: CreateContactInput,
): Promise<Contact> {
  // 1. Business validation (beyond Zod)
  // 2. Generate number sequence
  // 3. Insert with companyId
  // 4. Return typed result
}
```

### Safe Error Messages

Only known domain errors are exposed to users. Unknown errors are logged server-side, generic message returned to client.

```typescript
const SAFE_ERROR_PATTERNS = [
  "not found",
  "already exists",
  "Unauthorized",
  "Cannot transition",
  "Cannot convert",
  "Invalid",
  "required",
  "must balance",
  "only draft",
];
```

---

## Database Schema (28 Tables)

### Core Tables

| Table              | Purpose                   | Key Fields                                           |
| ------------------ | ------------------------- | ---------------------------------------------------- |
| `companies`        | Multi-tenant companies    | name, settings (JSONB), currency (CHF)               |
| `users`            | Auth accounts             | email, passwordHash, companyId, role                 |
| `contacts`         | Customers & vendors       | type (customer/vendor/both), contactNumber (K-00001) |
| `contactAddresses` | Multiple addresses        | type (billing/shipping), isDefault                   |
| `products`         | Products & services       | articleNumber (ART-00001), unitPrice, vatRate        |
| `productGroups`    | Categories (hierarchical) | parentId for tree                                    |
| `manufacturers`    | Product manufacturers     | name, website                                        |

### Document Tables

| Table              | Purpose                | Key Fields                                       |
| ------------------ | ---------------------- | ------------------------------------------------ |
| `documents`        | ALL business documents | type (enum), status, number, totals, qrReference |
| `documentItems`    | Line items             | position, quantity, unitPrice, discount, vatRate |
| `documentPayments` | Payment records        | amount, method, bankTransactionId                |

### Accounting Tables

| Table            | Purpose            | Key Fields                           |
| ---------------- | ------------------ | ------------------------------------ |
| `accounts`       | Chart of accounts  | code (1000-9999), type, parentId     |
| `journalEntries` | Journal entries    | date, reference, sourceType/sourceId |
| `journalLines`   | Debit/credit lines | accountId, debit OR credit           |
| `fiscalYears`    | Fiscal year defs   | startDate, endDate, isClosed         |
| `fiscalPeriods`  | Monthly periods    | fiscalYearId, isClosed               |

### Banking Tables

| Table              | Purpose               | Key Fields                         |
| ------------------ | --------------------- | ---------------------------------- |
| `bankAccounts`     | Company bank accounts | iban, bankName, balance            |
| `bankTransactions` | Imported transactions | isReconciled, reconciledDocumentId |

### Inventory Tables

| Table            | Purpose           | Key Fields                                 |
| ---------------- | ----------------- | ------------------------------------------ |
| `warehouses`     | Storage locations | isDefault                                  |
| `stockLevels`    | Current stock     | productId + warehouseId (unique)           |
| `stockMovements` | Movement history  | type (purchase/sale/adjustment/transfer)   |
| `serialNumbers`  | Serial tracking   | status (available/sold/reserved/defective) |

### Other Tables

| Table                            | Purpose                                    |
| -------------------------------- | ------------------------------------------ |
| `projects`                       | Project tracking with budget               |
| `numberSequences`                | Auto-incrementing number generators        |
| `priceLists` + `priceRules`      | Flexible pricing (fixed/percentage/tiered) |
| `aiConversations` + `aiMessages` | AI chat history                            |
| `aiActionAudit`                  | AI action audit trail                      |

---

## Swiss-Specific Details

### VAT Calculation

```typescript
// Correct Swiss VAT calculation (line-item level)
import Decimal from "decimal.js";

function calculateLineTotal(
  quantity: number,
  unitPrice: string,
  vatRate: string,
): LineTotal {
  const net = new Decimal(unitPrice).times(quantity);
  const vat = net.times(new Decimal(vatRate).div(100));
  const gross = net.plus(vat);

  return {
    netAmount: net.toDecimalPlaces(2).toString(),
    vatAmount: vat.toDecimalPlaces(2).toString(), // Round PER LINE
    grossAmount: gross.toDecimalPlaces(2).toString(),
  };
}

// Document total = SUM of line totals (already rounded)
// DO NOT recalculate VAT on the total
```

### Swiss Rappen Rounding

CHF amounts round to nearest 0.05:

```typescript
function rappenRound(amount: Decimal): Decimal {
  return amount.times(20).round().div(20); // Round to 0.05
}
```

### QR-Bill Reference

Every invoice generates a QR reference stored in `documents.qrReference`. Used for:

- QR payment slip generation (legally required)
- Automated payment matching via bank transaction import

### Document Number Formats

| Type             | Prefix | Format            | Example       |
| ---------------- | ------ | ----------------- | ------------- |
| Invoice          | RE     | RE-{year}-{00000} | RE-2026-00001 |
| Quote            | AN     | AN-{year}-{00000} | AN-2026-00001 |
| Order            | AU     | AU-{year}-{00000} | AU-2026-00001 |
| Credit Note      | GU     | GU-{year}-{00000} | GU-2026-00001 |
| Delivery Note    | LS     | LS-{year}-{00000} | LS-2026-00001 |
| Dunning          | MA     | MA-{year}-{00000} | MA-2026-00001 |
| Purchase Order   | BE     | BE-{year}-{00000} | BE-2026-00001 |
| Purchase Invoice | ER     | ER-{year}-{00000} | ER-2026-00001 |
| Contact          | K      | K-{00000}         | K-00001       |
| Product          | ART    | ART-{00000}       | ART-00001     |

---

## Onboarding & Data Import

### Onboarding Flow

```
Register → Step 1: Company Info → Step 2: Business Config → Step 3: Data Import → Dashboard
```

- **Step 1**: Company name, address, VAT number
- **Step 2**: Default VAT rate, payment terms, bank IBAN → triggers: seed 227 accounts, create 11 number sequences, create default warehouse, create fiscal year
- **Step 3**: "Start fresh" or "Import from kivitendo" → CSV upload with auto-detection

### Kivitendo CSV Import

Import profiles in `packages/core/src/domain/import-mappings.ts`. Handles:

- BOM markers on CSV files
- Swiss number format: `5'007.20` → strip apostrophes
- Swiss date format: `22.01.2026` → `2026-01-22`
- Document CSVs with one row per line item → group by document number
- Subtotal rows (empty key columns) → filtered out

**Import order** (FK dependencies):

```
1. Contacts (customers + vendors)     — no deps
2. Product groups + manufacturers     — no deps
3. Products                           — depends on groups, manufacturers
4. Documents + items                  — depends on contacts, products
5. Journal entries + lines            — depends on accounts (seeded in step 2)
6. Stock levels                       — depends on products, warehouse
```

After import: number sequences auto-updated to MAX(existing) + 1.

### Client/Server Boundary

`import-mappings.ts` is a pure module (zero DB imports) — safe to import in client components.
`import-bulk.ts` imports from `@kivvi/database` — server only.

**NEVER** import from `@kivvi/core` barrel (`packages/core/src/index.ts`) in client components. It re-exports everything including DB-dependent modules. Import specific files:

```typescript
// In client components:
import { detectMappingProfile } from "@kivvi/core/src/domain/import-mappings"; // OK

// NEVER:
import { detectMappingProfile } from "@kivvi/core"; // Pulls in postgres driver!
```

---

## Development

### Commands

```bash
pnpm install              # Install all workspace deps
pnpm dev                  # Start dev server (turbo)
pnpm build                # Production build
pnpm type-check           # TypeScript strict check
pnpm lint                 # ESLint
pnpm db:generate          # Generate Drizzle migrations after schema change
pnpm db:push              # Push schema to DB (dev)
pnpm db:migrate           # Run migrations (production)
pnpm db:studio            # Visual DB editor (Drizzle Studio)
```

### Environment Variables

```bash
# Required
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."

# AI (at least one)
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."
OPENROUTER_API_KEY="sk-or-..."
OLLAMA_BASE_URL="http://localhost:11434"
```

### Database

- **Development**: Local PostgreSQL via Docker, or Neon serverless
- **Production**: Self-hosted PostgreSQL (planned: datacenterthurgau.ch)
- DB client factory auto-detects environment (HTTP for serverless, TCP for traditional)
- The `createDb()` function in `packages/database/src/index.ts` handles both

### Key Dependencies

| Package      | Purpose        | Why This One                                    |
| ------------ | -------------- | ----------------------------------------------- |
| drizzle-orm  | ORM + schema   | Full SQL control, best TS inference, no codegen |
| next-auth v5 | Authentication | Credentials provider, JWT strategy              |
| zod          | Validation     | Schema = SSOT for validation + types            |
| decimal.js   | Financial math | Arbitrary precision, no float errors            |
| papaparse    | CSV parsing    | Client-side, streaming, handles edge cases      |
| @radix-ui/\* | UI primitives  | Accessible, unstyled, composable                |
| lucide-react | Icons          | Consistent, tree-shakeable                      |

---

## Naming Conventions

### Database

```
Tables:     camelCase plural     (documents, documentItems, bankTransactions)
Columns:    camelCase            (companyId, issueDate, vatRate)
Enums:      camelCase + Enum     (documentTypeEnum, documentStatusEnum)
```

### Code

```
Components:      kebab-case.tsx   (document-form.tsx) — exported function is PascalCase
Domain modules:  kebab-case.ts    (number-sequences.ts)
Server Actions:  camelCase.ts     (documents.ts)
Hooks:           useCamelCase.ts  (useDocuments.ts)

Functions:       camelCase        (createDocument, calculateTotals)
Server Actions:  camelCase+Action (createDocumentAction)
Types:           PascalCase       (Document, Contact, CreateDocumentInput)
Constants:       UPPER_SNAKE      (SEQUENCE_DEFAULTS, VALID_TRANSITIONS)
```

---

## Adding New Features: Decision Tree

### Adding a new document type?

1. Add to `documentTypeEnum` in schema.ts
2. Add config to `apps/web/lib/config/document-types.ts`
3. Add number sequence prefix to `SEQUENCE_DEFAULTS`
4. Done. Existing CRUD, forms, and lists handle it automatically.

### Adding a new field to an entity?

1. Add column to schema.ts
2. Run `pnpm db:generate` + `pnpm db:push`
3. Update Zod validation schema if needed
4. UI picks it up via form config (if config-driven) or add to form
5. **Target: 2-3 files. If it's 5+, the architecture is wrong.**

### Adding business logic?

1. Add function to appropriate `packages/core/src/domain/*.ts` file
2. Create Server Action in `apps/web/app/actions/` that calls it
3. Wire up to UI
4. Register as AI tool in `packages/ai/src/tools/` if AI should access it

### Adding a new page?

1. Create route in `apps/web/app/(dashboard)/`
2. Use existing layout (sidebar + header come free)
3. Fetch data with Server Actions or direct DB queries in Server Components
4. Follow existing page patterns (list → detail → form)

---

## Pre-Implementation Checklist

Before writing code, verify:

1. **Does this touch money?** → Use `decimal.js`. Test with known values. Transaction required.
2. **Does this touch the schema?** → Update `packages/database/src/schema.ts`. Run `db:generate`.
3. **Is this business logic?** → Put it in `packages/core/src/domain/`. NOT in components or actions.
4. **Is this a mutation?** → Server Action in `apps/web/app/actions/`. NOT an API route.
5. **Does this need tenant isolation?** → Every query must have `companyId` in WHERE clause.
6. **Should AI have access?** → Add tool to `packages/ai/src/tools/`. Same domain function.
7. **Is this a new document type?** → Use unified `documents` table. Add to config.
8. **Does this format currency?** → Use `formatCurrency()` with `de-CH` locale and CHF.
9. **Does this involve dates?** → Store ISO 8601. Display DD.MM.YYYY.

---

## Design System

**File**: `apps/web/app/globals.css` — SSOT for all design tokens.
**Tailwind config**: `apps/web/tailwind.config.ts`
**UI library**: shadcn/ui (built on `@radix-ui/*` primitives). Components live in `apps/web/components/ui/`. Tokens follow the shadcn HSL-channel convention.

### CSS Custom Properties (from `globals.css`)

All values are expressed as HSL channels (without the `hsl()` wrapper) so Tailwind can compose them with opacity modifiers.

**Light mode (`:root`):**

```css
--background: 0 0% 100%;
--foreground: 150 10% 8%;
--card: 0 0% 100%;
--card-foreground: 150 10% 8%;
--popover: 0 0% 100%;
--popover-foreground: 150 10% 8%;
--primary: 152 76% 36%;
--primary-foreground: 0 0% 100%;
--secondary: 150 20% 96%;
--secondary-foreground: 150 10% 12%;
--muted: 150 20% 96%;
--muted-foreground: 150 10% 45%;
--accent: 150 20% 96%;
--accent-foreground: 150 10% 12%;
--destructive: 0 84.2% 60.2%;
--destructive-foreground: 210 40% 98%;
--border: 150 15% 90%;
--input: 150 15% 90%;
--ring: 152 76% 36%;
--radius: 0.5rem;

/* Brand gradient (used via .brand-gradient / .brand-gradient-text utilities) */
--brand-from: #10b981;
--brand-to: #059669;

/* Semantic status colours — SSOT for all status/context indicators */
--success: 142 70% 32%;
--success-foreground: 0 0% 100%;
--warning: 38 85% 38%;
--warning-foreground: 0 0% 100%;
--info: 217 75% 45%;
--info-foreground: 0 0% 100%;
--neutral: 220 15% 42%;
--neutral-foreground: 0 0% 100%;
--tag-purple: 271 70% 45%;
--tag-purple-foreground: 0 0% 100%;
--tag-rose: 347 75% 45%;
--tag-rose-foreground: 0 0% 100%;
```

**Dark mode (`.dark`):**

```css
--background: 150 15% 5%;
--foreground: 150 10% 96%;
--card: 150 15% 5%;
--card-foreground: 150 10% 96%;
--popover: 150 15% 5%;
--popover-foreground: 150 10% 96%;
--primary: 152 60% 48%;
--primary-foreground: 150 15% 5%;
--secondary: 150 15% 14%;
--secondary-foreground: 150 10% 96%;
--muted: 150 15% 14%;
--muted-foreground: 150 10% 60%;
--accent: 150 15% 14%;
--accent-foreground: 150 10% 96%;
--destructive: 0 62.8% 30.6%;
--destructive-foreground: 210 40% 98%;
--border: 150 15% 14%;
--input: 150 15% 14%;
--ring: 152 60% 48%;

--brand-from: #34d399;
--brand-to: #10b981;

--success: 142 55% 50%;
--success-foreground: 142 70% 8%;
--warning: 38 80% 55%;
--warning-foreground: 38 85% 8%;
--info: 217 70% 60%;
--info-foreground: 217 75% 8%;
--neutral: 220 15% 60%;
--neutral-foreground: 220 15% 8%;
--tag-purple: 271 65% 62%;
--tag-purple-foreground: 271 70% 8%;
--tag-rose: 347 70% 60%;
--tag-rose-foreground: 347 75% 8%;
```

### Tailwind Config (clean — all CSS vars, no literal values)

Every color maps to `hsl(var(--name))`. Border radius maps to `var(--radius)`. No violations in config.

```ts
colors: {
  border: 'hsl(var(--border))',        input: 'hsl(var(--input))',
  ring: 'hsl(var(--ring))',            background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
  secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
  destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
  muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
  accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
  popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
  card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
  success: { DEFAULT: 'hsl(var(--success))', foreground: 'hsl(var(--success-foreground))' },
  warning: { DEFAULT: 'hsl(var(--warning))', foreground: 'hsl(var(--warning-foreground))' },
  info: { DEFAULT: 'hsl(var(--info))', foreground: 'hsl(var(--info-foreground))' },
  neutral: { DEFAULT: 'hsl(var(--neutral))', foreground: 'hsl(var(--neutral-foreground))' },
  'tag-purple': { DEFAULT: 'hsl(var(--tag-purple))', foreground: 'hsl(var(--tag-purple-foreground))' },
  'tag-rose': { DEFAULT: 'hsl(var(--tag-rose))', foreground: 'hsl(var(--tag-rose-foreground))' },
},
borderRadius: {
  lg: 'var(--radius)',
  md: 'calc(var(--radius) - 2px)',
  sm: 'calc(var(--radius) - 4px)',
},
```

### Status Badge Pattern

```tsx
// Light badge (most common)
<span className="bg-success/10 text-success">Paid</span>
<span className="bg-warning/10 text-warning">Pending</span>
<span className="bg-destructive/10 text-destructive">Overdue</span>

// Solid badge
<span className="bg-success text-success-foreground">Paid</span>
```

### SSOT Rule

All design tokens live in the main CSS file only. Tailwind config MUST reference CSS vars (`'hsl(var(--name))'`), never literal values. Components MUST use semantic Tailwind classes, never arbitrary values like `bg-[#hex]`.

**Violations to fix when touching UI:**

- `bg-[#hex]` / `text-[#hex]` in className → CSS var + semantic class
- `style={{ color: '#hex' }}` → CSS var + className
- Literal hex in tailwind.config → `'var(--color-name)'`
- Same token defined in 2+ files → consolidate to main CSS file

**Audit:** `grep -r '\[#' src/` — every result is a violation.

---

## Red Flags

Stop and reconsider if you see:

- Business logic in a React component → Move to `packages/core/src/domain/`
- SQL/Drizzle queries in a component → Move to Server Action or domain function
- Types not derived from schema → Derive from `$inferSelect` / `$inferInsert`
- A new table for a document type → Use the unified `documents` table
- Floating-point arithmetic on money → Use `decimal.js`
- A query without companyId → Add tenant isolation
- An API route doing mutations → Convert to Server Action
- Hardcoded VAT rates or account codes → Use config/constants
- `import { ... } from '@kivvi/core'` in a `'use client'` file → Import specific file

---

## AI System

### Available AI Tools

- `searchInvoicesTool` — Search by status, contact, date range
- `searchCustomersTool` — Search contacts by name, email, type
- `getInvoiceDetailsTool` — Full invoice with items and payments
- `getCustomerDetailsTool` — Contact with addresses and recent docs
- `createDocumentTool` — Create any document type
- `updateDocumentStatusTool` — Status transitions
- `searchProductsTool` — Search products/services
- `getFinancialSummaryTool` — Revenue, expenses, outstanding

### AI Provider Support

Configurable per company via `CompanySettings`:

- **Anthropic** (Claude) — recommended default
- **OpenAI** (GPT-4)
- **OpenRouter** — multi-model access
- **Ollama** — self-hosted (llama, mistral, etc.)

### Adding an AI Tool

1. Create tool definition in `packages/ai/src/tools/`
2. Tool calls a domain function from `packages/core/src/domain/`
3. Register in `packages/ai/src/tools/index.ts`
4. Add to permission filter in `getToolsForPermissions()`
5. Action is auto-logged to `aiActionAudit`

---

## Terminology

Use Swiss German business terms consistently:

| German                | English           | Context             |
| --------------------- | ----------------- | ------------------- |
| Rechnung (RE)         | Invoice           | Sales invoice       |
| Angebot (AN)          | Quote             | Sales quote         |
| Auftrag (AU)          | Order             | Sales order         |
| Gutschrift (GU)       | Credit Note       | Refund/correction   |
| Lieferschein (LS)     | Delivery Note     | Shipping document   |
| Mahnung (MA)          | Dunning           | Payment reminder    |
| Bestellung (BE)       | Purchase Order    | Buying from vendors |
| Eingangsrechnung (ER) | Purchase Invoice  | Vendor invoice      |
| Kontenrahmen          | Chart of Accounts | Account structure   |
| Mehrwertsteuer (MWST) | VAT               | Value Added Tax     |
| Hauptlager            | Main Warehouse    | Default warehouse   |
| Stück                 | Piece             | Unit of measure     |

---

## What Makes Kivvi Different

1. **Built for secondhand**: Intake workflows, condition grading, repair tracking, flexible pricing — the things no other ERP handles. See `PRODUCT.md` for the full rationale.
2. **AI-first ERP**: Not AI bolted on — AI tools call the same domain functions as the UI. Cmd+K command bar understands "50 laptops donated by UBS" natively.
3. **Unified Document Model**: One table, all document types (including intake and repair orders). Convert between types by changing a field.
4. **Swiss-native**: QR-bills, VAT, Rappen rounding, CAMT import, KMU Kontenrahmen. Not a US product adapted for Switzerland.
5. **Condition-aware inventory**: Items tracked individually with condition grades (good/fair/poor/parts/scrap) and lifecycle status (intake → testing → repair → sale).
6. **Impact tracking**: Devices saved, CO2 avoided, people served. Because for secondhand businesses, impact IS the point.
7. **Config-driven UI**: Document behavior defined in config. Adding a document type = adding config, not code.
8. **Self-service migration**: Any kivitendo customer can migrate via CSV upload. No engineering required.
9. **Multi-tenant SaaS**: One instance serves all companies. Strict tenant isolation.

---

_Every item that passes through your hands deserves to be tracked, valued, and given its best possible future._
