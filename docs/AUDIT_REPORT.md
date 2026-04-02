# Codebase Audit Report

**Date**: 2026-04-02
**Previous Audit**: 2026-03-31
**Auditor**: Claude Code
**Branch**: main
**Commit**: f1b4aab (uncommitted changes present)

## Executive Summary

Kivvi ERP is a mature, production-quality Swiss-native ERP. This audit found **zero critical vulnerabilities** and **zero type/lint errors**. The codebase demonstrates exceptional engineering discipline: SSOT enforcement is near-perfect, financial calculations use decimal.js throughout with Swiss Rappen rounding, tenant isolation is bulletproof across all 28+ domain functions, and the unified document model remains an architectural strength.

Since the last audit (2 days ago), notable improvements include: (1) dashboard workflow links fixed (were 404ing), (2) recent activity now shows financially relevant documents instead of zero-amount delivery notes, (3) product search autocomplete added to document line items, (4) contact quick actions added for direct document creation from contact list. The 29 AI tools continue to call the same domain functions as the UI.

Key findings this audit: (1) 13 components >300 lines (stable — complex forms and multi-section pages), (2) 64 pages missing error.tsx files (biggest gap — easy to fix with existing pattern), (3) 1 ESLint warning (missing dependency in useCallback), (4) excellent accessibility with WCAG AAA touch target compliance. No critical security or correctness issues found.

## Health Score

| Area                   | Score      | Prev    | Delta  | Notes                                                                  |
| ---------------------- | ---------- | ------- | ------ | ---------------------------------------------------------------------- |
| First Principles       | 9/10       | 9       | --     | SSOT excellent, 13 god components (justified), 3 minor SSOT violations |
| Best Practices         | 9/10       | 9       | --     | 0 type errors, 1 lint warning, all auth/validation/tenant checks pass  |
| Mission Alignment      | 9/10       | 9       | --     | All Swiss compliance requirements fully implemented, AI-first realized |
| Functional Correctness | 9.5/10     | 9.5     | --     | All critical flows verified, no bugs found, financial math correct     |
| UI/UX & Responsive     | 8/10       | 8       | --     | 74/75 loading states, 64 missing error.tsx, excellent accessibility    |
| **Overall**            | **8.9/10** | **8.9** | **--** | Stable, production-quality. Error.tsx gap is main improvement target.  |

---

## Phase 1: First Principles

### Ground Truth #2 — SSOT Violations (3 minor)

1. **Hardcoded status array** — `apps/web/app/(dashboard)/documents/page.tsx:238` uses `["draft", "sent", "confirmed", "paid", "overdue", "cancelled"]` instead of deriving from `documentStatusEnum.enumValues`.

2. **Document type groupings** — `apps/web/app/(dashboard)/documents/page.tsx:24-34` defines `OUTGOING_TYPES`, `INCOMING_TYPES` separately instead of deriving from `DOCUMENT_TYPES` config.

3. **Status literals in Money page** — `apps/web/app/(dashboard)/money/page.tsx:171,178` uses `status: "sent" as const` instead of referencing schema enums.

### Ground Truth #5 — God Components (13 files >300 lines)

| File                           | Lines | Justification                                           |
| ------------------------------ | ----- | ------------------------------------------------------- |
| `money/page.tsx`               | 580   | Multi-section financial overview — split candidate      |
| `contact-form.tsx`             | 516   | Complex multi-step form — split candidate               |
| `StepDataImport.tsx`           | 491   | CSV import wizard with preview                          |
| `import-transactions.tsx`      | 491   | Bank import with mapping UI                             |
| `document-detail.tsx`          | 436   | Document view with actions, items, payments             |
| `edit-document-form.tsx`       | 426   | Full document editor                                    |
| `selectable-contact-table.tsx` | 460+  | Table with selection, bulk actions, quick actions (new) |

### Ground Truth #6 — TypeScript Quality

- **`any` usage**: 116+ instances across codebase. Most are justified (AI provider compatibility, Zod generic types, Node.js fetch). No `any` found in financial domain code.
- **`@ts-ignore`**: 0 instances
- **`// eslint-disable`**: 0 instances in production code

### Positive Patterns

