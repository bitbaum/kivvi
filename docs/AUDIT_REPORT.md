# Codebase Audit Report

**Date**: 2026-03-09
**Auditor**: Claude Code (Opus 4.6)
**Branch**: main
**Commit**: 7c9d7d2 (uncommitted fixes applied)
**Audit iteration**: 7th
**Previous audit**: 2026-03-09 (6th iteration, commit 7c9d7d2)

## Executive Summary

This audit follows immediately after three correctness fixes applied since the 6th audit: `reconcileTransaction` now wraps reconciliation + payment in `db.transaction()` (resolving the P0 atomicity gap), `resetPasswordAction` wraps password update + token delete in a transaction, and `Number()` replaced `parseFloat()` for VAT rate parsing with added Zod refinement for numeric validation. All three P0/P1 data integrity items from the previous audit are now resolved.

TypeScript strict mode reports 0 errors across all 6 packages, ESLint returns 0 warnings, the production build succeeds, and all **485 tests** pass across 14 test files. Zero `@ts-ignore`, zero `eslint-disable` in application code.

Remaining findings center on code organization (3 TYPE_LABELS duplications, 7 duplicate document edit pages, 13 god components >300 lines, `dashboard.ts` at 814 lines), UI consistency (~70 pages bypass `PageHeader`, French translations 110 keys behind), and strategic gaps (RBAC not enforced, AI tool coverage incomplete, `initializeCompany` not atomic). No P0 data integrity issues remain.

## Health Score

| Area | Score | Prev | Delta | Notes |
|------|-------|------|-------|-------|
| First Principles | 8.0/10 | 8.0 | = | 6 dead exports, 3 SSOT violations remain |
| Best Practices | 9.0/10 | 8.7 | +0.3 | All P0 transaction fixes applied, VAT parsing fixed |
| Mission Alignment | 8.4/10 | 8.5 | -0.1 | Feature coverage excellent; AI gaps remain |
| Functional Correctness | 8.8/10 | 8.5 | +0.3 | reconcileTransaction + resetPassword fixed |
| UI/UX & Responsive | 7.5/10 | 7.0 | +0.5 | Deeper analysis; strong foundation, consistency gaps |
| **Overall** | **8.3/10** | **8.1** | **+0.2** | All previous P0 issues resolved |

---

## Phase 1: First Principles

### Ground Truth #1 — Software Serves Humans

**Score: 8/10**

- Loading states: 74 `loading.tsx` files covering 82 page routes (90% coverage).
- Error boundaries: 12 `error.tsx` files with Sentry integration at every major route group.
- Empty states: Consistent `EmptyState` component used across 16+ pages.
- **Dead exports (6 confirmed unused)**:
  - `shouldShowUpgradeBanner` (`billing.ts:36`)
  - `getDunningHistory` (`dunning.ts:241`)
  - `getStockLevelsByProduct` (`inventory.ts:196`), `listSerialNumbers` (`inventory.ts:390`)
  - `listManufacturers` (`products.ts:388`), `listProductGroups` (`products.ts:399`)
  - Note: `getAccount` is used internally in `accounting.ts:158`. `bulkInsertContactAddresses` and `bulkInsertProjects` are used by `scripts/import-kivitendo.ts`. These are NOT dead — corrected from previous audit.

### Ground Truth #2 — One Source of Truth (SSOT)

**Score: 7.5/10**

- **Types**: All 38 entity types properly derived from Drizzle schema via `$inferSelect`/`$inferInsert`. Zero standalone type definitions in the domain layer.
- **FIXED**: `Number()` replaced `parseFloat()` for VAT rate in `settings.ts:57`, with Zod `.refine()` ensuring the input is a valid numeric string.
- **REMAINING (3 TYPE_LABELS duplications)**:
  1. `packages/core/src/domain/email.ts:22-31` — Hardcoded German document type labels (should accept labels as parameters or use i18n)
  2. `apps/web/app/(dashboard)/settings/sequences/page.tsx:18-27` — Inline TYPE_LABELS for sequence types (built from i18n but structure duplicated)
  3. `apps/web/app/(dashboard)/projects/page.tsx:32-37` and `projects/[id]/page.tsx:36-41` — Duplicated `STATUS_LABELS` despite `lib/config/project-status.ts` already containing `PROJECT_STATUS_LABEL_KEYS`
