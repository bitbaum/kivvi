# Codebase Audit Report

**Date**: 2026-03-17
**Auditor**: Claude Code (Opus 4.6)
**Branch**: main
**Commit**: 636c107
**Audit iteration**: 10th
**Previous audit**: 2026-03-13 (9th iteration, commit 636c107)

## Executive Summary

This audit covers changes since the 9th iteration: 6 AI integration gaps filled (complete audit coverage, model/token persistence, per-company AI settings, dead code removal, paperclip button removal, UIAction rendering). All automated quality gates pass: TypeScript strict mode reports **0 errors** across 6 packages, ESLint returns **0 warnings/errors**, and all **654 tests** pass across 21 test files.

The codebase maintains its strong position at **8.9/10** overall. One new SSOT finding surfaced: status enum values duplicated in `document-list.tsx:27` using camelCase (`partiallyPaid`) while schema uses snake_case (`partially_paid`) — a latent bug risk. The AI subsystem is now fully wired with per-company provider settings, complete audit trail coverage (12 write tools), and model/token tracking on messages.

No P0 issues. Previous P1 items (LogoUpload extraction, focus-visible, semantic HTML) remain open. New P1: status enum SSOT violation.

## Health Score

| Area                   | Score      | Prev    | Delta | Notes                                                         |
| ---------------------- | ---------- | ------- | ----- | ------------------------------------------------------------- |
| First Principles       | 9.0/10     | 9.0     | =     | Status enum SSOT issue found; offset by AI audit completeness |
| Best Practices         | 9.5/10     | 9.5     | =     | All automated checks pass, 74 requireRole instances           |
| Mission Alignment      | 9.2/10     | 9.0     | +0.2  | Per-company AI settings wired, 12/12 write tools audited      |
| Functional Correctness | 9.0/10     | 9.0     | =     | All new changes verified correct                              |
| UI/UX & Responsive     | 8.0/10     | 8.0     | =     | company-form.tsx grew to 577 lines (AI config section)        |
| **Overall**            | **8.9/10** | **8.9** | **=** | AI integration gaps filled; SSOT finding offsets improvement  |

---

## Phase 1: First Principles

### Ground Truth #1 — Software Serves Humans

**Score: 9/10** (unchanged)

- Loading states: 75 `loading.tsx` files covering 82 page routes (91% coverage).
- Error boundaries: 12 `error.tsx` files + 1 `global-error.tsx`.
- Empty states: Shared `EmptyState` component used across 10+ pages.
- Chat widget: Paperclip button removed (was non-functional), UIActions now render as styled links instead of raw JSON.
- AI Configuration section added to company settings — users can now configure their own AI provider.

### Ground Truth #2 — One Source of Truth (SSOT)

**Score: 8.5/10** (unchanged)

- **Types**: All entity types derived from Drizzle schema via `$inferSelect`/`$inferInsert`. Zero standalone type definitions.
- **`as any` types**: 15 total. All justified (6 AI provider boundaries, 4 NextAuth adapter, 2 DB config, 3 scripts).
- **`@ts-ignore`**: 0 instances. **`@ts-expect-error`**: 0 instances.
- **`eslint-disable`**: 1 (justified: base64 data URI in `company-form.tsx:162`).

**NEW FINDING — Status Enum SSOT Violation:**

| Location                                             | Format        | Example                                                       |
| ---------------------------------------------------- | ------------- | ------------------------------------------------------------- |
| `packages/database/src/schema.ts:40-52`              | snake_case    | `partially_paid`, `dunning_1`                                 |
| `apps/web/app/actions/documents.ts:29-41`            | snake_case    | `partially_paid`, `dunning_1` (matches schema but duplicated) |
| `apps/web/components/documents/document-list.tsx:27` | **camelCase** | `partiallyPaid`, `dunning1`                                   |

The document-list component uses camelCase status values that don't match the database enum. This is likely used for i18n key lookup (not direct DB comparison), but creates confusion and risks bugs if anyone uses these values in a query. The action file duplicates the schema enum instead of deriving from `documentStatusEnum.enumValues`.