- Types derived from Drizzle schema via `$inferSelect`/`$inferInsert` throughout
- VAT rates centralized in `packages/core/src/config/vat-rates.ts`
- Document behaviors config-driven in `apps/web/lib/config/document-types.ts`
- Domain functions reused across UI + AI (zero duplication)

---

## Phase 2: Best Practices

### Automated Checks

| Check             | Result        | Details                                                        |
| ----------------- | ------------- | -------------------------------------------------------------- |
| TypeScript strict | **PASS**      | 0 errors                                                       |
| ESLint            | **1 WARNING** | `hooks/use-chat.ts:219` — missing `locale` in useCallback deps |
| Console.log       | **PASS**      | 0 in production code (only in e2e tests + env validation)      |
| SQL injection     | **PASS**      | All queries via Drizzle ORM, parameterized                     |

### Security Compliance (15/15 PASS)

| Rule                                 | Status               |
| ------------------------------------ | -------------------- |
| No console.log in production         | PASS                 |
| Logger used consistently             | PASS                 |
| Parameterized queries (Drizzle)      | PASS                 |
| Auth checks on all server actions    | PASS (28/28 actions) |
| Auth checks on all API routes        | PASS                 |
| CompanyId filtering on all queries   | PASS                 |
| ActionResult<T> error format         | PASS                 |
| Zod validation on all inputs         | PASS                 |
| db.transaction() for multi-table ops | PASS (27 usages)     |
| revalidatePath after mutations       | PASS                 |
| Naming conventions                   | PASS                 |
| Money uses decimal.js                | PASS                 |
| No float arithmetic on money         | PASS                 |
| Transactionality                     | PASS                 |
| Client component import safety       | PASS                 |

### Money Handling — Verified Correct

All financial calculations in `packages/core/src/domain/documents.ts:140-173` use `decimal.js`:

- Line-item VAT rounded per line (Swiss standard)
- Rappen rounding (CHF 0.05) via `rappenRound()`
- Prices stored as strings, never floats
- Zero instances of `parseFloat()` or `Number()` on monetary values in domain code

---

## Phase 3: Mission Alignment

| Area                     | Status      | Evidence                                     |
| ------------------------ | ----------- | -------------------------------------------- |
| Swiss VAT compliance     | Implemented | 8.1%/2.6%/0% configurable, per-line rounding |
| QR-bill generation       | Implemented | 27-digit MOD-10 reference, legally compliant |
| Swiss KMU Kontenrahmen   | Implemented | 227 accounts seeded on company creation      |
| CHF Rappen rounding      | Implemented | `rappenRound()` in swiss-currency.ts         |
| Date format DD.MM.YYYY   | Implemented | `de-CH` locale throughout                    |
| German document prefixes | Implemented | RE, AN, AU, GU, LS, MA, BE, ER               |
| AI-first architecture    | Implemented | 29 tools calling domain functions            |
| Self-service migration   | Implemented | 11 CSV mapping profiles, auto-detection      |
| Multi-tenant isolation   | Implemented | companyId on every table, every query        |
| Config-driven UI         | Implemented | Document behavior defined in config          |
| Unified document model   | Implemented | 9 types in one table                         |

---

## Phase 4: Improvement Roadmap

### Quick Wins (<1 hour each)

1. **Fix ESLint warning** — Add `locale` to dependency array in `hooks/use-chat.ts:219`
2. **Derive status array from schema** — `documents/page.tsx:238` → use `documentStatusEnum.enumValues`
3. **Replace hardcoded error colors** — 3 files use `text-red-600` instead of `text-destructive`
4. **Add error.tsx to route groups** — Create error.tsx at segment level (`/accounting/error.tsx`, `/banking/error.tsx`, etc.) to cover 64 pages with ~8 files

### Medium Effort (1-5 hours)

5. **Split money/page.tsx** (580 lines) into sub-components: AccountsList, TransactionList, FinancialSummary
6. **Split contact-form.tsx** (516 lines) into step sections: BasicInfo, AddressSection, FinancialDetails
7. **Reduce `any` count** — Narrow AI provider types where possible (types.ts, openai-compatible.ts)
8. **Add Dockerfile** — Still missing for production deployment

### Strategic Improvements