- **`any` types (24 instances)**: 17 in AI provider code at external API boundaries (justified), 3 `Record<string, any>` in onboarding/dashboard (should use typed interfaces), 4 pragmatic workarounds with comments.

### Ground Truth #3 — Design for Change

**Score: 8/10**

- **EXCELLENT**: Unified document model + config-driven UI. Adding a document type = 2-3 files. Passes the "2 files vs 5+ files" litmus test.
- **EXCELLENT**: 15 config files in `apps/web/lib/config/` covering document types, contacts, currencies, products, inventory, journal, project status, VAT rates, units, and dashboard.
- **REMAINING**: 7 near-identical document edit pages (477 lines total) differing only in type guard, breadcrumb label, and redirect path. A single parameterized `[type]/[id]/edit/page.tsx` would replace all 7.
- **LOW**: `createContact` and `createProduct` perform `getNextNumber()` + `insert()` not in transaction — sequence gaps possible on insert failure. Not data-corrupting.

### Ground Truth #4 — Automate the Mechanical

**Score: 8.5/10**

- Number sequences, journal entries, QR references auto-generated.
- Dunning and recurring invoice cron jobs in production.
- CSV import with auto-detection profiles (8 mapping profiles).
- CAMT.053/054 XML import with dedup by entry reference.
- **Gap**: No pre-commit hooks (Husky/lint-staged). No E2E test suite in CI. No automated migration script in CI/CD.

### Ground Truth #5 — Simplicity Scales

**Score: 7.5/10**

**13 components exceed 300 lines:**

| File | Lines | Assessment |
|------|-------|------------|
| `products/[id]/page.tsx` | 430 | Detail page, 5 cards. Should extract tabs. |
| `StepDataImport.tsx` | 425 | Complex CSV wizard. Acceptable but borderline. |
| `banking/[bankAccountId]/import-transactions.tsx` | 415 | Mixes UI + CSV parser. Parser should be extracted. |
| `money/page.tsx` | 410 | 4 async components in one file. Should extract tab components. |
| `contacts/contact-form.tsx` | 406 | Complex form, acceptable. |
| `contacts/[id]/page.tsx` | 355 | Detail page. |
| `products/product-form.tsx` | 353 | Complex form, acceptable. |
| `banking/[bankAccountId]/page.tsx` | 343 | Detail + helpers. |
| `settings/company/company-form.tsx` | 342 | Complex form. |
| `settings/recurring-invoices/recurring-config-form.tsx` | 341 | Complex form. |
| `documents/document-form.tsx` | 334 | Complex form, acceptable. |
| `documents/page.tsx` | 333 | Hub with filters. |
| `sidebar.tsx` | 330 | Complex but well-structured. Company switcher should be extracted. |

**Domain layer**: `dashboard.ts` at 814 lines mixes alerts, stats, health metrics, activity items, and executive summaries. Should be split into focused modules.

### Ground Truth #6 — Correctness Beats Speed

**Score: 8.5/10**

- **FIXED**: `reconcileTransaction` wrapped in `db.transaction()` — reconciliation + payment are now atomic (`banking.ts:362-384`).
- **FIXED**: `resetPasswordAction` wrapped in `db.transaction()` — password update + token delete are now atomic (`password-reset.ts:132-144`).
- **FIXED**: VAT rate parsing uses `Number()` with Zod `.refine()` validation (`settings.ts:27,57`).
- **485 tests** across 14 files covering all critical business logic.
- Financial calculations use `decimal.js` with per-line VAT rounding.
- Rappen rounding correctly implemented.
- Parameterized queries everywhere — zero SQL injection risk.
- `companyId` filtering verified on ALL tenant-scoped queries.

---

## Phase 2: Best Practices

### Automated Checks

| Check | Result |
|-------|--------|
| `pnpm type-check` | 6/6 packages pass, 0 errors |
| `pnpm lint` | 0 warnings, 0 errors |
| `pnpm test` | **485 tests passed** (14 test files) |
| `pnpm build` | Production build succeeds |
| `@ts-ignore` / `@ts-expect-error` | 0 instances |
| `eslint-disable` | 0 in application code (1 in CLI script, acceptable) |

