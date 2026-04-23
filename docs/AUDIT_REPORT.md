# Codebase Audit Report

**Date**: 2026-04-23
**Previous Audit**: 2026-04-13
**Auditor**: Claude Code (claude-sonnet-4-6)
**Branch**: main
**Commit**: da3ba10

---

## Executive Summary

Kivvi ERP continues to mature into a highly disciplined, production-ready Swiss ERP. The 10 days since the last audit brought a focused quality pass: i18n is now fully consistent across all three locales (0 missing keys), all hardcoded English error fallbacks have been replaced with `tc("error")`, `formatCurrency()` is now the universal SSOT for currency display across every UI surface, and role labels in the team settings page no longer hardcode English regardless of locale.

The core strengths from the previous audit hold: financial correctness (Decimal.js throughout, atomic transactions), tenant isolation (companyId in every query, no exceptions), and mission alignment (intake, repair, CO2 tracking, QR-bills, 36 AI tools all present and correct). The accounting loop gap identified in the previous audit (API-created invoices not triggering journal entries) has been **resolved** — `recordPayment` now wraps payment + journal entry in a single atomic transaction in all paths.

The primary remaining gaps are: (1) no test coverage for PDF generation — critical for legally-required QR-bills, (2) inline forms (PaymentForm, SendEmailDialog) lack proper dialog semantics and focus management, (3) two god components (roadmap page at 678 lines, data-quality-panel at 623 lines) that could benefit from extraction, and (4) duplicate `openStatuses` arrays in two domain files that could diverge silently.

---

## Health Score

| Area                                          | Score      | Notes                                                                    |
| --------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| First Principles (SSOT, layering, simplicity) | 9.2/10     | ↑ from 9.1 — i18n + currency SSOT fully enforced                         |
| Best Practices (auth, naming, error handling) | 9.2/10     | ↑ from 9.1 — error fallbacks all use tc("error")                         |
| Mission Alignment                             | 9.75/10    | → unchanged — all secondhand + Swiss features shipped                    |
| Functional Correctness                        | 9.1/10     | ↑ from 8.75 — API accounting loop closed; 36 AI tools verified           |
| UI/UX & Responsive Design                     | 8.1/10     | → unchanged — skeleton loading excellent; form accessibility gaps remain |
| **Overall**                                   | **9.1/10** | **↑ from 8.9 — production-ready. No blockers.**                          |

---

## Phase 1: First Principles

### SSOT (Single Source of Truth) — 9.2/10

**Excellent (unchanged from previous audit):**

- TypeScript types derived from Drizzle schema via `$inferSelect` / `$inferInsert` throughout — no parallel type definitions
- VAT rates: single source at `packages/core/src/config/vat-rates.ts` — imported everywhere
- Account codes: centralized at `packages/core/src/config/account-mappings.ts` — used directly by `accounting-integration.ts`
- Enums: `packages/database/src/enums.ts` is zero-dependency SSOT for all enum values
- Currency formatting: `formatCurrency()` in `apps/web/lib/utils.ts` is now the single SSOT for all CHF display across every UI surface — verified across 10+ files

**New violations found (both require fixes):**

1. **Duplicate `openStatuses` arrays** — `packages/core/src/domain/documents.ts:1334-1349` defines `openStatuses` and `nonTerminalStatuses` as hardcoded arrays. `packages/core/src/domain/data-quality.ts:251-261` redefines `openStatuses` with **different values** (includes "draft" where `documents.ts` does not). These should be centralized in `/packages/core/src/config/document-statuses.ts`.

2. **God components (still present):**

| File                                                          | Lines | Action                                                                |
| ------------------------------------------------------------- | ----- | --------------------------------------------------------------------- |
| `app/(landing)/roadmap/page.tsx`                              | 678   | Extract roadmap sections into sub-components                          |
| `app/(dashboard)/settings/data-repair/data-quality-panel.tsx` | 623   | Extract check-type panels                                             |
| `components/contacts/contact-form.tsx`                        | 553   | Extract `<PersonFields>`, `<AddressFields>`, `<ContactDetailsFields>` |
| `components/documents/document-form.tsx`                      | 500   | Extract item row, summary panel                                       |

### Dead Code — 9/10

No TODO/FIXME/HACK comments. All sampled domain exports consumed. Codebase actively maintained — no visible deferred debt.

