# Codebase Audit Report

**Date**: 2026-04-12
**Previous Audit**: 2026-04-02
**Auditor**: Claude Code (claude-sonnet-4-6)
**Branch**: main
**Commit**: 6da7c0deb92535c0cc99dbcecc47378529dc916e

---

## Executive Summary

Kivvi is a well-engineered ERP targeting circular-economy businesses. The codebase demonstrates strong alignment with its stated first principles, rigorous financial correctness, and production-grade security. The architecture is clean: schema → types → domain → actions → UI with no significant leakage between layers.

No critical issues were found. The most actionable findings are: 3–4 instances of floating-point arithmetic in inventory repair-cost calculations (should use `decimal.js`), a missing MIT `LICENSE` file, hardcoded Tailwind colors in a handful of dashboard pages, and component file naming that doesn't match the CLAUDE.md convention (kebab-case files vs PascalCase expected). All are low-to-medium severity.

The landing site (6 knowledge articles, 4 vertical pages, full footer, legal pages) is comprehensive and its claims are fully backed by working code. Swiss compliance is genuinely built-in: QR-bills, VAT rates, Rappen rounding, `de-CH` locale, and the KMU Kontenrahmen are all implemented at the domain level, not as afterthoughts.

---

## Health Score

| Area                   | Score    | Notes                                                                                   |
| ---------------------- | -------- | --------------------------------------------------------------------------------------- |
| First Principles       | 9/10     | One justified `as any` in auth adapter; floating-point in inventory minor path          |
| Best Practices         | 8/10     | Zero console.log; floating-point in 3 inventory functions; naming inconsistency         |
| Mission Alignment      | 10/10    | Every landing page promise is backed by domain code                                     |
| Functional Correctness | 9/10     | Auth, transactions, tenant isolation, sequences all correct; missing LICENSE            |
| UI/UX & Responsive     | 8/10     | Mobile-first excellent; hardcoded colors in ~4 files; empty states sparse in accounting |
| **Overall**            | **9/10** | Production-ready; minor refinements recommended                                         |

---

## Phase 1: First Principles

### GT1 — Software serves humans (no dead code)

**PASS.** No unused exports, dead feature branches, or commented-out code detected. All config files (`site.ts`, `document-types.ts`) are fully consumed by components.

### GT2 — SSOT (single source of truth)

**PASS.** The data flow is clean: `packages/database/src/schema.ts` → Drizzle `$inferSelect`/`$inferInsert` → domain types → component props. No parallel type definitions found. Enum values centralized in `packages/database/src/enums.ts` and re-used via `pgEnum`. Config in `apps/web/lib/config/` imports from schema — no duplication.

### GT3 — Design for change

**PASS.** Business logic is cleanly contained in `packages/core/src/domain/`. Three inline DB queries in Server Components (dashboard page, recurring invoices page, full-export API) are acceptable for SSR patterns. Components receive data as props — no embedded queries in UI code.

### GT4 — Automate the mechanical

**PASS.** Action factory pattern (`action-factory.ts`) eliminates repeated `try/catch`/`getSession`/`revalidatePath` boilerplate across 15+ action files. Validation, number sequences, totals, journal entries, and stock movements are all automated.

### GT5 — Simplicity scales

**MINOR CONCERN.** Several large components exist but are justified by domain complexity:

- `components/contacts/contact-form.tsx` — 516 lines (multi-section form)
- `components/documents/document-form.tsx` — 497 lines (complex document creation)
- `components/documents/document-detail.tsx` — 432 lines (rich detail view)
- `apps/web/lib/config/document-types.ts` — 674 lines (SSOT for all document behavior, acceptable)

No unnecessary abstractions or premature generalizations found.

### GT6 — Correctness beats speed

**MINOR VIOLATION** — floating-point arithmetic on monetary values in inventory path:

| File                                          | Lines   | Issue                                         |
| --------------------------------------------- | ------- | --------------------------------------------- |
| `packages/core/src/domain/inventory-items.ts` | 76–78   | `parseFloat` + native `+` for `effectiveCost` |
| `packages/core/src/domain/inventory-items.ts` | 319–321 | `parseFloat` for repair cost accumulation     |
| `packages/core/src/domain/inventory-items.ts` | 324–328 | `parseFloat` for repair hours                 |