### Ground Truth #3 — Design for Change

**Score: 9/10** (unchanged)

- Adding a document type = 2-3 files. Passes the litmus test.
- 15 config files in `apps/web/lib/config/`.
- 7 document edit pages use shared `EditDocumentPage` component.

**Large domain files (2, unchanged):**

| File             | Lines | Assessment                                                       |
| ---------------- | ----- | ---------------------------------------------------------------- |
| `documents.ts`   | 1004  | Unified document model — cohesive around single entity           |
| `import-bulk.ts` | 912   | Bulk import for 11 entity types — cohesive around import concern |

### Ground Truth #4 — Automate the Mechanical

**Score: 9.5/10** (unchanged)

- Pre-commit hooks: Husky + lint-staged configured.
- CI/CD: `.github/workflows/ci.yml` with lint, typecheck, build, test jobs.
- AI audit trail: Now covers all 12 write tools (was 4).
- **Gap**: No E2E tests (Playwright setup exists but no test suites).

### Ground Truth #5 — Simplicity Scales

**Score: 8.5/10** (unchanged)

**Large components (notable):**

| File                  | Lines | Assessment                                                                |
| --------------------- | ----- | ------------------------------------------------------------------------- |
| `company-form.tsx`    | 577   | Grew from 499 (AI config section added). Extract LogoUpload + AI section. |
| `StepDataImport.tsx`  | 428   | CSV import wizard. Complex but cohesive.                                  |
| `document-detail.tsx` | 421   | Read-only detail with 7 sections.                                         |

### Ground Truth #6 — Correctness Beats Speed

**Score: 9/10** (unchanged)

- **654 tests** across 21 test files. All pass.
- Financial calculations use `decimal.js` with per-line VAT rounding.
- Rappen rounding correctly implemented.
- `companyId` filtering on ALL tenant-scoped queries — zero gaps.
- RBAC: `requireRole()` enforced on 74 mutations across all action files.
- **NEW**: AI audit trail now covers 12/12 write tools. Model and tokenCount saved on assistant messages.

---

## Phase 2: Best Practices

### Automated Checks

| Check                             | Result                                                   |
| --------------------------------- | -------------------------------------------------------- |
| `pnpm type-check`                 | 6/6 packages pass, 0 errors                              |
| `pnpm lint`                       | 0 warnings, 0 errors                                     |
| `pnpm test`                       | **654 tests passed** (21 test files)                     |
| `@ts-ignore` / `@ts-expect-error` | 0 instances                                              |
| `eslint-disable`                  | 1 (justified: base64 data URI in `company-form.tsx:162`) |
| `console.log/error` in production | 0 (only in logger.ts, env.ts startup, CLI scripts)       |

### Server Action Pattern Compliance

All Server Action files follow the prescribed pattern: `getSession()` → validate → transaction → domain function → `revalidatePath()` → return `ActionResult<T>`.

### RBAC Enforcement

74 `requireRole()` instances across action files. Destructive operations require `admin`, standard mutations require `member`.

### Barrel Import Discipline

Zero `'use client'` files import from `@kivvi/core` barrel.

---

## Phase 3: Mission Alignment

| Area                       | Rating    | Score  | Evidence                                                                       |
| -------------------------- | --------- | ------ | ------------------------------------------------------------------------------ |
| **Swiss Compliance**       | Excellent | 10/10  | VAT config, QR-bill, Rappen rounding, KMU Kontenrahmen, CHF/de-CH, CAMT import |
| **Unified Document Model** | Excellent | 10/10  | 9 doc types, 1 table, 1 CRUD set, config-driven UI                             |
| **Multi-Tenant Isolation** | Excellent | 10/10  | companyId on every table, every query. Zero gaps.                              |
| **Self-Service Migration** | Excellent | 9/10   | 11 CSV mapping profiles + CAMT.053/054 XML with dedup                          |
| **Config-Driven UI**       | Excellent | 9.5/10 | 15 config files drive behavior; adding a document type = config only           |
| **AI-First ERP**           | Excellent | 9/10   | 27 tools, 12/12 write tools audited, per-company AI settings wired             |
| **i18n**                   | Excellent | 9/10   | 3 locales at parity: de-CH (1579), en (1584), fr (1586 lines)                  |