### Business Logic Layering — 9.5/10

Correct pattern uniformly applied: Server Actions authenticate → validate → call domain function → revalidate. All 36 AI tools call the same domain functions as Server Actions (verified for `recordRepair`, `createDocument`, `recordPayment`). Direct DB in `auth.ts` and `password-reset.ts` correctly exempt.

`createAction` factory pattern in `action-factory.ts` eliminates boilerplate across accounting/banking/dunning.

### `any` / `ts-ignore` — 9.5/10

8 instances total, all justified:

| File                               | Reason                                                            |
| ---------------------------------- | ----------------------------------------------------------------- |
| `middleware.ts` (×2)               | NextAuth v5 incomplete types — req.auth missing companyId in type |
| `lib/auth.ts`                      | DrizzleAdapter version mismatch                                   |
| `lib/db.ts`                        | Drizzle Proxy pattern                                             |
| `lib/stripe.ts`                    | Dynamic property on SDK                                           |
| `app/api/export/[entity]/route.ts` | Type assertion for dynamic entity param                           |

Zero `@ts-ignore` or `@ts-expect-error` pragmas. Clean.

---

## Phase 2: Best Practices

### Console.log — 10/10

Zero in production code. Only in E2E teardown helpers (appropriate).

### Error Handling — 9.5/10

`ActionResult<T>` interface enforced across all Server Actions. `safeErrorMessage()` prevents internal detail leakage. All client-side error fallbacks now use `tc("error")` from the common i18n namespace — no more hardcoded English fallback strings anywhere in the UI. `safeErrorMessage` fallback strings in server actions are server-side only (logged to Sentry, not shown to users).

### Auth Checks — 9.5/10

Every Server Action calls `getSession()` or `requireRole()`. Every API route calls `authenticateApi()`. Four correctly auth-free files: `auth.ts`, `password-reset.ts`, `parse-form-data.ts`, `contact.ts` (public landing form). No security gaps.

Role hierarchy: `viewer(0) < member(1) < admin(2) < owner(3)` — consistent in both Server Actions and API handler.

### companyId in All Queries — 9.5/10

Checked 10 domain functions. Pattern: `where: and(eq(table.id, id), eq(table.companyId, companyId))`. Banking validates via join. Auth-context queries correctly exempt. No data leakage vectors.

### revalidatePath Coverage — 9/10

All mutation actions revalidate. Document mutations use centralized `revalidateDocumentPaths()`. Factory pattern handles revalidation automatically for accounting/banking/dunning.

### Naming Conventions — 9/10

| Convention                                          | Status                       |
| --------------------------------------------------- | ---------------------------- |
| Component files: kebab-case.tsx, exports PascalCase | ✓                            |
| Server Actions: camelCase + Action suffix           | ✓ (35+)                      |
| Domain functions: camelCase                         | ✓                            |
| Config files: kebab-case                            | ✓ (all 19 in `/lib/config/`) |
| Constants: UPPER_SNAKE                              | ✓                            |

### Decimal.js / Floating Point — 10/10

All financial domain operations use `Decimal.js`. No `parseFloat()` or `Number()` on currency values in domain code. String storage in DB prevents float errors. Line-item VAT rounding per Swiss standard.

### Transaction Usage — 9.5/10

50+ transaction instances in domain. Multi-table operations correctly wrapped. `recordPayment` creates both payment record and journal entry atomically — previous audit gap resolved.

---

## Phase 3: Mission Alignment

### Secondhand-Specific Features — 10/10

| Feature                      | Status | Location                                                                                              |
| ---------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| Intake document type         | ✓      | `schema.ts`, prefix `EI-`                                                                             |
| Condition grading (7 grades) | ✓      | untested → like_new → good → fair → poor → parts_only → scrap                                         |
| Item lifecycle (10 statuses) | ✓      | intake → testing → repair → ready_for_sale → listed → reserved → sold → returned → donated → recycled |
| Donor / donation tracking    | ✓      | `documents.intakeSource`, `documents.donorId`, `inventoryItems.donorContactId`                        |
| Repair cost accumulation     | ✓      | `repairCost` (decimal), `repairHours`, `repairLog`, `repairParts` table                               |
| Repair parts catalog lookup  | ✓      | `ProductSearchInput` wired into repair parts form                                                     |
| CO2 impact metrics           | ✓      | `packages/core/src/domain/impact.ts` — CO2 by category, configurable per-company factors              |
| CO2 factor editor            | ✓      | Settings page with per-category overrides, trilingual                                                 |

