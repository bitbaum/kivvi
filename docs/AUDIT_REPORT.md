# Codebase Audit Report

**Date**: 2026-03-08
**Auditor**: Claude Code
**Branch**: main
**Commit**: 9449da1
**Audit iteration**: 5th
**Previous audit**: 2026-03-05 (4th iteration, commit e4c5791)

## Executive Summary

The Kivvi ERP codebase has **improved significantly** since the last audit. Seven commits addressed major findings: multi-tenancy is now committed and pushed, a REST API v1 is live, all document types have unified edit forms, dunning automation runs on a cron, and 75 new tests bring the total to **450 passing tests**. TypeScript strict mode reports 0 errors across all 6 packages, ESLint returns 0 warnings, and the production build succeeds.

Key improvements since last audit: bulkDeactivateContacts bug is fixed, V1 API routes now have Zod query validation, document edit pages use a shared `EditDocumentForm`, revalidatePath added to membership actions, and test coverage expanded to 13 test files.

Remaining high-priority findings: `createStockMovement` performs 4 operations across 3 tables without a transaction (data integrity risk), `removeMember` and `updateMemberRole` have TOCTOU race conditions on the last-owner guard, TYPE_LABELS are duplicated in 6+ locations (SSOT violation), and ~23 pages bypass the `PageHeader` component for inconsistent headers.

## Health Score

| Area | Score | Prev | Delta | Notes |
|------|-------|------|-------|-------|
| First Principles | 7.8/10 | 7.3 | +0.5 | Float on money mostly fixed, edit forms consolidated |
| Best Practices | 9.0/10 | 8.5 | +0.5 | 0 tsc/lint errors, Zod on V1 API, 450 tests |
| Mission Alignment | 8.6/10 | 9.5 | -0.9 | More honest scoring: RBAC not enforced, AI gaps remain |
| Functional Correctness | 7.5/10 | 8.0 | -0.5 | Found missing transactions in stock/memberships |
| UI/UX & Responsive | 7.9/10 | 8.2 | -0.3 | Header inconsistency (23 pages), touch target gaps |
| **Overall** | **8.2/10** | **8.3** | **-0.1** | More thorough audit found deeper issues |

---

## Phase 1: First Principles

### Ground Truth #1 — Software Serves Humans

**Score: 8/10**

- **Dead code**: Clean. Previous audit's `edit-form.tsx` has been properly removed and replaced by shared `EditDocumentForm`.
- **Loading states**: 75 `loading.tsx` files cover most routes. 9 pages missing (mostly new admin pages).
- **Error boundaries**: 12 `error.tsx` files with Sentry integration. Every major route group covered.
- **Empty states**: Consistent `EmptyState` component with context-aware messaging (search vs no data).

### Ground Truth #2 — One Source of Truth (SSOT)

**Score: 7/10**

- **FIXED**: `documentStatusValues` now derived from schema enum in V1 API routes (using `documentStatusEnum.enumValues`).
- **REMAINING**: TYPE_LABELS duplicated in 6+ locations:
  - `packages/core/src/domain/email.ts:22-32` (German document type labels)
  - `packages/ai/src/tools/convert-document.ts:26-35` (English labels)
  - `packages/ai/src/tools/create-document.ts:59-68` (English labels)
  - `apps/web/app/(dashboard)/contacts/[id]/page.tsx:49` (contact type labels)
  - `apps/web/app/(dashboard)/products/[id]/page.tsx:41` (product type labels)
  - `apps/web/app/(dashboard)/inventory/movements/page.tsx:40` (movement type labels)
- **REMAINING**: `parseFloat` for VAT rate in `apps/web/app/actions/settings.ts:57`
- **IMPROVED**: Financial display values use `.toNumber()` for display only (18 instances in dashboard.ts) — acceptable but inconsistent with decimal.js-everywhere policy.

### Ground Truth #3 — Design for Change

**Score: 8/10**