### AI Integration — Changes Since Last Audit

| Change                                                      | Status                                                |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| Complete audit coverage (12 write tools in WRITE_TOOLS map) | **DONE**                                              |
| Save model + tokenCount on assistant messages               | **DONE**                                              |
| Per-company AI settings (provider, model, API key)          | **DONE** — schema, form, action, chat route all wired |
| Remove dead `requiresConfirmation` from AI types            | **DONE** — 0 references in `packages/ai/`             |
| Remove non-functional Paperclip button                      | **DONE**                                              |
| Render UIActions as styled links (not raw JSON)             | **DONE** — Link components with variant styling       |

### AI Tool Coverage (27 tools)

| Domain     | Read Tools       | Write Tools                      |
| ---------- | ---------------- | -------------------------------- |
| Documents  | search, detail   | create, status, convert, payment |
| Contacts   | search, detail   | create, update                   |
| Products   | search           | create, update                   |
| Reports    | summary, detail  | —                                |
| Projects   | search, detail   | —                                |
| Banking    | summary          | reconcile                        |
| Inventory  | stock levels     | stock movement                   |
| Dunning    | list overdue     | process                          |
| Accounting | account balances | create journal entry             |
| Recurring  | list             | —                                |
| Dashboard  | summary          | —                                |

**Remaining gaps**: project create/update, recurring invoice management.

---

## Phase 4: Improvement Roadmap

### Changes Since Last Audit — Resolution Status

| Previous Finding                                          | Status                                                |
| --------------------------------------------------------- | ----------------------------------------------------- |
| P1: Extract `LogoUpload` component from company-form.tsx  | **Not fixed** (form grew to 577 lines with AI config) |
| P1: Add focus-visible:ring to custom interactive elements | Not fixed                                             |
| P1: Add semantic HTML landmarks                           | Not fixed                                             |
| P2: Wrap password reset token creation in transaction     | Not fixed                                             |
| P2: Add arrow-key navigation to header dropdowns          | Not fixed                                             |
| P2: Add AI tools for project create/update                | Not fixed                                             |
| P3: E2E test automation                                   | Not fixed                                             |
| P3: Monitor documents.ts (1004 lines)                     | Unchanged                                             |

**0/8 previous action items resolved this iteration** (focus was on AI integration gaps).

### Quick Wins (< 1 hour)

| #    | Task                                                                                                                                                           | Effort | Impact      |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------- |
| QW-1 | Fix status enum SSOT: derive `documentStatusValues` in `actions/documents.ts:29` from `documentStatusEnum.enumValues`; fix camelCase in `document-list.tsx:27` | 20 min | Correctness |
| QW-2 | Extract `LogoUpload` from company-form.tsx (~70 lines)                                                                                                         | 20 min | Simplicity  |
| QW-3 | Extract `AIConfigSection` from company-form.tsx (~70 lines)                                                                                                    | 20 min | Simplicity  |

### Medium Effort (1-5 hours)

| #    | Task                                                                             | Effort  | Impact          |
| ---- | -------------------------------------------------------------------------------- | ------- | --------------- |
| ME-1 | Add `focus-visible:ring` to all custom interactive elements (30 → 80+ instances) | 2 hours | Accessibility   |
| ME-2 | Add AI tools for project create/update and recurring invoice management          | 2 hours | AI completeness |
| ME-3 | Add semantic HTML landmarks (`<nav>`, `<section>`, `<article>`)                  | 1 hour  | Accessibility   |

### Strategic (5+ hours)