### console.log in Production Code

| File:Line | Usage | Assessment |
|-----------|-------|------------|
| `packages/ai/src/engine.ts:161` | `console.error('Failed to parse tool call:', error)` | Should use logger |
| `apps/web/lib/api-auth.ts:61` | `console.error` for non-critical lastUsedAt update | Should use logger |
| `apps/web/lib/env.ts:20` | `console.error` for missing env vars at startup | Acceptable |

### Server Action Pattern Compliance

All 24+ Server Action files follow the prescribed pattern: `'use server'` → `getSession()` → Zod validate → `db.transaction()` → domain function → `revalidatePath()` → return `ActionResult<T>`. The `action-factory.ts` utility standardizes the pattern, reducing boilerplate.

73 `revalidatePath` calls across action functions — near 1:1 mutation coverage.

Correctly exempt from `getSession()`: `registerAction`, `requestPasswordResetAction`, `resetPasswordAction`, `sendPasswordResetEmail`, `getInvitationDetailsAction`.

### API Route Security

All 22 API routes verified with proper authentication:
- Dashboard routes: `auth()` session check
- V1 API routes: `authenticateApi()` (Bearer token or session)
- Cron routes: `CRON_SECRET` Bearer token
- Webhooks: Stripe signature verification

### Naming Conventions

Component files use `kebab-case.tsx` consistently (50+ files). CLAUDE.md documents `PascalCase.tsx` — the documentation should be updated to match reality. All other naming conventions (hooks, actions, constants, types) are correctly applied.

### Barrel Import Discipline

Zero `'use client'` files import from `@kivvi/core` barrel. All barrel imports are in Server Components, Server Actions, API routes, and server-side code. Clean.

---

## Phase 3: Mission Alignment

| Area | Rating | Score | Evidence |
|------|--------|-------|----------|
| **Swiss Compliance** | Fully | 10/10 | VAT config (not hardcoded), QR-bill generation, Rappen rounding, KMU Kontenrahmen (227 accounts), CHF/de-CH locale, CAMT.053/054 import |
| **Unified Document Model** | Fully | 10/10 | 9 doc types share 1 table, 1 CRUD set, config-driven UI |
| **Multi-Tenant Isolation** | Fully | 10/10 | companyId on every table, every query filters. Zero gaps across 25 domain modules |
| **Self-Service Migration** | Fully | 9/10 | 8 CSV mapping profiles + CAMT.053/054 XML import with dedup |
| **Config-Driven UI** | Fully | 9.5/10 | document-types.ts drives behavior. Adding a type = config only |
| **AI-First ERP** | Partially | 6/10 | 15 tools across 6 domains. Major gaps in mutations and accounting |

### AI Tool Coverage Gap Analysis

| Domain | Tools | Missing |
|--------|-------|---------|
| Documents | search, detail, create, update, convert, payment | — |
| Contacts | search, detail | createContact, updateContact |
| Products | search | getProduct detail, createProduct, updateProduct |
| Reports | summary, detail | — |
| Projects | search, detail | createProject, updateProject |
| Banking | summary | importCamtStatement, reconcile, listTransactions |
| Inventory | stock levels | createStockMovement, listSerialNumbers |
| Dunning | list overdue | createDunning, processOverdue |
| **Accounting** | **None** | listAccounts, createJournalEntry, getTrialBalance |
| **Recurring Invoices** | **None** | Entire domain uncovered |

### ERP Feature Coverage

| Feature | Status | Key Files |
|---------|--------|-----------|
| Documents (9 types) | Complete | `domain/documents.ts` (1004 lines) |
| Contacts (customers/vendors) | Complete | `domain/contacts.ts` |
| Products & Services | Complete | `domain/products.ts` |
| Banking & CAMT Import | Complete | `domain/banking.ts`, `domain/camt-parser.ts` |
| Accounting | Complete | `domain/accounting.ts`, `domain/accounting-integration.ts` |
| Reports (5 types) | Complete | `domain/reports.ts` |
| Inventory | Complete | `domain/inventory.ts` |
| Projects | Complete | `domain/projects.ts` |
| Pricing | Complete | `domain/pricing.ts` |
| Recurring Invoices | Complete | `domain/recurring-invoices.ts` |
| Dunning | Complete | `domain/dunning.ts` |
| Multi-Provider AI | Complete | `packages/ai/src/` (Anthropic, OpenAI, OpenRouter, Ollama) |