### Swiss-Native Features — 10/10

| Feature                     | Status | Location                                                         |
| --------------------------- | ------ | ---------------------------------------------------------------- |
| QR-bill generation          | ✓      | `pdf-generation.ts` — `swissqrbill` library, valid IBAN required |
| CAMT bank import            | ✓      | `camt-parser.ts` — CAMT.053 + CAMT.054                           |
| Rappen rounding (CHF 0.05)  | ✓      | `swiss-currency.ts` — tested exhaustively                        |
| VAT config-driven           | ✓      | `vat-rates.ts` — 8.1%, 2.6%, 0%                                  |
| Swiss KMU chart of accounts | ✓      | 227 accounts, German labels                                      |
| Document prefixes (DE)      | ✓      | RE, AN, AU, AB, LS, GU, BE, ER, MA, EI                           |
| `de-CH` locale              | ✓      | Apostrophe thousands separator, DD.MM.YYYY dates                 |

### AI-First — 10/10

36 AI tools (up from 21 at previous audit) registered in `packages/ai/src/tools/index.ts`. All tools call the same domain functions as Server Actions — verified for `record-repair.ts`, `create-document.ts`, `record-repair-part.ts`. Cmd+K command palette implemented. Role-based permission gating per tool.

### i18n — 9.5/10 (↑ from 9.0)

Three languages (de-CH, en, fr) with **zero missing keys** across all locales — verified programmatically. All client error fallbacks use `tc("error")` from common namespace. Role labels in team settings now locale-aware. QC progress strings in intake detail now locale-aware.

**Minor remaining gap:** Form placeholder example names ("Hans", "Müller") not locale-parameterized.

### Open Source — 9/10

MIT license. `docs/SELF-HOSTING.md`. Ollama local AI documented. Production deployment guide still pending (Docker, PostgreSQL, monitoring, env variable reference).

---

## Phase 4: Improvement Roadmap

### Quick Wins (< 1 hour each)

| Item                                                                 | File                                                             | Effort |
| -------------------------------------------------------------------- | ---------------------------------------------------------------- | ------ |
| Centralize `openStatuses` / `nonTerminalStatuses` into shared config | `documents.ts:1334`, `data-quality.ts:251`                       | 30 min |
| Fix SendEmailButton responsive overflow (`w-56` → `w-full sm:w-56`)  | `send-email-dialog.tsx:77`                                       | 5 min  |
| Add `aria-label` to CopyButton                                       | `copy-button.tsx:28`                                             | 2 min  |
| Fix hardcoded German export labels                                   | `contact-export-button.tsx`, `inventory-items-export-button.tsx` | 15 min |

### Medium Effort (1–5 hours each)

| Item                                                                                               | Impact                                                     | Effort |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------ |
| **PDF generation tests**                                                                           | HIGH — QR-bills legally required; no regression safety     | 3h     |
| **Inline forms accessibility** (PaymentForm, SendEmailDialog — dialog semantics, focus management) | MEDIUM                                                     | 2h     |
| **Production deployment guide**                                                                    | MEDIUM — blocks self-hosting customers                     | 3h     |
| **OpenAPI spec for `/api/v1/*`**                                                                   | MEDIUM — currently undocumented                            | 4h     |
| **Donation receipt (Spendenquittung) PDF**                                                         | HIGH for nonprofits — legal requirement for tax deductions | 4h     |
| **Extract god components** (contact-form, roadmap page, data-quality-panel)                        | LOW-MEDIUM                                                 | 2h     |

### Strategic (> 1 day)

| Item                                                   | Why                                                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Spendenquittung / donation receipt flow**            | Core differentiator for nonprofit Brockenhäuser. Legal for donor tax deductions.                       |
| **Switch Neon HTTP → WebSocket driver for production** | HTTP transaction fallback not officially ACID-guaranteed under concurrent load.                        |
| **Multi-workspace support**                            | Blocking for consultants, accounting firms, franchise-style businesses.                                |
| **Expand E2E test coverage**                           | Banking, accounting, intake, PDF generation not covered. Auth + contacts + invoices covered.           |
| **Webshop / channel listing integration stub**         | Items reach "listed" status with no outbound channel. WooCommerce / Shopify / internal webshop needed. |

