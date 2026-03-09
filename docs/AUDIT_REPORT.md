# Codebase Audit Report

**Date**: 2026-03-09
**Auditor**: Claude Code
**Branch**: main
**Commit**: 7c9d7d2
**Audit iteration**: 6th
**Previous audit**: 2026-03-08 (5th iteration, commit 9449da1)

## Executive Summary

The Kivvi ERP codebase has **improved materially** since the last audit. Six commits addressed critical findings: `createStockMovement`, `removeMember`, and `updateMemberRole` now use `db.transaction()` (resolving the P0 data integrity and TOCTOU issues), TYPE_LABELS for contacts, products, and movements have been consolidated into SSOT config files, and shared `ContactForm` and `ProductForm` components eliminate ~800 lines of duplication. A major new feature — CAMT.053/054 bank statement import — adds 35 new tests (total: **485 passing tests** across 14 test files), ISO 20022 XML parsing, dedup by entry reference, and a full preview-then-import UI with i18n in three languages.

TypeScript strict mode reports 0 errors across all 6 packages, ESLint returns 0 warnings, the production build succeeds, and all 485 tests pass. Zero `@ts-ignore`, zero `eslint-disable` in application code.

Remaining findings: TYPE_LABELS still duplicated in 3 locations (down from 6+), `parseFloat` for VAT rate in settings.ts, `reconcileTransaction` has an atomicity gap, ~50+ pages bypass the `PageHeader` component, 15 god components exceed 300 lines, and AI tool coverage has significant gaps (no mutation tools for contacts/products, no accounting tools).

## Health Score

| Area | Score | Prev | Delta | Notes |
|------|-------|------|-------|-------|
| First Principles | 8.0/10 | 7.8 | +0.2 | Transaction fixes, SSOT consolidation, shared forms |
| Best Practices | 8.7/10 | 9.0 | -0.3 | More granular scoring; naming deviation documented |
| Mission Alignment | 8.5/10 | 8.6 | -0.1 | CAMT import excellent; AI gaps still significant |
| Functional Correctness | 8.5/10 | 7.5 | +1.0 | All 3 P0 transaction issues fixed |
| UI/UX & Responsive | 7.0/10 | 7.9 | -0.9 | Deeper audit: 50+ pages bypass PageHeader, table gaps |
| **Overall** | **8.1/10** | **8.2** | **-0.1** | More thorough audit; real improvement masked by stricter scoring |

---

## Phase 1: First Principles

### Ground Truth #1 — Software Serves Humans

**Score: 8/10**

- **FIXED**: Shared `ContactForm` and `ProductForm` components extracted, eliminating ~800 lines of form duplication.
- **Loading states**: 75 `loading.tsx` files covering 84 page routes (89% coverage).
- **Error boundaries**: 12 `error.tsx` files with Sentry integration at every major route group.
- **Empty states**: Consistent `EmptyState` component used across 16+ pages.
- **Dead exports**: 9 functions exported but never imported anywhere:
  - `getAccount` (accounting.ts), `shouldShowUpgradeBanner` (billing.ts), `getDunningHistory` (dunning.ts)
  - `bulkInsertContactAddresses`, `bulkInsertProjects` (import-bulk.ts)
  - `getStockLevelsByProduct`, `listSerialNumbers` (inventory.ts)
  - `listManufacturers`, `listProductGroups` (products.ts)

### Ground Truth #2 — One Source of Truth (SSOT)

**Score: 7.5/10** (up from 7.0)

- **FIXED**: TYPE_LABELS for contacts, products, movements consolidated into SSOT config files under `apps/web/lib/config/`.
- **REMAINING (3 locations)**:
  - `packages/core/src/domain/email.ts:22-31` — Hardcoded German document type labels (should use config)
  - `apps/web/app/(dashboard)/settings/sequences/page.tsx:18-27` — Inline TYPE_LABELS for sequence types
  - `apps/web/app/(dashboard)/projects/page.tsx:32-37` and `projects/[id]/page.tsx:36-41` — Duplicated project STATUS_LABELS, despite `lib/config/project-status.ts` already containing `PROJECT_STATUS_LABEL_KEYS`
- **REMAINING**: `parseFloat(parsed.data.defaultVatRate)` in `apps/web/app/actions/settings.ts:57`
- **Types**: All 38 entity types properly derived from Drizzle schema using `$inferSelect`/`$inferInsert`
- **`any` types**: Only 5 instances, all in AI provider code at external API boundaries