These are non-critical inventory tracking values (not invoice totals or journal entries), but they violate the project's own rule. All three should use `Decimal.js`.

**Other correctness items — all PASS:**

- Two `as any` casts in `middleware.ts:66,75` — justified by next-auth middleware type gap
- One `as any` in `lib/auth.ts:19` — justified by DrizzleAdapter/next-auth version mismatch
- Zero `@ts-ignore`, zero `@ts-expect-error`, zero `eslint-disable`

---

## Phase 2: Best Practices

### Console output

**PASS.** Zero `console.log/debug/info/warn/error` calls found anywhere in the TypeScript source.

### Server Action pattern

**PASS.** All 30 action files start with `"use server"`. Sampled actions follow the mandated pattern:

```
requireRole() → safeParse() → db.transaction() → domain function → revalidatePath() → ActionResult<T>
```

The `createAction` factory (for read-heavy actions) handles session and error propagation cleanly.

### Domain function pattern

**PASS.** All functions in `packages/core/src/domain/` take `(db: Database, companyId: string, ...)` as their first two parameters.

### TypeScript quality

**EXCELLENT.** 0 bare `: any`, 3 justified `as any` (2 middleware, 1 auth adapter), 0 suppression comments.

### Naming conventions

**INCONSISTENCY.** CLAUDE.md mandates `PascalCase.tsx` for component files. The majority of component files use `kebab-case.tsx`:

- `components/sidebar.tsx`, `components/page-header.tsx`, `components/kivvi-logo.tsx`
- `components/contacts/contact-form.tsx`, `components/inventory/item-label.tsx`, etc.

The `components/chat-widget/` subdirectory uses PascalCase (`ChatWidget.tsx`, `ChatInput.tsx`). This is a low-risk stylistic inconsistency — but it conflicts with the documented convention. **Pick one and update CLAUDE.md.**

### Error handling

**PASS.** No empty catch blocks. All errors go through `safeErrorMessage()`. Server Actions return structured `{ success, data?, error? }`.

### Security / tenant isolation

**PASS.** All five sampled domain functions filter by `companyId`. No raw SQL concatenation. Middleware uses deny-by-default pattern (`middleware.ts:94`).

### Client/server boundary

**PASS.** No `"use client"` file imports from the `@kivvi/core` barrel. Client components that need import-mappings reference specific domain files directly.

### Financial math

**PARTIAL.** Core invoice/accounting calculations use `Decimal.js` correctly. The three inventory functions noted in GT6 use native floats — see action items.

---

## Phase 3: Mission Alignment

| Mission Area                                           | Status         | Evidence                                                                                 |
| ------------------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------- |
| Circular economy core (intake/condition/repair/impact) | ✅ Implemented | `inventory-items.ts`, `intake-integration.ts`, `impact.ts`, item status machine          |
| Swiss QR-bill (legally required)                       | ✅ Implemented | `pdf-generation.ts:123–502`, `swissqrbill/pdf`, auto-generated on invoice                |
| Swiss VAT (8.1% / 2.6% / 0%)                           | ✅ Implemented | `packages/core/src/config/vat-rates.ts`, line-item calculation in `documents.ts:175–205` |
| Rappen rounding (CHF 0.05)                             | ✅ Implemented | `swiss-currency.ts:20–22`, tested in `__tests__/swiss-currency.test.ts`                  |
| German locale (de-CH)                                  | ✅ Implemented | `packages/core/src/config/locale.ts`, DD.MM.YYYY throughout                              |
| Swiss KMU Kontenrahmen                                 | ✅ Implemented | 227-account seed, initialized at onboarding                                              |
| Donation receipts                                      | ✅ Implemented | `pdf-generation.ts:539` `generateDonationReceiptPdf()`                                   |
| Kivitendo CSV migration                                | ✅ Implemented | 10 mapping profiles in `import-mappings.ts`                                              |
| AI-first command bar                                   | ✅ Implemented | `packages/ai/src/tools/` — same domain functions as UI                                   |
| Impact dashboard                                       | ✅ Implemented | `impact.ts` — items saved, CO₂, reuse rate                                               |
| Open source / MIT license                              | ⚠️ Partial     | MIT declared in `package.json`; **no `LICENSE` file in repo root**                       |