---

## Phase 4: Improvement Roadmap

### Changes Since Last Audit — Resolution Status

| Previous Finding | Status |
|-----------------|--------|
| P0: `reconcileTransaction` atomicity gap | **FIXED** (`banking.ts:362-384`, now in `db.transaction()`) |
| P1: `resetPasswordAction` not atomic | **FIXED** (`password-reset.ts:132-144`, now in `db.transaction()`) |
| P1: `parseFloat` for VAT rate in settings.ts | **FIXED** (`settings.ts:27,57`, `Number()` + Zod `.refine()`) |
| P1: TYPE_LABELS duplicated in 3 locations | Not fixed |
| P1: Extract 7 document edit pages | Not fixed |
| P2: PageHeader consistency | Not fixed (~70 pages bypass it) |
| P2: dashboard.ts at 814 lines | Not fixed |
| P2: Dead exports | Not fixed (corrected count: 6, not 9) |

### Quick Wins (< 1 hour)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| QW-1 | Use existing `PROJECT_STATUS_LABEL_KEYS` config in 2 project pages | 15 min | SSOT |
| QW-2 | Replace `console.error` in `ai/engine.ts:161` and `api-auth.ts:61` with logger | 10 min | Consistency |
| QW-3 | Remove 6 dead exports from domain layer | 15 min | Clean code |
| QW-4 | Replace `Record<string, any>` in onboarding with typed interface | 10 min | Type safety |
| QW-5 | Hardcoded `"Version 0.1.0 Beta"` in `footer.tsx:19` should be config/env | 5 min | Maintainability |

### Medium Effort (1-5 hours)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| ME-1 | Extract 7 document edit pages into single parameterized page | 2 hours | DRY, 477 lines saved |
| ME-2 | Consolidate remaining 3 TYPE_LABELS duplications | 1 hour | SSOT |
| ME-3 | Split `dashboard.ts` (814 lines) into focused modules | 2-3 hours | Simplicity |
| ME-4 | Extract CSV parser from `import-transactions.tsx` to utility | 20 min | Simplicity |
| ME-5 | Wrap `createContact`/`createProduct` number allocation in transactions | 1 hour | Sequence integrity |
| ME-6 | Wrap `initializeCompany` 5-step init in transaction | 1 hour | Atomicity |
| ME-7 | Extract `StatusBadge` and `ConfirmDialog` shared components | 1 hour | DRY |
| ME-8 | Bring French translations up to parity (110 missing keys) | 2 hours | i18n |
| ME-9 | Add AI mutation tools for contacts and products | 2-3 hours | Mission: AI-first |
| ME-10 | Add AI tools for accounting domain | 2-3 hours | Mission: AI-first |

### Strategic (5+ hours)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| ST-1 | Full RBAC enforcement (role checks in getSession, UI adaptation) | 8-12 hours | Enterprise readiness |
| ST-2 | Pre-commit hooks (Husky + lint-staged) | 2 hours | Automation |
| ST-3 | E2E test automation in CI | 10-15 hours | Quality assurance |
| ST-4 | Extend V1 API (banking, accounting, inventory) | 15-20 hours | Integration ecosystem |

---

## Phase 5: Functional Correctness

### Authentication & Authorization

- [x] NextAuth v5 with JWT strategy, credentials provider
- [x] `getSession()` validates companyId/userId, throws on unauthorized
- [x] JWT refresh on company switch reads fresh data from memberships table
- [x] Registration creates user + company + membership in transaction
- [x] Invitation acceptance is transactional
- [x] API tokens hashed with SHA-256
- [x] Password reset tokens expire in 1 hour
- [x] All 22 API routes have appropriate authentication
- [x] Middleware: deny-by-default for unauthenticated users, rate limiting
- [ ] **RBAC not enforced** — `getSession()` doesn't check `memberships.role`. A `viewer` can call `createDocumentAction`.