---

## Phase 5: Functional Correctness

### Authentication & Authorization — 9.5/10

Session shape: `session.user.{id, email, companyId, role, onboardingComplete}`. Middleware protects all non-public paths. Onboarding redirect fires for incomplete companies. Role hierarchy consistent.

### Critical Business Logic — 9.5/10

| Function                      | Transaction?       | Journal Entries?                    | Decimal.js? |
| ----------------------------- | ------------------ | ----------------------------------- | ----------- |
| `createDocument`              | ✓                  | ✓ on status → sent                  | ✓           |
| `updateDocumentStatus → sent` | ✓                  | ✓ Debit 1100 / Credit 3000+2200     | ✓           |
| `recordPayment`               | ✓                  | ✓ Debit 1020 / Credit 1100 (atomic) | ✓           |
| `recordRepair`                | ✓                  | — (inventory, not accounting)       | ✓           |
| `createInventoryItem`         | ✓                  | — (inventory)                       | ✓           |
| `getNextNumber`               | ✓ atomic increment | —                                   | —           |

**API accounting loop (previous P0 gap): RESOLVED.** Payment via API or UI both trigger `createPaymentReceivedJournalEntry()` inside the same transaction. If journal entry fails, payment rolls back.

### API Contract — 10/10

All `/api/v1/*` routes: Zod-validated inputs, `authenticateApi()` required, `apiError`/`apiSuccess` format, rate limiting (token bucket per IP:path — 5/min auth, 100/min default).

### Document Status Transitions — 9.5/10

`VALID_TRANSITIONS` map guards all status changes. `Cannot transition` domain error surfaced safely to clients. Intake-specific transitions enforced. Status machines correct.

### Production Risk: Neon HTTP + Transactions — MEDIUM (unchanged)

`packages/database/src/index.ts` uses Neon HTTP driver when `VERCEL=1`. Drizzle HTTP transaction fallback works but is not officially guaranteed ACID under concurrent load. Non-blocking at current scale. Mitigation: switch to `drizzle-orm/neon-serverless` (WebSocket).

### Test Coverage — 7.5/10

**Tested:** Rappen rounding (18 cases), accounting journal entries (debit=credit invariant), document status transitions, Swiss currency utils, dunning logic, number sequences.

**Not tested:**

- PDF generation (QR-bill presence, format validation) — **HIGH priority**
- Email templates
- Server Actions (no integration tests)
- API routes (no integration tests)
- Banking / CAMT import

---

## Phase 6: UI/UX & Responsive Design

### Loading & Error States — 9/10

15+ `loading.tsx` skeleton files. 675+ `Skeleton` component usages. All forms use `useTransition()` with `Loader2` spinner. 10 `error.tsx` files covering all major dashboard sections.

### Navigation — 9/10

Sidebar covers all sections: Dashboard, Contacts, Products, Documents, Money, Intake, Inventory, Projects, Reports, Settings + AI assistant. Mobile hamburger menu correctly implemented in `header.tsx` (44px touch target, aria-label). Responsive overlay sidebar.

### Accessibility — 7.5/10

**Good:** Labels on all form inputs via `FormField` pattern, `aria-label` on icon buttons, `role="dialog"` on modal components, `aria-current="page"` on nav, skip-to-content link, keyboard shortcuts (Cmd+K, /, Shift+?, N, Esc).

**Open issues (from previous audit — still not fixed):**

| Severity | File                                         | Issue                                                |
| -------- | -------------------------------------------- | ---------------------------------------------------- |
| HIGH     | `components/copy-button.tsx:28`              | Missing `aria-label` — screen readers silent         |
| MEDIUM   | `components/documents/send-email-dialog.tsx` | Inline form lacks `role="dialog"` + focus management |
| MEDIUM   | `components/documents/payment-form.tsx`      | Toggle open/closed — no focus move on open           |

### Responsive Design — 8.5/10

Strong Tailwind breakpoint coverage (105+ responsive classes in components). Touch targets consistently 44px. Labels correctly associated.

**One persistent issue (from previous audit — still not fixed):**