### Ground Truth #3 — Design for Change

**Score: 8/10**

- **FIXED**: Contact and product forms extracted to shared components.
- **REMAINING**: 7 near-identical document edit pages (477 lines total) differing only in type guard, breadcrumb, and redirect path. Could be a single parameterized page.
- **EXCELLENT**: Unified document model + config-driven UI. Adding a document type = 2-3 files.
- **EXCELLENT**: Multi-org architecture requires zero changes to 145+ server actions.

### Ground Truth #4 — Automate the Mechanical

**Score: 8.5/10**

- Number sequences, journal entries, QR references auto-generated.
- Dunning and recurring invoice cron jobs in production.
- CSV import with auto-detection profiles.
- **NEW**: CAMT.053/054 XML import with dedup by entry reference.
- **Gap**: No E2E test suite in CI, no pre-commit hooks.

### Ground Truth #5 — Simplicity Scales

**Score: 7.5/10**

15 components exceed 300 lines:

| File | Lines | Notes |
|------|-------|-------|
| `products/[id]/page.tsx` | 430 | Detail page with 5 cards |
| `StepDataImport.tsx` | 425 | Complex CSV wizard, acceptable |
| `banking/[bankAccountId]/import-transactions.tsx` | 415 | NEW — mixes UI + CSV parser |
| `money/page.tsx` | 410 | 3 tabs in one file |
| `contacts/contact-form.tsx` | 406 | Complex form, acceptable |
| `contacts/[id]/page.tsx` | 355 | Detail page |
| `products/product-form.tsx` | 353 | Complex form, acceptable |
| `banking/[bankAccountId]/page.tsx` | 343 | Detail + helpers |
| `settings/company/company-form.tsx` | 342 | Complex form |
| `settings/recurring-invoices/recurring-config-form.tsx` | 341 | Complex form |
| `documents/page.tsx` | 333 | Hub with filters |
| `sidebar.tsx` | 330 | Complex but well-structured |
| `projects/[id]/page.tsx` | 328 | Detail page |
| `data-repair/data-repair-panel.tsx` | 307 | Admin utility |
| `products/selectable-product-table.tsx` | 306 | Selection table |

Domain layer: `dashboard.ts` at 814 lines is the most concerning non-script file — mixes alerts, stats, health metrics, activity items, and executive summaries. Should be split.

### Ground Truth #6 — Correctness Beats Speed

**Score: 8.5/10**

- **FIXED**: `createStockMovement` wrapped in `db.transaction()` (inventory.ts:335)
- **FIXED**: `removeMember` wrapped in `db.transaction()` (memberships.ts:111)
- **FIXED**: `updateMemberRole` wrapped in `db.transaction()` (memberships.ts:176)
- **485 tests** across 14 files covering all critical business logic
- Financial calculations use `decimal.js` with per-line VAT rounding
- Rappen rounding correctly implemented
- Parameterized queries everywhere — zero SQL injection risk
- `companyId` filtering verified on ALL tenant-scoped queries
- **REMAINING**: `resetPasswordAction` password update + token delete not in transaction (password-reset.ts:132-143)

---

## Phase 2: Best Practices

### Automated Checks

| Check | Result |
|-------|--------|
| `pnpm type-check` | 6/6 packages pass, 0 errors |
| `pnpm lint` | 0 warnings, 0 errors |
| `pnpm test` | **485 tests passed** (14 test files) |
| `pnpm build` | Production build succeeds |
| `console.log` in production | 1 instance in `packages/ai/src/engine.ts:161` — should use logger |
| `@ts-ignore` / `@ts-expect-error` | 0 instances |
| `eslint-disable` | 0 instances in application code |
| `any` types | 5 instances, all in AI provider code (justified) |
| ActionResult pattern | Consistent across all 24 action files |
| getSession() in actions | All actions except auth/password-reset (correctly exempt) |
| Barrel import discipline | 0 `@kivvi/core` barrel imports in client components |

### Server Action Pattern Compliance

All Server Actions follow the prescribed pattern: `'use server'` → `getSession()` → Zod validate → `db.transaction()` → domain function → `revalidatePath()` → return `ActionResult<T>`.