- **IMPROVED**: Edit pages now use shared `EditDocumentForm` component. However, 7 `page.tsx` files (477 lines total) still contain near-identical boilerplate differing only in type guard, breadcrumb, and redirect path. Could be further reduced to ~15 lines each via a shared helper.
- **EXCELLENT**: Multi-org architecture — `users.companyId` as pointer + `memberships` as SSOT means zero changes to 145+ server actions.
- **Config-driven**: Document type config is SSOT for UI behavior. Adding a doc type = 2 files (schema enum + config).

### Ground Truth #4 — Automate the Mechanical

**Score: 8/10**

- Number sequences, journal entries, QR references auto-generated.
- Dunning cron at `/api/cron/dunning` runs daily.
- Recurring invoice cron at `/api/cron/recurring-invoices`.
- CSV import with auto-detection profiles.
- **Gap**: No E2E test automation in CI (helpers exist, tests in development).

### Ground Truth #5 — Simplicity Scales

**Score: 7/10**

God components (>300 lines):

| File | Lines | Priority |
|------|-------|----------|
| `products/[id]/page.tsx` | 432 | P2 — Extract shared product form |
| `contacts/new/page.tsx` | 428 | P2 — Extract shared contact form |
| `StepDataImport.tsx` | 425 | P3 — Complex CSV wizard, acceptable |
| `money/page.tsx` | 410 | P3 — Dashboard with charts |
| `products/new/page.tsx` | 370 | P2 — Duplicates products/[id] |
| `contacts/[id]/page.tsx` | 359 | P2 — Duplicates contacts/new |
| `banking/[bankAccountId]/page.tsx` | 343 | P3 — Reasonable for complexity |
| `document-form.tsx` | 334 | OK — Was 593, properly split |
| `documents/page.tsx` | 333 | P3 — Document list page |
| `sidebar.tsx` | 330 | P3 — Complex but well-structured |

Key DRY issue: `contacts/new` (428 lines) and `contacts/[id]` (359 lines) share substantial form logic. Same for `products/new` (370) and `products/[id]` (432).

### Ground Truth #6 — Correctness Beats Speed

**Score: 9/10**

- **450 tests** across 13 files covering financial math, status transitions, QR references, import mappings, dunning, banking, memberships, invitations.
- All financial calculations use `decimal.js` with per-line VAT rounding.
- Rappen rounding correctly implemented: `amount.times(20).round().div(20)`.
- Parameterized queries everywhere — zero SQL injection risk.
- `companyId` filtering verified on ALL tenant-scoped queries.

---

## Phase 2: Best Practices

### Automated Checks

| Check | Result |
|-------|--------|
| `pnpm type-check` | 6/6 packages pass, 0 errors |
| `pnpm lint` | 0 warnings, 0 errors |
| `pnpm vitest run` | **450 tests passed** (13 test files) |
| `console.log` in production | None (only in e2e helpers — acceptable) |
| `@ts-ignore` / `@ts-expect-error` | 0 instances |
| `eslint-disable` | 1 instance in scripts/ — acceptable |
| Hardcoded VAT rates | Only in test files — correct |
| `any` types | 16 instances, all in infrastructure/adapter code. Core domain has 0. |
| ActionResult pattern | 191 occurrences across all 22 action files |
| revalidatePath after mutations | Present in all mutation actions (fixed memberships in this cycle) |
| getSession() in actions | All actions except auth/password-reset (correctly exempt) |
| Barrel import discipline | 0 `@kivvi/core` barrel imports in client components |

### Notable Best Practice Adherence

- **Schema-derived types**: All types use `$inferSelect`/`$inferInsert` from Drizzle schema
- **Server Action pattern**: Auth → Validate → Transaction → Domain → Revalidate → Return
- **Domain function pattern**: `(db, companyId, input)` — consistent across all 24 domain modules
- **Zod validation**: At all boundaries (server actions, V1 API list endpoints)

---

## Phase 3: Mission Alignment

