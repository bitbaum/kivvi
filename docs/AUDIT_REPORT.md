# Codebase Audit Report

**Date**: 2026-03-05
**Auditor**: Claude Code
**Branch**: main
**Commit**: e4c5791 (+ uncommitted multi-org membership changes)
**Audit iteration**: 4th (post multi-org membership implementation)
**Previous audit**: 2026-03-03 (3rd iteration, commit dff6829)

## Executive Summary

The Kivvi ERP codebase remains **production-ready with strong engineering discipline**. TypeScript strict mode reports 0 errors across 6/6 packages, and ESLint returns 0 warnings. A major multi-organization membership system has been implemented since the last audit, adding `memberships` and `invitations` tables, domain logic, server actions, invitation email flow, team management UI, and company switching — all with zero changes to the 145+ existing server actions thanks to the architectural decision to keep `users.companyId` as the "active company pointer."

Key strengths: config-driven unified document model, proper Swiss compliance (VAT, QR-bill, Rappen rounding, KMU Kontenrahmen), 16+ AI tools calling identical domain functions as the UI, comprehensive loading skeletons, error boundaries, ARIA accessibility with 44px touch targets, and now a fully functional multi-tenant membership system with invitation flow.

Key findings: float arithmetic for bank balances (HIGH — should use decimal.js), 7 near-identical document edit pages that should be consolidated (DRY violation), bulkDeactivate calling hard delete instead of soft delete (BUG), and missing loading skeletons for list/table pages.

## Health Score

| Area | Score | Prev | Notes |
|------|-------|------|-------|
| First Principles | 7.3/10 | 8.8 | Float arithmetic for money, DRY violation in edit pages |
| Best Practices | 8.5/10 | 9.2 | All checks pass, V1 API routes have mutations (by design) |
| Mission Alignment | 9.5/10 | 9.0 | All 6 areas implemented, multi-org adds SaaS readiness |
| Functional Correctness | 8.0/10 | 8.5 | BUG: bulkDeactivate hard-deletes, nested transactions |
| UI/UX & Responsive | 8.2/10 | 8.0 | Excellent touch targets, missing table skeletons |
| **Overall** | **8.3/10** | **8.7** | Score dip from new code surface area + discovered issues |

> Note: First Principles and Best Practices scores dropped because this audit was more thorough in identifying float arithmetic and DRY issues that existed previously but weren't flagged.

---

## Phase 1: First Principles

### Ground Truth #1 — Software exists to serve humans

**Score: 8/10**

- **Dead code detected**:
  - `apps/web/app/(dashboard)/sales/invoices/[id]/edit/edit-form.tsx` — deleted (git status shows `D` prefix), replaced by consolidated `edit-document-form.tsx`
  - Action factory pattern exists but only adopted in 1/19 action files

- **Unused imports/exports**: Clean — no significant unused exports found across domain modules.

### Ground Truth #2 — One Source of Truth (SSOT)

**Score: 6.5/10**

- **CRITICAL: Float arithmetic for bank balances** (HIGH)
  - `packages/core/src/domain/banking.ts` — uses JavaScript `Number` arithmetic for bank balance calculations. Per CLAUDE.md Ground Truth #2: "Money is not a float. Use decimal.js."
  - **Impact**: Balance calculations can produce IEEE 754 rounding errors on real financial data.
  - **Fix**: Convert all financial arithmetic in banking.ts to use `decimal.js`.

- **Membership role SSOT**: The new `memberships` table is correctly the SSOT for roles, with `users.role` kept for backward compatibility but `memberships.role` used in JWT refresh. Good.

- **Types derived from schema**: All membership/invitation types properly use `$inferSelect`/`$inferInsert` from Drizzle schema. Consistent with the rest of the codebase.

### Ground Truth #3 — Design for Change

**Score: 7/10**

- **DRY VIOLATION: 7 near-identical document edit pages** (HIGH)
  - `apps/web/app/(dashboard)/sales/invoices/[id]/edit/page.tsx`
  - `apps/web/app/(dashboard)/sales/quotes/[id]/edit/page.tsx`
  - `apps/web/app/(dashboard)/sales/orders/[id]/edit/page.tsx`
  - `apps/web/app/(dashboard)/sales/credit-notes/[id]/edit/page.tsx`
  - `apps/web/app/(dashboard)/sales/delivery-notes/[id]/edit/page.tsx`
  - `apps/web/app/(dashboard)/purchasing/purchase-orders/[id]/edit/page.tsx`
  - `apps/web/app/(dashboard)/purchasing/purchase-invoices/[id]/edit/page.tsx`

  All follow the same pattern: fetch document, render `EditDocumentForm`. Should be a single dynamic route `[docType]/[id]/edit/page.tsx` or a shared page component parameterized by type.