**Minor finding**: `createContact` and `createProduct` domain functions perform `getNextNumber()` + `insert()` without wrapping in a transaction. If the insert fails, the number sequence has a gap. Document creation correctly uses transactions for this.

### API Route Security

All 22 API routes verified with proper authentication:
- Dashboard API routes: `auth()` session check
- V1 API routes: `authenticateApi()` (Bearer token or session)
- Cron routes: `CRON_SECRET` Bearer token
- Webhooks: Stripe signature verification

### Naming Convention

Component files use `kebab-case.tsx` consistently (50+ files), while CLAUDE.md documents `PascalCase.tsx`. The codebase is internally consistent — the documented standard should be updated to match reality. All other naming conventions (hooks, actions, constants, types) are correctly applied.

---

## Phase 3: Mission Alignment

| Area | Rating | Score | Evidence |
|------|--------|-------|----------|
| **Swiss Compliance** | Fully | 10/10 | VAT config (not hardcoded), QR-bill generation, Rappen rounding, KMU Kontenrahmen (227 accounts), CHF/de-CH locale, CAMT.053/054 import |
| **Unified Document Model** | Fully | 10/10 | 9 doc types share 1 table, 1 CRUD set, config-driven UI |
| **Multi-Tenant Isolation** | Fully | 10/10 | companyId on every table, every query filters. Zero gaps across 25 domain modules |
| **Self-Service Migration** | Fully | 9/10 | 8 CSV mapping profiles + NEW CAMT.053/054 XML import with dedup |
| **Config-Driven UI** | Fully | 9.5/10 | document-types.ts drives behavior. Adding a type = config only |
| **AI-First ERP** | Partially | 6/10 | 16 tools across 6 domains. Major gaps in mutations and accounting |

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

The "AI-first" vision claims AI tools call the same domain functions as the UI. In practice, only documents have full CRUD AI tools. Contacts and products lack mutation tools. Accounting — the highest-value ERP domain — has zero AI tools.

### CAMT Import — New Feature Assessment

The new CAMT parser (`packages/core/src/domain/camt-parser.ts`, 269 lines) follows the exact same pure-function pattern as `import-mappings.ts`:
- Zero DB imports — pure XML parsing
- Handles both camt.053 (statements) and camt.054 (notifications)
- Supports v04 + v08 Swiss bank schemas via namespace stripping
- Extracts QR references for auto-matching
- 35 comprehensive tests with inline XML fixtures
- Clean integration: parser → domain orchestrator → server actions → preview UI

This is a textbook example of how to add import capabilities.

---

## Phase 4: Improvement Roadmap

### Changes Since Last Audit — Resolution Status

| Previous Finding | Status |
|-----------------|--------|
| P0: `createStockMovement` missing transaction | **FIXED** (inventory.ts:335) |
| P0: `removeMember` TOCTOU race condition | **FIXED** (memberships.ts:111) |
| P0: `updateMemberRole` TOCTOU race condition | **FIXED** (memberships.ts:176) |
| P1: TYPE_LABELS duplicated in 6+ locations | **PARTIALLY FIXED** — down to 3 locations |
| P1: Extract shared contact form | **FIXED** — `ContactForm` component extracted |
| P1: Extract shared product form | **FIXED** — `ProductForm` component extracted |
| P2: `parseFloat` for VAT rate in settings.ts | Not fixed |
| P2: Migrate ~23 pages to PageHeader | Not fixed (now ~50+ with deeper counting) |

### Quick Wins (< 1 hour)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| QW-1 | Replace `parseFloat` with string storage for VAT rate in `settings.ts:57` | 15 min | Ground truth #2 |
| QW-2 | Replace `console.error` in `ai/engine.ts:161` with logger | 5 min | Consistency |
| QW-3 | Use existing `PROJECT_STATUS_LABEL_KEYS` config in 2 project pages | 15 min | SSOT |
| QW-4 | Extract CSV parser from `import-transactions.tsx` to utility file | 20 min | Simplicity |
| QW-5 | Fix import modal close button touch target (`p-1` → `p-2`) | 5 min | Mobile UX |
| QW-6 | Remove 9 dead exports from domain layer | 15 min | Clean code |