### Data Integrity

**All previous P0/P1 issues resolved:**

| Function | File | Transaction? | Status |
|----------|------|-------------|--------|
| `reconcileTransaction` | `banking.ts:362` | YES | **FIXED** — reconciliation + payment atomic |
| `resetPasswordAction` | `password-reset.ts:132` | YES | **FIXED** — password + token delete atomic |
| `createStockMovement` | `inventory.ts:335` | YES | Previously fixed |
| `removeMember` | `memberships.ts:111` | YES | Previously fixed |
| `updateMemberRole` | `memberships.ts:176` | YES | Previously fixed |
| `createDocument` | `documents.ts:394` | YES | Correct |
| `updateDocument` (items) | `documents.ts:541` | YES | Correct |
| `updateDocumentStatus` | `documents.ts:649` | YES | Correct |
| `recordPayment` | `documents.ts:757` | YES | Correct |
| `convertDocument` | `documents.ts:847` | YES | Correct |
| `createJournalEntry` | `accounting.ts:385` | YES | Correct |
| `createFiscalYear` | `accounting.ts:600` | YES | Correct |
| `closeFiscalYear` | `accounting.ts:661` | YES | Correct |
| `acceptInvitation` | `invitations.ts:165` | YES | Correct |
| `createDunning` | `dunning.ts:188` | YES | Correct |

**Remaining non-transactional multi-step operations:**

| Function | File | Severity | Notes |
|----------|------|----------|-------|
| `createContact` | `contacts.ts:249-293` | LOW | getNextNumber + insert — sequence gaps on failure |
| `createProduct` | `products.ts:210-254` | LOW | Same pattern as contacts |
| `createAccount` | `accounting.ts:88-116` | LOW | Duplicate check + insert TOCTOU (admin-only, low probability) |
| `importTransactions` | `banking.ts:262-276` | LOW | Insert + balance update — balance is cached |
| `initializeCompany` | `onboarding.ts:37-93` | MEDIUM | 5-step init not atomic — partial state on failure |

### Financial Correctness

- [x] `decimal.js` used in all financial calculations (`documents.ts`, `reports.ts`, `accounting.ts`, `dashboard.ts`)
- [x] VAT calculated at LINE ITEM level (Swiss standard)
- [x] Rappen rounding: `amount.times(20).round().div(20)` — correct
- [x] Document totals stored as strings (no float conversion)
- [x] `Number()` for VAT rate storage in settings — now validated with Zod `.refine()`
- [x] `parseFloat` only in display-only contexts (formatting quantities in `document-detail.tsx`, `pdf-generation.ts`)

### SQL Injection — Zero Risk

All queries use Drizzle ORM's parameterized query builder or tagged template literals (`sql\`...\``). Zero string interpolation in SQL. Zero raw queries.

### Tenant Isolation — Airtight

companyId filtering on ALL tenant-scoped queries — zero gaps across all 25 domain modules. Cross-table queries join through companyId-bearing parent tables.

---

## Phase 6: UI/UX & Responsive Design

### Scorecard

| Category | Score | Notes |
|----------|-------|-------|
| Responsive Layout | 7/10 | `sm:`/`md:`/`lg:` used well; no `xl:` breakpoints; some table gaps |
| Touch Targets | 8/10 | Sidebar/header excellent (`min-h-[44px]`); some small buttons remain |
| Loading States | 9/10 | 74 `loading.tsx` for 82 pages (90% coverage) |
| Error Boundaries | 9/10 | 12 `error.tsx` with Sentry integration |
| Empty States | 8/10 | Shared `EmptyState` component across 16+ pages |
| PageHeader Consistency | 6/10 | Only 12/82 pages use `PageHeader`; rest use inline headers |
| Accessibility | 8/10 | 53 ARIA labels, focus traps, semantic HTML, `sr-only` text |
| i18n Coverage | 7.5/10 | French 110 keys behind; de-CH 5 keys behind |
| Dark Mode | 7/10 | CSS variables via shadcn/ui; some hardcoded colors missing `dark:` variants |
| DRY Patterns | 6.5/10 | Status badge and confirm dialog patterns repeated across files |