- **Multi-org architecture**: Excellent design — `users.companyId` as pointer + `memberships` as SSOT means zero changes to 145+ server actions. This is a textbook example of designing for change.

### Ground Truth #4 — Automate the Mechanical

**Score: 8/10**

- Auto-generation: Number sequences, journal entries, QR references all auto-generated.
- Migration backfill: Existing users automatically get `memberships` rows via SQL backfill.
- Invitation tokens: Auto-generated with `crypto.randomBytes(32)`.

### Ground Truth #5 — Simplicity Scales

**Score: 7.5/10**

- Domain functions are pure and composable.
- Membership guard logic (last owner protection, role hierarchy) is clean and localized.
- The invitation flow is straightforward: create token → send email → accept page → create membership.
- The 7 edit pages are unnecessary complexity (see Truth #3 above).

### Ground Truth #6 — Correctness Beats Speed

**Score: 7.5/10**

- Transaction usage is proper where it matters (invitation acceptance creates membership + marks invite atomically).
- Registration creates user + company + membership in a single transaction.
- However, the float arithmetic in banking.ts violates this truth.

---

## Phase 2: Best Practices

### Automated Checks

| Check | Result |
|-------|--------|
| `pnpm type-check` | 6/6 pass, 0 errors |
| `pnpm lint` | 0 warnings, 0 errors |
| console.log in production | None found (1 `console.error` in ai/engine.ts — acceptable for AI debugging) |
| Parameterized queries | All queries use Drizzle ORM parameterization |
| companyId filtering | All domain functions take companyId as required param |

### Critical Rules Compliance

- [x] **No floating-point for money in core calculations** — VAT, line items, totals use `decimal.js`
- [ ] **Banking module uses Number arithmetic** — Violates the rule (see Phase 1)
- [x] **All Server Actions return ActionResult<T>** — Consistent across all 19+ action files
- [x] **getSession() used in all server actions** — Returns `{ companyId, userId }`
- [x] **revalidatePath() called after mutations** — Consistent
- [x] **Zod validation at domain boundaries** — All actions validate input
- [x] **No client-side imports from @kivvi/core barrel** — Specific file imports used correctly

### New Code Review (Multi-Org Membership)

- `packages/core/src/domain/memberships.ts` — Clean domain logic, proper guards (last owner, role hierarchy), companyId in all queries.
- `packages/core/src/domain/invitations.ts` — Proper token generation, email normalization, transaction for accept.
- `apps/web/app/actions/memberships.ts` — Standard Server Action pattern, Zod validation.
- `apps/web/app/actions/invitations.ts` — Email sending is best-effort (try/catch, doesn't fail action). Good pattern.
- `apps/web/app/(auth)/invite/[token]/page.tsx` — Handles logged-in and logged-out states properly.
- `apps/web/components/sidebar.tsx` — Company switcher only shows for 2+ memberships. Clean.

### V1 API Routes

- `apps/web/app/api/v1/` — External API routes exist with mutations. This is intentional (external API access) and documented. Uses `api-auth.ts` for token-based authentication.
- **Finding**: V1 API routes could benefit from stricter input validation (Zod schemas at the boundary).

---

## Phase 3: Mission Alignment

| Area | Status | Evidence |
|------|--------|----------|
| **Swiss Compliance** | Implemented | VAT rates from config, QR-bill generation, Rappen rounding, KMU Kontenrahmen, CHF default, de-CH locale |
| **AI Integration** | Implemented | 16+ AI tools calling same domain functions as UI, audit trail, configurable providers |
| **Unified Document Model** | Implemented | Single `documents` table, config-driven behavior per type, document conversion |
| **Tenant Isolation** | Implemented | companyId on every table, every query filters by it, domain functions require it |
| **Self-Service Migration** | Implemented | CSV import with kivitendo profile auto-detection, Swiss number/date format handling |
| **Multi-Org Membership** | Implemented | memberships table, invitation flow, company switching, team management UI |

**Score: 9.5/10** — All planned mission areas are now implemented. Multi-org membership was the last major architectural gap for SaaS readiness.

---

## Phase 4: Improvement Roadmap

### Quick Wins (< 1 hour each)

1. **Fix bulkDeactivate hard delete BUG**
   - `packages/core/src/domain/contacts.ts` — `bulkDeactivateContacts()` calls `db.delete()` instead of setting `isActive = false`
   - Impact: Data loss on bulk operations
   - Fix: Change to `db.update().set({ isActive: false })`

2. **Remove dead code**
   - `apps/web/app/(dashboard)/sales/invoices/[id]/edit/edit-form.tsx` — git shows as deleted, clean up any remaining references

3. **Add `/invite` route to i18n config** (if not already done)
   - Ensure invitation page is accessible in all locales

### Medium Effort (1-5 hours each)

4. **Convert banking.ts to decimal.js** (HIGH PRIORITY)
   - Replace all `Number` arithmetic with `decimal.js` in `packages/core/src/domain/banking.ts`
   - Affects: balance calculations, reconciliation amounts
   - Test: Compare before/after with known financial data

5. **Add table loading skeletons**
   - Create `SelectableContactTableSkeleton` and `SelectableDocumentTableSkeleton`
   - Add to all list pages (contacts, products, invoices, etc.)
   - Reduces perceived load time on slow connections

6. **Implement toast notification system**
   - Add react-hot-toast or similar
   - Wire to Server Action results for success/error feedback
   - Replace the disabled notifications button in header

7. **Fix table headers on mobile**
   - Tables hide column headers on mobile (`hidden ... sm:grid`)
   - Show labeled card layout on small screens

8. **Strengthen V1 API input validation**
   - Add Zod schemas to all V1 API route handlers
   - Consistent with Server Action validation pattern

### Strategic Improvements (5+ hours)

9. **Consolidate 7 document edit pages into 1** (HIGH VALUE)
   - Create a single dynamic edit page parameterized by document type
   - Reduce ~500 lines of near-identical code to ~80 lines
   - Consistent with the unified document model philosophy

10. **Add RBAC enforcement in Server Actions**
    - Currently `getSession()` doesn't check membership roles
    - Phase 2 of multi-org: layer permission checks using `memberships.role`
    - Gate admin operations (team management, settings) to owner/admin roles

11. **Fix nested transactions**
    - Some server actions open a transaction, then call domain functions that also open transactions
    - Drizzle doesn't support savepoints — inner transaction silently uses outer
    - Audit all server actions for nested `db.transaction()` calls

12. **Add test coverage for new modules**
    - `packages/core/src/domain/memberships.ts` — untested
    - `packages/core/src/domain/invitations.ts` — untested
    - `packages/core/src/domain/banking.ts` — untested
    - `packages/core/src/domain/recurring-invoices.ts` — untested

---

## Phase 5: Functional Correctness

### Authentication & Authorization

- [x] NextAuth v5 with JWT strategy
- [x] `getSession()` helper throws if unauthorized, returns `{ companyId, userId }`
- [x] JWT refresh on company switch (`trigger === 'update'` reads fresh companyId, role from memberships)
- [x] Registration creates user + company + membership in transaction
- [x] Invitation accept creates membership in transaction
- [ ] **RBAC not enforced** — `getSession()` doesn't check `memberships.role`. Any member can perform any action. (Deferred to Phase 2 of multi-org plan)

### Critical BUG: bulkDeactivateContacts

- **File**: `packages/core/src/domain/contacts.ts`
- **Issue**: `bulkDeactivateContacts()` calls `db.delete(contacts)` instead of `db.update(contacts).set({ isActive: false })`
- **Impact**: Permanently deletes contacts instead of soft-deactivating them
- **Severity**: HIGH — data loss on bulk operations

### Nested Transactions

- Some server actions wrap calls in `db.transaction()` while the domain function also opens a transaction internally
- Drizzle ORM doesn't support savepoints — the inner `db.transaction()` silently uses the outer transaction
- **Impact**: No actual bug (inner transaction is no-op), but confusing and fragile
- **Fix**: Domain functions should accept `db | Transaction` type and let the caller decide

### Auto Journal Entry Balance Validation

- `packages/core/src/domain/accounting-integration.ts` — `createAutoJournalEntry()` creates journal entries without explicit debit/credit balance validation
- The standard `createJournalEntry()` in `accounting.ts` does validate balance
- **Impact**: Auto-generated entries could theoretically be unbalanced if there's a calculation bug

### V1 API Boundary Validation

- External API routes (`apps/web/app/api/v1/`) accept input without consistent Zod validation
- Uses `api-auth.ts` for authentication (API tokens), which is good
- **Recommendation**: Add Zod schemas matching the server action validation patterns

---

## Phase 6: UI/UX & Responsive Design

### Overall Score: 8.2/10

### Strengths

| Area | Score | Details |
|------|-------|---------|
| Responsive Design | 9/10 | Consistent mobile-first Tailwind patterns across all pages |
| Touch Targets | 9.5/10 | Nearly 100% adherence to 44x44px minimum (`min-h-[44px] min-w-[44px]`) |
| Loading States | 8/10 | Comprehensive skeletons on dashboard, missing on list pages |
| Empty States | 9/10 | Reusable `EmptyState` component with context-aware messages and CTAs |
| Error Handling | 8/10 | Error boundaries on every dashboard section, form validation with `role="alert"` |
| Accessibility | 8.5/10 | Skip-to-main, ARIA labels, focus-visible states, semantic HTML |
| Visual Hierarchy | 8.5/10 | Consistent typography scale, spacing, color usage |

### Key Findings

**Major Issues (2)**

1. **Table headers hidden on mobile**
   - Files: `selectable-document-table.tsx`, `selectable-contact-table.tsx`
   - Column headers use `hidden ... sm:grid` — invisible on phones
   - Users see data rows with no context about what each field means
   - Fix: Use card layout with inline labels on mobile

2. **Missing loading skeletons for tables**
   - All list pages (contacts, products, invoices, banking)
   - Tables render with a brief blank before data loads
   - Fix: Create skeleton components matching table structure

**Minor Issues (4)**

1. **No toast/notification system** — Notifications button disabled in header. No feedback for background operations.
2. **Line items grid cramped on tablet** — `grid-cols-2 sm:grid-cols-5` puts 5 fields in narrow columns at 640px.
3. **Document form summary on mobile** — Summary panel moves below form, forcing long scroll.
4. **Company switcher dropdown** — `absolute left-0 right-0` positioning could overlap on very narrow screens.

### Responsive Design Patterns

The codebase demonstrates excellent mobile-first design:

```
Base (mobile)     → Single column, stacked layouts
sm: (640px)       → Side-by-side elements, table headers visible
lg: (1024px)      → Full sidebar, multi-column grids
xl: (1280px)      → Wider content areas
```

Key responsive patterns found:
- Sidebar: `hidden lg:flex` (mobile uses overlay menu)
- Chat widget: Full-screen on mobile, fixed 420x600 panel on desktop
- Forms: Single column on mobile, multi-column on desktop
- Tables: Card-like stacked layout on mobile, grid on desktop

---

## Action Items (Prioritized)

### P0 — Fix Before Next Release

1. **Fix bulkDeactivateContacts BUG** — Changes `delete` to `update set isActive=false`
   - File: `packages/core/src/domain/contacts.ts`
   - Effort: 15 minutes

2. **Convert banking.ts to decimal.js** — IEEE 754 rounding on financial data
   - File: `packages/core/src/domain/banking.ts`
   - Effort: 2-3 hours

### P1 — High Value Improvements

3. **Consolidate 7 document edit pages** — Reduce ~500 lines of duplication
   - Files: All `[id]/edit/page.tsx` under sales/ and purchasing/
   - Effort: 3-4 hours

4. **Add table loading skeletons** — Improve perceived performance
   - Files: New skeleton components + all list pages
   - Effort: 2 hours

5. **Implement toast notification system** — User feedback for async operations
   - Effort: 2-3 hours

### P2 — Polish & Hardening

6. **Fix table mobile headers** — Add labeled card layout for phones
7. **Add RBAC enforcement** — Gate admin operations by membership role
8. **Strengthen V1 API validation** — Add Zod schemas
9. **Add tests for memberships/invitations** — New untested domain modules
10. **Audit nested transactions** — Ensure correct transaction boundaries

---

*Previous audit (2026-03-03) overall score: 8.7/10. Current score: 8.3/10. The dip reflects new code surface area from multi-org membership and more thorough discovery of pre-existing issues (float arithmetic, DRY violations) that were under-reported previously.*