### Medium Effort (1-5 hours)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| ME-1 | Wrap `reconcileTransaction` in `db.transaction()` | 1 hour | Data integrity |
| ME-2 | Extract 7 document edit pages into single parameterized page | 2 hours | DRY, 477 lines saved |
| ME-3 | Consolidate remaining 3 TYPE_LABELS duplications | 1 hour | SSOT |
| ME-4 | Split `dashboard.ts` (814 lines) into focused modules | 2-3 hours | Simplicity |
| ME-5 | Make `PageHeader` responsive + migrate ~50 pages to use it | 3-4 hours | UI consistency |
| ME-6 | Add AI mutation tools for contacts and products | 2-3 hours | Mission: AI-first |
| ME-7 | Add AI tools for accounting domain | 2-3 hours | Mission: AI-first |
| ME-8 | Wrap `createContact`/`createProduct` number allocation in transactions | 1 hour | Sequence integrity |

### Strategic (5+ hours)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| ST-1 | Full RBAC enforcement (role checks in getSession, UI adaptation) | 8-12 hours | Enterprise readiness |
| ST-2 | Extend V1 API (banking, accounting, inventory) | 15-20 hours | Integration ecosystem |
| ST-3 | E2E test automation in CI | 10-15 hours | Quality assurance |
| ST-4 | Payment processing (Stripe integration) | 10-15 hours | SaaS commercialization |

---

## Phase 5: Functional Correctness

### Authentication & Authorization — SOLID

- [x] NextAuth v5 with JWT strategy, credentials provider
- [x] `getSession()` validates companyId/userId, throws on unauthorized
- [x] JWT refresh on company switch reads fresh data from memberships table
- [x] Registration creates user + company + membership in transaction
- [x] Invitation acceptance is transactional
- [x] API tokens hashed with SHA-256
- [x] Password reset tokens expire in 1 hour
- [x] All 22 API routes have appropriate authentication
- [x] Middleware: deny-by-default for unauthenticated users, rate limiting
- [ ] **RBAC not enforced** — `getSession()` doesn't check `memberships.role`

### Data Integrity — MUCH IMPROVED

Previously flagged P0 issues all resolved:
- [x] `createStockMovement` now uses `db.transaction()` (inventory.ts:335)
- [x] `removeMember` now uses `db.transaction()` (memberships.ts:111)
- [x] `updateMemberRole` now uses `db.transaction()` (memberships.ts:176)

**REMAINING**:

**MEDIUM: `reconcileTransaction` atomicity gap** (`banking.ts:337-387`)
- Marks transaction as reconciled (step 3), then calls `recordPayment()` (step 4)
- If `recordPayment()` fails, the error is swallowed (line 381) — transaction stays reconciled but no payment recorded
- Should wrap steps 3-4 in a single `db.transaction()`, or roll back reconciliation on payment failure

**LOW: `importTransactions` balance update not atomic** (`banking.ts:262-276`)
- Transaction insert and balance update are separate operations
- Balance is a cached convenience field; low severity

**LOW: `resetPasswordAction` not atomic** (`password-reset.ts:132-143`)
- Password update and token deletion are separate operations

### Financial Correctness — VERIFIED

- [x] `calculateTotals` uses `decimal.js` throughout
- [x] VAT calculated at LINE ITEM level (Swiss standard)
- [x] Rappen rounding: `amount.times(20).round().div(20)` — correct
- [x] Document totals stored as strings (no float conversion)
- [x] All document operations use `db.transaction()`
- [x] Number sequences use atomic `UPDATE...RETURNING` (race-safe)

### Tenant Isolation — AIRTIGHT

- [x] companyId filtering on ALL tenant-scoped queries — zero gaps found across all 25 domain modules
- [x] Cross-table queries join through companyId-bearing parent tables
- [x] `bankTransactions` queries verify bank account ownership via `bankAccounts.companyId`

---

## Phase 6: UI/UX & Responsive Design

### Scorecard

| Category | Score | Notes |
|----------|-------|-------|
| Mobile-First Layout | 7/10 | Good breakpoint usage; some data tables lack column hiding |
| Touch Targets | 8/10 | Sidebar/header excellent (min-h-[44px]); some small buttons remain |
| Layout Patterns | 8/10 | Consistent responsive grids; exemplary card-to-row patterns |
| Loading States | 9/10 | 75 loading.tsx for 84 pages (89% coverage) |
| Error Boundaries | 9/10 | 12 error.tsx with Sentry integration |
| Empty States | 8/10 | Shared EmptyState component; 4 pages use inline variants |
| PageHeader Consistency | 5/10 | Only 14/80+ pages use PageHeader; ~50+ roll their own `<h1>` |
| God Components | 6/10 | 15 components >300 lines |
| Accessibility | 7.5/10 | 109 ARIA attributes, semantic HTML, focus-visible states |
| Dark Mode | 8/10 | Full CSS variable infrastructure |