| Area | Rating | Score | Evidence |
|------|--------|-------|----------|
| **AI-First ERP** | Partially | 7/10 | 16 tools across 6 domains. Gaps: accounting, recurring invoices, team management |
| **Swiss Compliance** | Fully | 9.5/10 | VAT config, QR-bill, Rappen rounding, KMU Kontenrahmen, CHF/de-CH |
| **Self-Service Migration** | Fully | 9/10 | 8 CSV mapping profiles, auto-detection, Swiss format handling |
| **Config-Driven UI** | Fully | 9.5/10 | document-types.ts drives all document behavior. Adding a type = config only |
| **Multi-Tenant Isolation** | Fully | 10/10 | companyId on every table, every query filters. Zero gaps found |
| **SaaS Readiness** | Partially | 6.5/10 | Team mgmt done, API tokens done. Missing: RBAC enforcement, payment processing, usage metering |

### AI Tool Coverage Gaps

| Domain | Tools | Status |
|--------|-------|--------|
| Contacts | search, details | Covered |
| Products | search | Covered (read-only) |
| Documents | search, details, create, update, convert, payment | Covered (6 tools) |
| Reports | financial summary, reports | Covered |
| Banking | summary | Partial (read-only) |
| Projects | search, details | Covered |
| Inventory | stock levels | Partial (read-only) |
| Dunning | list overdue | Partial |
| **Accounting** | **None** | **Gap — highest value missing domain** |
| **Recurring invoices** | **None** | **Gap** |
| **Team management** | **None** | **Gap** |

---

## Phase 4: Improvement Roadmap

### Changes Since Last Audit — Resolution Status

| Previous Finding | Status |
|-----------------|--------|
| P0: bulkDeactivateContacts hard delete BUG | **FIXED** |
| P0: banking.ts float arithmetic | **PARTIALLY FIXED** — most ops use Decimal, some `.toNumber()` remain |
| P1: Consolidate 7 document edit pages | **PARTIALLY FIXED** — shared `EditDocumentForm`, but 7 boilerplate page.tsx remain |
| P1: Table loading skeletons | **FIXED** — 75 loading.tsx files |
| P2: V1 API validation | **PARTIALLY FIXED** — list endpoints have Zod, POST/PATCH bodies don't |
| P2: Tests for memberships/invitations | **FIXED** — 50 new tests added |
| P2: Toast system | Existed already (sonner) — not flagged correctly in previous audit |

### Quick Wins (< 1 hour)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| QW-1 | Add `loading.tsx` to 4 new routes (team, api-tokens, data-repair, health) | 15 min | UX polish |
| QW-2 | Fix `.toNumber()` in `banking.ts:467` and `dunning.ts:128` — return strings | 15 min | Ground truth |
| QW-3 | Add Zod validation to V1 API `[id]` route PATCH bodies | 30 min | Defense in depth |
| QW-4 | Replace `console.error` in `api-auth.ts:61` with logger | 5 min | Consistency |
| QW-5 | Change main content `p-6` to `p-4 sm:p-6` in dashboard layout | 5 min | Mobile UX |

### Medium Effort (1-5 hours)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| ME-1 | Wrap `createStockMovement` in `db.transaction()` | 1 hour | **Data integrity** |
| ME-2 | Wrap `removeMember` and `updateMemberRole` in transactions | 1 hour | **Race condition fix** |
| ME-3 | Extract shared contact form (merge new + [id]) | 2-3 hours | DRY, ~400 lines saved |
| ME-4 | Extract shared product form (merge new + [id]) | 2-3 hours | DRY, ~400 lines saved |
| ME-5 | Add AI tools for accounting domain (search accounts, create journal entry) | 2-3 hours | Mission: AI-first |
| ME-6 | Migrate 23 pages to use `PageHeader` component | 2 hours | Consistency |
| ME-7 | Add RBAC enforcement in `getSession()` | 3-4 hours | Security |
| ME-8 | Add 110 missing French translation keys | 2-3 hours | i18n completeness |