| Severity | File:Line                  | Issue                                   |
| -------- | -------------------------- | --------------------------------------- |
| MEDIUM   | `send-email-dialog.tsx:77` | `w-56` email input overflows on < 640px |

**New finding:** `components/ui/card-section.tsx` has no responsive padding variants — `p-6` is fixed regardless of viewport. On mobile, this is tight. Add `sm:p-4 md:p-6` or reduce base padding.

### i18n — 9.5/10

Zero missing keys across en/de-CH/fr — **verified programmatically**. All error fallbacks translated. Role labels, QC progress strings, dunning button labels, chart-of-accounts footer — all wired to i18n in this cycle.

---

## Action Items (Prioritized)

### P0 — Quick (< 30 min each)

| #   | Item                                                            | File                                                             | Effort |
| --- | --------------------------------------------------------------- | ---------------------------------------------------------------- | ------ |
| 1   | Centralize duplicate `openStatuses` — risk of silent divergence | `documents.ts:1334`, `data-quality.ts:251`                       | 30 min |
| 2   | Fix responsive overflow in email dialog                         | `send-email-dialog.tsx:77`                                       | 5 min  |
| 3   | Add `aria-label` to CopyButton                                  | `copy-button.tsx:28`                                             | 2 min  |
| 4   | Fix hardcoded German labels in export buttons                   | `contact-export-button.tsx`, `inventory-items-export-button.tsx` | 15 min |

### P1 — Before First Paying Customer

| #   | Item                                                                  | Effort |
| --- | --------------------------------------------------------------------- | ------ |
| 5   | PDF generation tests — validate QR-bill presence and reference format | 3h     |
| 6   | Donation receipt (Spendenquittung) PDF generator                      | 4h     |
| 7   | Fix inline form accessibility (dialog semantics + focus management)   | 2h     |
| 8   | Production deployment guide (Docker, env vars, monitoring)            | 3h     |

### P2 — Next Quarter

| #   | Item                                                               | Effort |
| --- | ------------------------------------------------------------------ | ------ |
| 9   | Extract god components (contact-form, roadmap, data-quality-panel) | 2h     |
| 10  | Switch Neon HTTP → WebSocket driver for production                 | 4h     |
| 11  | OpenAPI spec for `/api/v1/*`                                       | 4h     |
| 12  | Webshop / channel listing integration stub                         | 1d     |
| 13  | Expand E2E tests: banking, intake, PDF, accounting                 | 2d     |
| 14  | Multi-workspace / company switcher                                 | 3d     |

---

## Comparison to Previous Audit (2026-04-13)

| Area                      | Previous   | Current    | Δ                                                                 |
| ------------------------- | ---------- | ---------- | ----------------------------------------------------------------- |
| First Principles          | 9.1/10     | 9.2/10     | +0.1 — currency SSOT complete; new: duplicate status arrays       |
| Best Practices            | 9.1/10     | 9.2/10     | +0.1 — all error fallbacks i18n-compliant                         |
| Mission Alignment         | 9.75/10    | 9.75/10    | → — stable; CO2 factor editor added                               |
| Functional Correctness    | 8.75/10    | 9.1/10     | +0.35 — API accounting loop closed; 36 AI tools verified          |
| UI/UX & Responsive Design | 8.1/10     | 8.1/10     | → — skeleton loading excellent; P0 accessibility items still open |
| **Overall**               | **8.9/10** | **9.1/10** | **+0.2**                                                          |

**Changes since last audit (2026-04-13 → 2026-04-23):**

- `formatCurrency()` SSOT enforced across all UI surfaces (payment-form, edit-document-form, line items, repair-import, item-timeline, journal entry page)
- i18n locale sync: 0 missing keys across all 3 locales (previously 1 missing)
- All hardcoded English error fallbacks replaced with `tc("error")` across 10+ components
- `ROLE_LABELS` hardcoded object removed from team settings; now locale-aware
- `DunningButton` fully i18n'd (was entirely missing `useTranslations`)
- QC progress strings in intake detail now locale-aware
- Chart-of-accounts footer "Showing N accounts" and "Parent: code name" now i18n'd
- CO2 impact factor editor shipped (settings page, server action, trilingual i18n)
- Repair parts: `ProductSearchInput` wired into repair parts form
- API accounting loop confirmed resolved (was listed as P0 in previous audit)