### Key Findings

**F6-09 (Significant): ~50+ pages bypass PageHeader.** Only 14 pages use the shared `PageHeader` component. The remaining use inline `<h1>` with varying sizes (`text-3xl` vs `text-2xl` in settings). This prevents standardized action slots and responsive behavior.

**F6-01 (Medium): Documents hub table not responsive.** `documents/page.tsx:249-309` shows all 5-6 columns at every breakpoint with only `overflow-x-auto`. Contact and product tables properly hide columns on mobile — documents table should follow the same pattern.

**F6-08 (Medium): PageHeader itself is not responsive.** Uses `flex items-center justify-between` without wrapping. Long titles + action buttons will overflow on narrow screens. Should use `flex flex-col gap-4 sm:flex-row sm:items-center`.

**F6-14 (Medium): Import modal not optimized for mobile.** Uses `max-w-3xl` without margin, hitting viewport edges on phones. Should use `w-full max-w-3xl mx-4` or full-screen pattern on mobile.

**F6-11 (Medium): `import-transactions.tsx` mixes UI + CSV parser.** The CSV parser (lines 343-415) is a pure function that should be in a utility file, reducing the component to ~340 lines and making the parser independently testable.

**F6-04 (Medium): Small touch targets.** Team page dismiss buttons are 16x16px (settings/team/page.tsx:136). Import modal close button at `p-1` is ~24x24px. Reconcile buttons use `px-2 py-1 text-xs`.

---

## Action Items (Prioritized)

### P0 — Fix Before Next Release

1. **Wrap `reconcileTransaction` in `db.transaction()`** — Atomicity gap between reconciliation and payment recording
   - File: `packages/core/src/domain/banking.ts:337-387`
   - Effort: 1 hour

### P1 — High Value

2. **Consolidate remaining 3 TYPE_LABELS duplications** — SSOT violations in email.ts, sequences page, project pages
3. **Replace `parseFloat` for VAT rate** in `settings.ts:57` — Feeds into financial calculations
4. **Extract 7 document edit pages into parameterized page** — 477 lines of copy-paste
5. **Add AI mutation tools** for contacts and products — Core "AI-first" promise
6. **Add AI tools for accounting** — Highest-value missing domain

### P2 — Polish & Hardening

7. **Make PageHeader responsive + migrate ~50 pages** — UI consistency
8. **Split `dashboard.ts`** (814 lines) into focused modules
9. **Extract CSV parser** from import-transactions.tsx to utility
10. **Remove 9 dead exports** — Clean code
11. **Fix small touch targets** — Team dismiss buttons, modal close, reconcile buttons
12. **Add responsive column hiding** to documents and import preview tables

### P3 — Strategic

13. RBAC enforcement system
14. Extend V1 API coverage
15. E2E test automation in CI
16. Payment processing integration

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
| **camt-parser.test.ts** | **35** | **NEW — CAMT XML parsing** |
| memberships.test.ts | 26 | Team roles, guards |
| swiss-currency.test.ts | 25 | Rappen rounding |
| invitations.test.ts | 24 | Invitation flow |
| calculate-totals.test.ts | 15 | Financial math |
| dunning.test.ts | 13 | Dunning levels |
| qr-reference.test.ts | 9 | QR reference |
| **Total** | **485** | **+35 from last audit** |

**Domains without unit tests**: products CRUD, contacts CRUD, projects, inventory, pricing, number-sequences, dashboard, email.

---

*Previous audit (2026-03-08) overall score: 8.2/10. Current score: 8.1/10. All three P0 issues from the previous audit are resolved. The slight dip reflects more thorough UI/UX analysis revealing 50+ pages bypassing PageHeader (previously counted as ~23) and deeper scrutiny on responsive table design. The codebase has materially improved: shared form components extracted, SSOT config consolidated, CAMT import adds critical Swiss banking capability, and 35 new tests bring coverage to 485.*