### Strategic (5+ hours)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| ST-1 | Payment processing (Stripe integration) | 10-15 hours | SaaS commercialization |
| ST-2 | Full RBAC system (permission matrix, UI adaptation) | 8-12 hours | Enterprise readiness |
| ST-3 | Extend V1 API (banking, accounting, inventory, webhooks) | 15-20 hours | Integration ecosystem |
| ST-4 | E2E test coverage for new features | 10-15 hours | Quality assurance |
| ST-5 | Usage metering and plan enforcement | 10-15 hours | SaaS monetization |

---

## Phase 5: Functional Correctness

### Authentication & Authorization

- [x] NextAuth v5 with JWT strategy, credentials provider
- [x] `getSession()` validates companyId/userId, throws if unauthorized
- [x] JWT refresh on company switch reads fresh data from memberships table
- [x] Registration creates user + company + membership in single transaction
- [x] Invitation acceptance is transactional (membership + status + user update)
- [x] API tokens hashed with SHA-256, raw token returned only once
- [x] Password reset tokens expire in 1 hour
- [ ] **RBAC not enforced** — `getSession()` doesn't check `memberships.role`

### Critical Findings

**HIGH: `createStockMovement` missing transaction** (`inventory.ts:286-351`)
- Performs 4 operations across 3 tables: insert movement, upsert stock level, select level, update product
- Not wrapped in `db.transaction()`
- If `products.update` fails after movement insert, stock levels become inconsistent

**MEDIUM: Last-owner guard has TOCTOU race** (`memberships.ts:105-161, 167-222`)
- `removeMember` reads owner count, then deletes — no transaction
- Two concurrent calls for the last two owners could both pass the guard
- Same issue in `updateMemberRole` for demotion guard

**MEDIUM: V1 API POST/PATCH bodies lack Zod validation**
- `api/v1/contacts/route.ts:52`: `createContact(tx, ctx.companyId, body)` — body not validated
- Domain functions validate internally, but API errors are less informative
- Same pattern in documents and products routes

### Financial Correctness — VERIFIED

- [x] `calculateTotals` uses `decimal.js` throughout
- [x] VAT calculated at LINE ITEM level, not document total
- [x] Rappen rounding: `amount.times(20).round().div(20)` — correct
- [x] Document totals stored as strings (no float conversion in persistence)
- [x] Journal entry balance validation uses Decimal with 0.005 tolerance
- [x] All document operations (create, update, status, payment, conversion) use transactions

### Data Integrity — VERIFIED

- [x] companyId filtering present on ALL tenant-scoped queries — zero gaps found
- [x] Cross-table queries join through companyId-bearing parent tables
- [x] Token-based queries (invitations) correctly skip companyId filter
- [x] All critical multi-table document operations use `db.transaction()`

### Low-Severity Findings

- `documentId`, `tokenId` parameters not validated as UUID at action boundary (6 instances)
- Invitation tokens stored plaintext (not hashed like API tokens) — mitigated by 7-day expiry
- Password reset tokens stored plaintext — mitigated by 1-hour expiry
- `password-reset.ts:128-143`: password update + token delete not wrapped in transaction

---

## Phase 6: UI/UX & Responsive Design

### Scorecard

| Category | Score | Notes |
|----------|-------|-------|
| Responsive Layout | 8/10 | Mobile sidebar/header excellent; main padding `p-6` could be `p-4 sm:p-6` |
| Hardcoded Widths | 9/10 | All intentional (chart heights, truncation constraints) |
| Touch Targets | 7/10 | Major buttons 44px. Gaps: drag handles, checkboxes, filter links |
| Table Responsiveness | 7.5/10 | All wrapped in `overflow-x-auto`; column hiding partial |
| Loading States | 8.5/10 | 75 `loading.tsx` files; 9 newer pages missing |
| Error Boundaries | 9.5/10 | 12 files, Sentry integration, localized messages, retry |
| Empty States | 9/10 | Consistent component, context-aware messaging |
| Form Usability | 9/10 | Labels, ARIA, validation feedback, loading spinners |
| Skeletons | 9/10 | Reusable library (detail, form, report), 75 usage sites |
| Dark Mode | 8/10 | Full infrastructure via CSS variables; some hardcoded colors |
| Header Consistency | 5.5/10 | **~23 pages bypass `PageHeader`**; size inconsistencies in settings |
| Accessibility | 8.5/10 | ARIA labels, focus-visible, keyboard nav, semantic HTML |

