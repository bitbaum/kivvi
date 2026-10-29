# AGENTS.md — Kivvi ERP

<!-- fleet:rules:begin — generated from bitbaum/fleet templates/agent-rules.md; edit it there, not here -->

## Org rules

Read `bitbaum/fleet` `AGENTS.md`, `SHARED.md` and the registers it names before
inventing a host, a name, a page or a shared behaviour. Do not copy their facts
into this file.

- **Packages first.** If a `@bitbaum/*` package (or `bip-kit`, `limitkit`,
  `threadkit`, `ai-forms`) already does it, use it and fix a defect in the
  package, not in this app. Every chat is `@bitbaum/chatkit`, every search box
  `@bitbaum/searchkit`, every chart `@bitbaum/chartkit`, accounts
  `@bitbaum/accountkit`, model calls `@bitbaum/ai-kit`. Review this product's
  `package-plan.json` before building anything.
- **One shape per kind.** Things of the same kind look the same and sit in the
  same place (fleet `AGENTS.md`, "One shape per kind").
- **Finished work ships by itself.** Open a non-draft pull request; the fleet
  auto-merge sweep is the only merge path. Never merge by hand, through the
  merge API, with `--auto` or with an admin bypass, and never force-push a
  shared branch.
- **Nothing made up.** A fact on a page or in a doc needs a source that was
  opened; where there is none, the line is removed or softened.
- **Bitcoin orange is for Bitcoin and top-of-funnel actions only.**
- **No model identifier** in anything pushed to a repository.
- Before you finish, run `node <fleet>/scripts/ci/docs-truth-audit.mjs --dir .`:
  the same check the sweep runs on every pull request.

<!-- fleet:rules:end -->

Product identity (mission, customers, positioning) is in `PRODUCT.md`. This file
is the engineering contract for agents.

## What this is

AI-first, Swiss-native, open-source ERP for businesses that sell used, donated
and refurbished goods — Brockenhäuser, computer refurbishers, repair workshops,
vintage shops. Intake, condition grading, repair workflows, flexible pricing and
impact tracking are native, not bolted on. **It is a financial system-of-record —
be conservative.**

## Ground truths

Every decision derives from these. Before any decision, ask which one it
serves; "that's how other ERPs do it" is not an answer.

1. **A transaction either happened or it didn't.** Multi-table writes run in one
   `db.transaction()`; document + journal entries + stock movements commit
   together or not at all.
2. **Money is not a float.** `decimal.js` for all financial maths; round per line
   item (Swiss standard), never on the total; CHF rounds to 0.05 (Rappen). Test
   financial code with exact expected values.
3. **Swiss law governs.** VAT rates, account codes and document prefixes come
   from config, never hardcoded. Every invoice carries a QR reference
   (`documents.qrReference`) for the QR-bill and payment matching. The Swiss KMU
   Kontenrahmen is seeded on company creation. CHF default, `de-CH` locale;
   store dates ISO 8601, display DD.MM.YYYY.
4. **Data belongs to its owner.** Every query filters by `companyId` (except the
   auth/users tables); domain functions take it as a required parameter. A
   missing `companyId` clause is a security vulnerability.
5. **One source of truth.** `packages/database/src/schema.ts` defines reality;
   types derive via `$inferSelect` / `$inferInsert`, never separately.
6. **Machines do mechanical work.** AI tools call the same domain functions as
   Server Actions; numbers auto-generate, totals auto-calculate, journal entries
   auto-create, document conversion is a type change, not re-entry.

## Stack

- **Monorepo**: pnpm workspaces + Turbo. Apps in `apps/*`, packages in `packages/*`.
- **Web**: Next.js 15 (App Router) in `apps/web`. Mutations via Server Actions
  only — API routes are for streaming (AI chat) and webhooks.
- **Domain logic**: pure functions in `packages/core/src/domain/*.ts`, one file
  per domain — never in components or actions.
- **DB**: Drizzle ORM + PostgreSQL. Schema SSOT: `packages/database/src/schema.ts`;
  enum values in `packages/database/src/enums.ts`.
- **Auth**: NextAuth v5 (`apps/web/lib/auth.ts`).
- **AI**: `packages/ai` — tools in `packages/ai/src/tools/`, providers in `packages/ai/src/providers/`.
- **Deploy**: push to the default branch (`main`) → CI-gated background deploy to a self-hosted Hetzner PostgreSQL box (behind Caddy) via the Loki push-deploy hook. Prod only receives commits CI verified green.

## Commands

```bash
pnpm install        # install workspace deps
pnpm dev            # dev server (turbo)
pnpm verify         # SSOT check bundle: format:check + lint + type-check + test — run before every commit
pnpm build          # production build
pnpm db:generate    # Drizzle migration after a schema change
pnpm --filter @kivvi/database db:push   # push schema to a local dev DB (no root db:push script)
pnpm db:studio      # Drizzle Studio
```

`pnpm verify` is exactly what CI runs (`.github/workflows/ci.yml`) before the gated `build` step. Green verify locally ⇒ green CI.

Environment: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and at least one
AI provider (`GROQ_API_KEY`, `XAI_API_KEY`, `OPENROUTER_API_KEY`,
`OLLAMA_BASE_URL`; `ANTHROPIC_API_KEY` is paid and used only with
`ALLOW_PAID_AI` set). Development runs a local PostgreSQL in Docker.

## Database migrations