| #    | Task                                                            | Effort      | Impact            |
| ---- | --------------------------------------------------------------- | ----------- | ----------------- |
| ST-1 | E2E test automation (Playwright suites for critical user paths) | 10-15 hours | Quality assurance |
| ST-2 | Split `documents.ts` (1004 lines) if it continues growing       | 3-4 hours   | Maintainability   |

---

## Phase 5: Functional Correctness

### Authentication & Authorization

- [x] NextAuth v5 with JWT strategy, credentials provider
- [x] `getSession()` validates companyId/userId, throws on unauthorized
- [x] Registration creates user + company + membership in transaction
- [x] All API routes have authentication checks
- [x] Middleware: deny-by-default, rate limiting, onboarding redirects
- [x] RBAC enforced via `requireRole()` on 74 mutations

### Data Integrity

All critical multi-table operations wrapped in `db.transaction()`: createDocument, updateDocumentStatus, recordPayment, convertDocument, createJournalEntry, reconcileTransaction, registration flow. 24 transaction instances across 11 domain files.

### Financial Correctness

- [x] `decimal.js` in all financial calculations
- [x] VAT at LINE ITEM level (Swiss standard)
- [x] Rappen rounding: `amount.times(20).round().div(20)` — correct
- [x] Document totals stored as strings (no float conversion)
- [x] QR reference: 27-digit with MOD-10 recursive check digit

### New Changes Verification

| Change                                               | Verified                                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------- |
| `audit.ts` WRITE_TOOLS has 12 entries (was 4)        | [x] Lines 4-17 — all write tools covered                                    |
| `chat/route.ts` saves model + tokenCount             | [x] Lines 200-205 — `model: activeModel`, `tokenCount: Math.ceil(length/4)` |
| `chat/route.ts` uses company AI settings as fallback | [x] Lines 100-103 — `settings.aiProvider`, `settings.aiModel`               |
| `chat/route.ts` getApiKey checks company key first   | [x] Lines 131-133 — company key prioritized for matching provider           |
| `types.ts` requiresConfirmation removed              | [x] 0 references in `packages/ai/`                                          |
| `chat/page.tsx` Paperclip removed                    | [x] 0 Paperclip imports                                                     |
| `ChatMessages.tsx` UIActions rendered as Links       | [x] Lines 87-105 — styled Link components with variant support              |
| Company form has AI Configuration section            | [x] Lines 489-560 — provider dropdown, model input, API key                 |
| Company page passes AI settings                      | [x] Lines 62-64 — aiProvider, aiModel, aiApiKey (masked)                    |
| Settings action handles AI fields                    | [x] Lines 43-45 schema, lines 87-92 merge logic with mask detection         |
| Schema aiProvider includes groq/xai                  | [x] Line 1087 — full union type                                             |
| i18n keys added for AI config (3 locales)            | [x] 8 keys + 2 placeholders per locale                                      |

### SQL Injection — Zero Risk

All queries use Drizzle ORM parameterized query builder. Zero string interpolation in SQL.

### Tenant Isolation — Airtight

companyId filtering on ALL tenant-scoped queries — zero gaps.

---

## Phase 6: UI/UX & Responsive Design

### Scorecard

| Category          | Score  | Prev | Delta | Notes                                               |
| ----------------- | ------ | ---- | ----- | --------------------------------------------------- |
| Responsive Layout | 8.5/10 | 8.5  | =     | 266 responsive classes, mobile-first approach       |
| Touch Targets     | 9/10   | 9.0  | =     | 51 min-h-[44px] instances                           |
| Loading States    | 9/10   | 9.0  | =     | 75/82 pages covered (91%)                           |
| Error Boundaries  | 9/10   | 9.0  | =     | 12 error.tsx + global-error.tsx                     |
| Empty States      | 8/10   | 8.0  | =     | Shared component across 10+ pages                   |
| Accessibility     | 7.5/10 | 7.5  | =     | 117 ARIA attributes, focus-visible (30) gaps remain |
| Dark Mode         | 8.5/10 | 8.5  | =     | 336 `dark:` classes                                 |
| i18n Coverage     | 9.5/10 | 9.5  | =     | 3 locales at parity (1579-1586 lines)               |