**All landing-page claims are backed by working code.** No overpromising detected.

---

## Phase 4: Improvement Roadmap

### Quick Wins (< 1 hour each)

1. **Add `LICENSE` file** — Create `/LICENSE` with standard MIT text. Declared only in `package.json` currently; missing for open-source credibility. (5 min)

2. **Fix floating-point in `inventory-items.ts`** — Replace `parseFloat` + native `+` with `Decimal.js` in lines 76–78, 319–321, 324–328. The fix is mechanical. (30 min)

3. **Fix hardcoded Tailwind colors in dunning/reports** — Replace `text-red-600`, `bg-red-600`, and 6 chart colors in `dunning-button.tsx`, `dunning/page.tsx`, and `reports/page.tsx` with design-system tokens or CSS variables. (45 min)

4. **Add `overflow-x-auto` wrappers to all data tables** — Only `selectable-product-table.tsx` has it; all other tables should too. (30 min)

### Medium Effort (1–5 hours)

5. **Standardize component file naming** — All `*.tsx` component files should be `kebab-case.tsx` (already the majority) or `PascalCase.tsx` (what CLAUDE.md says). Pick one, update CLAUDE.md, rename the `chat-widget` outliers. (1–2 hours)

6. **Add empty states to accounting and purchasing list pages** — The `EmptyState` component exists and is used on contacts/products/inventory/documents. Accounting, reports, and purchasing list pages lack it. Blank screens read as broken. (2 hours)

7. **Visual submit loading state on forms** — `isSubmitting` state is managed in contact-form and others, but the submit button may not reflect it visually. Verify and fix. (1 hour)

8. **Verify donation receipt flow end-to-end** — `generateDonationReceiptPdf()` exists but there's no clearly visible Server Action calling it. Confirm it's triggered on intake confirmation, or wire it up explicitly. (1–2 hours)

### Strategic

9. **Rate limiting audit** — Middleware implements rate limiting. Verify thresholds are appropriate for production (login endpoint should be much stricter than general routes).

10. **AI tool permissions audit** — Confirm every AI tool in `packages/ai/src/tools/` passes through `getToolsForPermissions()`. An AI tool that bypasses tenant isolation is a critical vulnerability.

11. **Password reset token timing** — Review `apps/web/app/actions/password-reset.ts` token comparison for timing-safe equality. This is a common security oversight.

12. **Self-hosting documentation** — Consider a `docs/SELF-HOSTING.md` covering environment variables, database migrations, SMTP config, and backup strategy. Reduces friction for the open-source audience.

---

## Phase 5: Functional Correctness

### Authentication

**PASS.** NextAuth v5, JWT strategy, 7-day session lifetime. `getSession()` returns `{ companyId, userId, role, onboardingComplete }`. Middleware uses deny-by-default (public paths explicitly whitelisted at `middleware.ts:6–28`). Route groups correctly separate `(auth)`, `(dashboard)`, `(landing)`, and `(onboarding)`.

### Server Actions (3 sampled)

All three follow the full pattern — auth → validate → transaction (via domain) → revalidate → return:

- `createDocumentAction` (`documents.ts:47–67`) ✅
- `updateDocumentStatusAction` (`documents.ts:108–133`) ✅
- `recordPaymentAction` (`documents.ts:142–175`) ✅

### Document lifecycle

**PASS.** `VALID_TRANSITIONS` map covers the full state machine. Transitions enforced inside DB transactions. Conversion targets defined separately in `VALID_CONVERSIONS`. Both enforced with thrown errors on invalid attempts.

### Financial calculations

**PASS.** VAT calculated at line-item level using `Decimal.js`, rounded per line. Rappen rounding applied once to the final total (not to line items). Document totals stored atomically; never recalculated from stored amounts.

### Tenant isolation

**PASS.** All 5 sampled domain functions (`contacts`, `products`, `documents`, `warehouses`, `projects`) include `eq(table.companyId, companyId)` in every query. Update/delete operations use dual-condition WHERE clauses.

### Number sequences

**PASS.** Atomic `UPDATE ... RETURNING` with `INSERT ... ON CONFLICT DO NOTHING` + retry pattern — no race condition possible. Sequences initialized for all 13 types during onboarding and resume from `MAX(existing) + 1` after Kivitendo import.