- **Location**: `packages/database/drizzle/*.sql` (+ `meta/` snapshots). Config: `packages/database/drizzle.config.ts`.
- **Generate** after a schema change: `pnpm db:generate`. **Never edit an applied migration file — always create a new, forward-only one.**
- **Application is MANUAL and intentionally not in the CI/deploy pipeline.** Migrations are applied by hand against production (`pnpm db:migrate` → `drizzle-kit migrate`) by an operator, separately from code deploys. Do not add automatic migration application to CI or the deploy path without an explicit design decision by the owner — this is a financial system-of-record.

## Non-negotiables

- Every query filters by `companyId` (except auth/users tables).
- Multi-table writes run inside `db.transaction()`.
- No floating-point money; no hardcoded VAT rates / account codes / doc prefixes (config only).
- Types derive from the schema; never a parallel type definition.
- Business logic lives in `packages/core/src/domain/`, never in React components or Server Actions.
- A new document type is a row type in the unified `documents` table, never a new table.
- Server Actions return `ActionResult<T>` (`{ success, data?, error? }`), get
  `companyId` + `userId` from `getSession()` (`apps/web/app/actions/utils.ts`),
  validate input with Zod at the boundary, and call `revalidatePath()` after a
  mutation.
- Only known domain errors reach the user (`safeErrorMessage`,
  `SAFE_ERROR_PATTERNS` in `apps/web/app/actions/utils.ts`); anything else is
  logged server-side and answered generically.
- **Never import the `@kivvi/core` barrel in a `'use client'` file** — it
  re-exports DB-dependent modules and pulls in the postgres driver. Import the
  specific file (`@kivvi/core/src/domain/import-mappings` is pure and safe;
  `import-bulk.ts` is server-only).

## Data flow

User action or AI tool call → Server Action (`apps/web/app/actions/`: auth,
Zod, open transaction) → domain function (`packages/core/src/domain/`,
signature `(db, companyId, input)`) → Drizzle → back in the action:
`revalidatePath()` and an `ActionResult<T>`.

## The unified document model

Every business document — quote, order, order confirmation, delivery note,
invoice, credit note, dunning, purchase order, purchase invoice, intake, repair
order — is a row of one `documents` table with a type discriminator
(`DOCUMENT_TYPE_VALUES`). Conversion (quote → order → invoice) copies rows and
changes the type. Per-type behaviour (labels, statuses, conversion targets, due
dates, payments) is config in `apps/web/lib/config/document-types.ts`; the UI
reads it and never branches on type by hand. Number formats and German prefixes
(RE, AN, AU, AB, LS, GU, BE, ER, MA, EI, SA; K, ART, IT) are `SEQUENCE_DEFAULTS`
in `packages/core/src/domain/number-sequences.ts`.

## Where things live

| What                      | Where                                                   |
| ------------------------- | ------------------------------------------------------- |
| Tables and types          | `packages/database/src/schema.ts`                       |
| Business logic            | `packages/core/src/domain/*.ts`                         |
| Mutations                 | `apps/web/app/actions/*.ts`                             |
| Document type config      | `apps/web/lib/config/document-types.ts`                 |
| Number sequences          | `packages/core/src/domain/number-sequences.ts`          |
| Chart of accounts seed    | `packages/database/src/seeds/swiss-kmu-kontenrahmen.ts` |
| Middleware                | `apps/web/middleware.ts` (rate limit, auth, onboarding) |
| AI tools                  | `packages/ai/src/tools/index.ts`                        |
| AI provider chain         | `packages/ai/src/providers/index.ts`                    |
| Kivitendo import profiles | `packages/core/src/domain/import-mappings.ts`           |
| Design tokens             | `apps/web/app/globals.css` (shadcn HSL channels)        |

## Adding things

- **A document type**: add it to `DOCUMENT_TYPE_VALUES`, its config to
  `document-types.ts`, its prefix to `SEQUENCE_DEFAULTS`. Existing CRUD, forms
  and lists handle the rest.
- **A field**: column in `schema.ts`, `pnpm db:generate`, the Zod schema if
  needed, the form. Two or three files; five or more means the architecture is
  wrong.
- **Business logic**: a domain function, a Server Action that calls it, the UI —
  and an AI tool if the assistant should have it.
- **An AI tool**: define it in `packages/ai/src/tools/` calling a domain
  function, register it in `tools/index.ts`, add it to `getToolsForPermissions()`.
  Actions are audited in `aiActionAudit`.

Without a per-company preference the AI provider chain is Groq → xAI →
OpenRouter → Ollama, free-only; Anthropic is appended only when `ALLOW_PAID_AI`
is set.

## Kivitendo CSV import

Profiles in `import-mappings.ts` handle BOMs, Swiss numbers (`5'007.20`), Swiss
dates (`22.01.2026`), one-row-per-line-item document CSVs and subtotal rows.
Import in FK order: contacts → product groups + manufacturers → products →
documents + items → journal entries → stock levels. Number sequences are bumped
to MAX(existing) + 1 afterwards.

## Design

`apps/web/app/globals.css` holds every token as shadcn-style HSL channels
(light `:root`, dark `.dark`, plus `success` / `warning` / `info` / `neutral` /
`tag-*` status colours); `apps/web/tailwind.config.ts` maps utilities to
`hsl(var(--name))` and declares no literal colour. Components use semantic
classes (`bg-success/10 text-success`), never `bg-[#hex]` or an inline colour;
UI primitives are shadcn/ui in `apps/web/components/ui/`.

## Naming

Tables plural camelCase (`documentItems`), columns camelCase, enums
`…Enum`. Component and domain files kebab-case; Server Actions
`createDocumentAction`; types PascalCase; constants UPPER_SNAKE. Use the Swiss
German business terms (Rechnung, Angebot, Auftrag, Gutschrift, Lieferschein,
Mahnung, Bestellung, Eingangsrechnung, Kontenrahmen, MWST) consistently.