### New UI Changes Verified

- **Paperclip button removed**: `chat/page.tsx` — ChatInput renders directly without wrapper div.
- **UIActions rendered properly**: `ChatMessages.tsx` — tool results show `result.message` as text, `navigate` actions as styled Link buttons with variant support (primary/destructive/default). Raw JSON only as fallback for unrecognized result shapes.
- **AI Configuration section**: `company-form.tsx` — new section with provider dropdown (6 options including System Default), model text input, password-type API key input with hint text. All properly localized in 3 languages.

### Component Size Concern

`company-form.tsx` grew from 499 to 577 lines after adding the AI Configuration section. Should extract `LogoUpload` (~70 lines) and `AIConfigSection` (~70 lines) to bring it back under 450.

---

## Test Coverage Summary

| Test File                    | Tests   | Domain                       |
| ---------------------------- | ------- | ---------------------------- |
| import-mappings.test.ts      | 60      | CSV migration profiles       |
| banking.test.ts              | 57      | Banking, reconciliation      |
| documents.test.ts            | 55      | Document schemas, validation |
| reports.test.ts              | 45      | Report calculations          |
| status-transitions.test.ts   | 42      | State machine                |
| accounting.test.ts           | 41      | Accounting logic             |
| recurring-invoices.test.ts   | 38      | Recurring invoices           |
| email.test.ts                | 36      | Email rendering              |
| camt-parser.test.ts          | 35      | CAMT XML parsing             |
| products.test.ts             | 28      | Product CRUD                 |
| contacts.test.ts             | 27      | Contact CRUD                 |
| document-conversions.test.ts | 27      | Document conversion          |
| memberships.test.ts          | 26      | Team roles                   |
| swiss-currency.test.ts       | 25      | Rappen rounding              |
| invitations.test.ts          | 24      | Invitation flow              |
| billing.test.ts              | 23      | Billing/subscription         |
| number-sequences.test.ts     | 16      | Number generation            |
| calculate-totals.test.ts     | 15      | Financial math               |
| dunning.test.ts              | 13      | Dunning levels               |
| onboarding.test.ts           | 12      | Company initialization       |
| qr-reference.test.ts         | 9       | QR reference                 |
| **Total**                    | **654** | **21 test files**            |

---

## Action Items (Prioritized)

### P0 — None

No data integrity, security, or correctness issues.

### P1 — High Value

1. **Fix status enum SSOT violation** — `document-list.tsx:27` uses camelCase (`partiallyPaid`, `dunning1`) while schema/DB uses snake_case (`partially_paid`, `dunning_1`). Also, `actions/documents.ts:29` duplicates enum instead of deriving from `documentStatusEnum.enumValues`.
2. **Extract `LogoUpload` + `AIConfigSection`** from company-form.tsx (577 → ~440 lines)
3. **Add focus-visible:ring** to custom interactive elements — 30 → 80+ instances needed

### P2 — Polish

4. Add semantic HTML landmarks — improve screen reader navigation
5. Add arrow-key navigation to header dropdown menus
6. Add AI tools for project create/update and recurring invoice management
7. Wrap password reset token creation in transaction (LOW risk)

### P3 — Strategic

8. E2E test automation with Playwright
9. Monitor `documents.ts` (1004 lines) — split if it grows beyond ~1200 lines

---

_Previous audit (9th) overall score: 8.9/10. Current score: **8.9/10** (stable). AI integration gaps filled: 12/12 write tools audited, model/token persistence, per-company AI settings wired, dead code removed, UIAction rendering fixed. New finding: status enum SSOT violation in document-list.tsx. Previous action items (LogoUpload extraction, accessibility improvements) remain open. The codebase is production-ready for Swiss SME use with strong AI-first architecture._