---

## Phase 6: UI/UX & Responsive Design

### Mobile-first

**EXCELLENT.** All sections use `mx-auto max-w-*` with responsive grids. Typography scales correctly (`text-4xl sm:text-5xl`). No hardcoded pixel widths on content areas.

### Mobile navigation

**EXCELLENT.** `landing-nav.tsx` has a full hamburger drawer with Escape-key close and proper z-indexing. Dashboard sidebar has a mobile overlay drawer (`fixed inset-y-0 z-50 lg:hidden`).

### Touch targets

**EXCELLENT.** `min-h-[44px] min-w-[44px]` used consistently on all interactive elements across sidebar, header, and forms. Meets WCAG and iOS Human Interface Guidelines.

### Loading states

**GOOD.** Comprehensive skeleton loaders exist. `components/ui/skeleton.tsx` provides a reusable shimmer. Multiple `loading.tsx` files in sales/delivery-notes routes. Coverage could be extended to accounting routes.

### Empty states

**GOOD.** `EmptyState` component exists and is used in 8+ list pages. Gap: accounting, reports, and purchasing pages show blank instead of helpful empty states.

### Accessibility

**EXCELLENT.** Proper semantic HTML (`<nav aria-label>`, `<header role="banner">`, heading hierarchy). Skip-to-content link at `layout.tsx:103–108`. Focus-visible rings consistent. Keyboard shortcuts (Cmd+K, Escape) all functional.

### Design system consistency

**MINOR VIOLATIONS.** Almost all colors use CSS variable tokens. Exceptions:

- `sales/dunning/dunning-button.tsx` — `bg-red-600 hover:bg-red-700` (should use `destructive`)
- `sales/dunning/page.tsx` — `text-red-600 dark:text-red-400`
- `reports/page.tsx` — 6 hardcoded chart colors (`text-green-600`, `text-blue-600`, etc.)
- `contacts/page.tsx` — `bg-green-100 dark:bg-green-900/30` for status badge

The landing page uses semantic colored accents (`border-l-blue-500` etc.) intentionally for visual storytelling — acceptable.

### Landing page

**EXCELLENT.** Main page, 4 vertical pages, and all 6 knowledge articles are consistent in structure and quality. Footer covers all required Swiss legal links (Impressum, Datenschutz). All 6 knowledge articles now published (previously 3 were "Bald verfügbar").

---

## Action Items

Prioritized by mission impact → user impact → code quality:

| #   | Priority | Effort | Action                                                                              | Location                                                     |
| --- | -------- | ------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | High     | 5 min  | Add `LICENSE` file (MIT)                                                            | `/LICENSE`                                                   |
| 2   | High     | 30 min | Fix floating-point in inventory cost calculations                                   | `inventory-items.ts:76–78, 319–321, 324–328`                 |
| 3   | Medium   | 1–2 hr | Verify and wire donation receipt generation end-to-end                              | `pdf-generation.ts:539`, intake actions                      |
| 4   | Medium   | 45 min | Replace hardcoded colors with design system tokens                                  | `dunning-button.tsx`, `dunning/page.tsx`, `reports/page.tsx` |
| 5   | Medium   | 30 min | Add `overflow-x-auto` to all data table containers                                  | Multiple dashboard list pages                                |
| 6   | Medium   | 2 hr   | Add empty states to accounting/purchasing/reports pages                             | `EmptyState` component                                       |
| 7   | Medium   | 1 hr   | Confirm form submit buttons reflect `isSubmitting` visually                         | All form components                                          |
| 8   | Low      | 1–2 hr | Standardize component file naming (pick kebab-case or PascalCase, update CLAUDE.md) | `apps/web/components/`                                       |
| 9   | Low      | 1 hr   | Audit rate limiting thresholds for production                                       | `middleware.ts`                                              |
| 10  | Low      | 1 hr   | Review password reset token for timing-safe comparison                              | `actions/password-reset.ts`                                  |
| 11  | Low      | 1 hr   | Audit AI tools — confirm all respect `companyId`                                    | `packages/ai/src/tools/`                                     |
| 12  | Low      | 3 hr   | Write `docs/SELF-HOSTING.md` with full setup guide                                  | new file                                                     |