### Key Findings

**PageHeader adoption (6/10)**: Only 12 of 82 page routes use the shared `PageHeader` component. The component is used on top-level list pages (contacts, products, documents, etc.) but not on detail pages, sub-pages, or form pages. While detail pages have legitimate reasons for custom layouts (back navigation), there's no consistent pattern.

**Responsive tables (7/10)**: Contact and product tables properly hide columns on mobile. Documents table and banking transaction table show all columns at every breakpoint with only `overflow-x-auto`. No horizontal scroll indicators.

**Accessibility strengths**: Custom `useFocusTrap` hook used in 12 components. `aria-current="page"` on active nav. Icons use `aria-hidden="true"`. `FormField` component provides `htmlFor`, `aria-describedby`, and `role="alert"` for errors. Dashboard layout uses semantic HTML (`<main>`, `<aside>`, `<header>`, `<nav>`, `<footer>`).

**DRY violations**: The inline status badge pattern (`bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400`) appears in 4+ locations. The confirm dialog with focus trap is duplicated in every selectable table. `document-list.tsx` has its own inline pagination instead of using the shared `Pagination` component.

**French translations**: 110 keys missing including `dashboard.priorities.*`, `dashboard.activity.*`, `dashboard.summary.*`, `settings.company.bankName`, `settings.company.iban`, and `common.exporting`.

---

## Action Items (Prioritized)

### P0 — None

All previous P0 items are resolved. No new P0 issues found.

### P1 — High Value

1. **Consolidate remaining 3 TYPE_LABELS duplications** — SSOT violations in `email.ts`, sequences page, project pages
2. **Extract 7 document edit pages into parameterized page** — 477 lines of copy-paste
3. **Add AI mutation tools** for contacts and products — Core "AI-first" promise
4. **Add AI tools for accounting** — Highest-value missing domain
5. **Bring French translations to parity** — 110 missing keys

### P2 — Polish & Hardening

6. **Remove 6 dead exports** from domain layer
7. **Replace `console.error` in `ai/engine.ts:161` and `api-auth.ts:61`** with logger
8. **Extract `StatusBadge` and `ConfirmDialog`** shared components
9. **Split `dashboard.ts`** (814 lines) into focused modules
10. **Wrap `initializeCompany`** in transaction (5-step init currently non-atomic)
11. **Wrap `createContact`/`createProduct`** number allocation in transactions
12. **Use shared `Pagination`** in `document-list.tsx`

### P3 — Strategic

13. RBAC enforcement system
14. Pre-commit hooks (Husky + lint-staged)
15. E2E test automation in CI
16. Extend V1 API coverage
17. Add `xl:` breakpoint optimizations for wide monitors

---

## Test Coverage Summary

| Test File | Tests | Domain |
|-----------|-------|--------|
| import-mappings.test.ts | 60 | CSV migration profiles |
| banking.test.ts | 57 | Banking, reconciliation |
| documents.test.ts | 55 | Document schemas, validation |
| reports.test.ts | 45 | Report calculations |
| status-transitions.test.ts | 42 | State machine |
| accounting.test.ts | 41 | Accounting logic |
| recurring-invoices.test.ts | 38 | Recurring invoices |
| camt-parser.test.ts | 35 | CAMT XML parsing |
| memberships.test.ts | 26 | Team roles, guards |
| swiss-currency.test.ts | 25 | Rappen rounding |
| invitations.test.ts | 24 | Invitation flow |
| calculate-totals.test.ts | 15 | Financial math |
| dunning.test.ts | 13 | Dunning levels |
| qr-reference.test.ts | 9 | QR reference |
| **Total** | **485** | |

**Domains without unit tests**: products CRUD, contacts CRUD, projects, inventory, pricing, number-sequences, dashboard, email.

---

*Previous audit (6th iteration) overall score: 8.1/10. Current score: **8.3/10**. All three P0/P1 data integrity items resolved (`reconcileTransaction` atomicity, `resetPasswordAction` atomicity, VAT rate parsing). No new P0 issues. Remaining work is code organization (DRY, god components), UI consistency (PageHeader, i18n), and strategic investments (RBAC, AI tools, E2E tests).*