### Key Findings

1. **Header inconsistency** (5.5/10): `PageHeader` component exists and is used by 11 list pages, but ~23 pages (detail, form, report, settings) use inline `<h1>` with varying sizes (`text-3xl` vs `text-2xl`).

2. **Touch targets below 44px**:
   - `sortable-line-item.tsx:41-49`: Drag handle has no min-size constraint
   - `selectable-contact-table.tsx:117,162`: Checkboxes at `h-4 w-4` (16px)
   - `contacts/page.tsx:276-287`: TypeFilterLink at `px-3 py-1.5` (~30px height)

3. **Missing loading.tsx**: `reports/health`, `settings/team`, `settings/data-repair`, `settings/api-tokens`, `(onboarding)/onboarding`

4. **Reduced motion**: Only chat widget uses `motion-reduce:transition-none`. Other animated components don't respect `prefers-reduced-motion`.

---

## Action Items (Prioritized)

### P0 — Fix Before Next Release

1. **Wrap `createStockMovement` in `db.transaction()`** — Data integrity risk
   - File: `packages/core/src/domain/inventory.ts:286-351`
   - Effort: 1 hour

2. **Wrap `removeMember` and `updateMemberRole` in transactions** — Race condition
   - File: `packages/core/src/domain/memberships.ts:105-161, 167-222`
   - Effort: 1 hour

### P1 — High Value

3. **Extract TYPE_LABELS to shared config** — Eliminate 6+ duplicated label maps
4. **Add Zod validation to V1 API POST/PATCH bodies** — Defense in depth
5. **Add `loading.tsx` to 5 new routes** — UX polish
6. **Extract shared contact form** — Reduce ~400 lines duplication
7. **Extract shared product form** — Reduce ~400 lines duplication

### P2 — Polish & Hardening

8. **Migrate 23 pages to `PageHeader`** — Consistency
9. **Add RBAC enforcement** — Gate admin operations by role
10. **Add AI tools for accounting domain** — Mission alignment
11. **Fix touch targets** — Drag handles, checkboxes, filter links
12. **Add missing French translations** — 110 keys

### P3 — Strategic

13. Payment processing integration
14. Full RBAC system
15. Extend V1 API coverage
16. E2E test automation
17. Usage metering

---

### Test Coverage Summary

| Test File | Tests | Domain |
|-----------|-------|--------|
| import-mappings.test.ts | 60 | CSV migration |
| documents.test.ts | 55 | Document schemas |
| reports.test.ts | 45 | Report calculations |
| banking.test.ts | 57 | Banking, reconciliation |
| status-transitions.test.ts | 42 | State machine |
| accounting.test.ts | 41 | Accounting logic |
| recurring-invoices.test.ts | 38 | Recurring invoices |
| memberships.test.ts | 26 | Team roles, guards |
| swiss-currency.test.ts | 25 | Rappen rounding |
| invitations.test.ts | 24 | Invitation flow |
| calculate-totals.test.ts | 15 | Financial math |
| dunning.test.ts | 13 | Dunning levels |
| qr-reference.test.ts | 9 | QR reference |
| **Total** | **450** | |

**Domains without tests**: products, contacts (CRUD), projects, inventory, pricing, number-sequences, dashboard, email.

---

*Previous audit (2026-03-05) overall score: 8.3/10. Current score: 8.2/10. The slight dip reflects discovery of missing transactions in stock movements and membership operations (previously not flagged). The codebase has materially improved: 75 new tests, V1 API hardened, document edit forms consolidated, several bugs fixed.*