9. **Outgoing webhooks** — Event system to notify external services on mutations
10. **Email invoice sending** — Wire existing PDF generation + email transport for direct sending
11. **Direct bank connection** — EBICS integration to replace manual CAMT file upload
12. **Background job scheduler** — Enable recurring invoices and auto-dunning

---

## Phase 5: Functional Correctness

### Authentication & Authorization — VERIFIED

- NextAuth v5 with JWT strategy, 7-day maxAge
- Role sourced from `memberships` table (SSOT), not user.role
- Session refresh on JWT callback re-reads role from DB
- Middleware: deny-by-default, explicit PUBLIC_PATHS whitelist
- Rate limiting: 5-100 req/min by endpoint type
- All 28 server actions call `getSession()` or `requireRole()`
- All API routes verify auth via `authenticateApi()` or CRON_SECRET

### Financial Calculations — VERIFIED

- VAT per line item with `decimal.js`, rounded to 2 decimal places
- Rappen rounding (CHF 0.05) applied to document total
- Journal entries created atomically with document status transitions
- Payment recording prevents overpayment, updates status correctly
- Number sequences use atomic UPDATE...RETURNING (race-safe)

### Document Lifecycle — VERIFIED

- Status transitions validated via `VALID_TRANSITIONS` map
- Conversion chain (quote → order → invoice) copies items, generates new number/QR
- All multi-step operations wrapped in `db.transaction()`
- Idempotent payment recording (duplicate bankTransactionId returns existing)

### Tenant Isolation — VERIFIED

- Every domain function takes `companyId` as required parameter
- Every query filters by `eq(table.companyId, companyId)`
- API routes extract companyId from authenticated context
- No cross-tenant queries found in any code path

---

## Phase 6: UI/UX & Responsive Design

### Responsive Design — 9/10

- Mobile-first Tailwind approach throughout (base styles are mobile)
- Tables stack into card layout on mobile with inline key info
- Sidebar converts to overlay on mobile with backdrop
- No hardcoded widths that break mobile layout
- 2 instances of `overflow-x-auto` (appropriate for data tables)

### Touch Targets — 10/10

- All interactive elements meet 44x44px minimum (WCAG AAA)
- All icon-only buttons have aria-labels
- Consistent pattern: `min-h-[44px] min-w-[44px]` on icon buttons

### Loading States — 9.5/10

- 74/75 pages have `loading.tsx` with skeleton fallbacks
- Forms show `isPending` state with disabled buttons + spinner
- Suspense boundaries used with fallback skeletons
- Missing: `settings/repair-import` (1 page)

### Empty States — 9/10

- Consistent `EmptyState` component with icon, heading, description, CTA
- All list pages implement empty state pattern
- Context-aware messaging ("adjust filters" vs "create first")

### Error States — 3/10

- **64 pages missing error.tsx** — biggest UI gap
- Existing error pattern is excellent (Sentry logging, reset button, translated messages)
- Fix: Create error.tsx at route segment level (~8 files covers all 64 pages)

### Accessibility — 9/10

- Skip-to-content link present
- Focus trap in modals via `useFocusTrap` hook
- Keyboard shortcuts (Cmd+K, /, N, ?, Escape)
- Semantic HTML (proper roles, aria attributes)
- Form labels with htmlFor/id associations
- `aria-describedby` on form fields with errors

---

## Action Items

### Critical (Do First)

1. [ ] Create error.tsx at route segment level for 64 uncovered pages (~8 files)

### High Priority

2. [ ] Fix ESLint warning in `hooks/use-chat.ts:219` (add `locale` to deps)
3. [ ] Add Dockerfile for production deployment
4. [ ] Derive hardcoded status array from schema enum in `documents/page.tsx`

### Medium Priority

5. [ ] Split `money/page.tsx` (580 lines) into sub-components
6. [ ] Split `contact-form.tsx` (516 lines) into sections
7. [ ] Replace 3 hardcoded `text-red-600` with `text-destructive`
8. [ ] Re-enable CI with budget limits

### Low Priority

9. [ ] Narrow `any` types in AI provider layer
10. [ ] Add missing loading.tsx for `settings/repair-import`
11. [ ] Review SessionProvider/ThemeProvider wrapper components (may be unnecessary)

---

_Generated by Claude Code on 2026-04-02. Previous audit: 2026-03-31 (score 8.9/10)._
