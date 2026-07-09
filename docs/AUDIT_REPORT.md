# Codebase Audit Report

**last_modified_date**: 2026-07-09
**last_modified_summary**: Phase 1 UI migration — all settings subpages use SettingsSubpageHeader; CsvDropZone wired into inventory and product import panels. Phase 2: idempotency on PATCH/PUT, OpenAPI webhooks docs, list page Buttons, POS responsive, revamp-it syncP2POrderToKivvi.
**Previous Audit**: 2026-04-23
**Auditor**: Claude (Cursor Agent)
**Branch**: main
**Commit**: 5721633 (pre-audit-fixes; SSOT pass uncommitted)

---

## Executive Summary

A deep SSOT / SoC / DRY audit covered domain logic, revamp-it integration, UI consistency, and config drift. Kivvi's core architecture remains strong (unified documents, Decimal.js, tenant isolation, config-driven document types). The main risks were **parallel definitions** (status transitions, overdue eligibility, webhook payloads) and **UI duplication** (settings headers, import drop zones, pricing math in components).

This pass **fixed critical integration and correctness issues** and established shared primitives for ongoing consolidation. Remaining work is phased below — a full "every corner" refactor is tracked as multi-PR roadmap, not a single session.

---

## Health Score

| Area                              | Before     | After (this pass) | Notes                                                                    |
| --------------------------------- | ---------- | ----------------- | ------------------------------------------------------------------------ |
| First Principles (SSOT, layering) | 8.5/10     | **9.2/10**        | Transitions + overdue centralized; nav badges in domain                  |
| Best Practices                    | 9.0/10     | **9.3/10**        | Webhook coalescing; P2P gross invariant                                  |
| revamp-it Integration             | 7.5/10     | **8.5/10**        | Full webhook payload; sellInventoryItem emits; OpenAPI transitions fixed |
| UI/UX & Responsive                | 8.0/10     | **8.4/10**        | SettingsSubpageHeader + BackButton; repair-import i18n fix               |
| **Overall**                       | **8.5/10** | **9.0/10**        | Production-ready; revamp-it wiring still pending                         |

---

## Fixes Applied (2026-07-09)

### Domain / SSOT

| Change                                                                                    | File(s)                                          |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `VALID_DOCUMENT_TRANSITIONS` + `isValidDocumentTransition`                                | `packages/core/src/config/document-constants.ts` |
| `OVERDUE_ELIGIBLE_STATUSES` = `OPEN_STATUSES` (fixes nav undercount)                      | `document-constants.ts`                          |
| `OVERDUE_CANDIDATE_STATUSES` for display logic                                            | `document-constants.ts`, `utils/overdue.ts`      |
| Nav badge queries → `getNavBadges()`                                                      | `packages/core/src/domain/nav-badges.ts`         |
| Pricing helpers: `calculatePartsTotal`, `calculateSaleMargin`, `calculateConsignorPayout` | `inventory-items.ts`                             |
| Unified webhook payload `buildInventoryItemWebhookPayload`                                | `inventory-items.ts`                             |
| `sellInventoryItem` + `updateItemCondition` emit webhooks                                 | `inventory-items.ts`                             |
| PATCH coalescing (one webhook per request)                                                | `api/v1/inventory-items/[id]/route.ts`           |
| P2P `sellerPayout` balance validation + strict date                                       | `accounting-integration.ts`                      |

### UI / SoC

| Change                                                   | File(s)                                                  |
| -------------------------------------------------------- | -------------------------------------------------------- |
| `BackButton`                                             | `components/back-button.tsx`                             |
| `SettingsSubpageHeader`                                  | `components/settings-subpage-header.tsx`                 |
| `CsvDropZone` (shared import shell)                      | `components/import/csv-drop-zone.tsx`                    |
| Settings pages migrated                                  | `data-repair`, `webhooks`, `api-tokens`, `repair-import` |
| `DetailPageHeader` uses `BackButton` + responsive layout | `page-header.tsx`                                        |
| Item pricing card uses domain helpers                    | `item-pricing-card.tsx`                                  |

### Docs / Contract

| Change                                                            | File(s)                            |
| ----------------------------------------------------------------- | ---------------------------------- |
| OpenAPI item transition diagram synced with `item-transitions.ts` | `docs/openapi.yaml`                |
| Webhook payload SSOT + PATCH coalescing documented                | `docs/SYSTEM_DESIGN.md`            |
| Repair import section distinct i18n keys                          | `en.json`, `de-CH.json`, `fr.json` |

---

## Remaining Issues (Prioritized Roadmap)

### Phase 1 — Quick wins (1–2 days)

1. **Migrate remaining settings pages** to `SettingsSubpageHeader` (sequences, company, modules, …).
2. **Replace local `FileDropZone`** in `inventory-import-panel.tsx` and `product-import-panel.tsx` with `CsvDropZone`.
3. **Use `Button` component** on list pages instead of hand-rolled primary link classes (~30 files).
4. **Add OpenAPI webhooks section** (events, payload, HMAC headers).
5. **Document idempotency** on all write endpoints in OpenAPI.

### Phase 2 — Domain extraction (3–5 days)

1. Move `data-repair.ts` business logic → `packages/core/src/domain/data-repair.ts`.
2. Move settings CRUD → `packages/core/src/domain/settings.ts`.
3. Move donation receipt total + onboarding CSV pricing → domain.
4. CO2 aggregation → `packages/core/src/domain/impact.ts`.
5. Derive picker/table types from `$inferSelect` / domain query return types.

### Phase 3 — UI consistency (3–5 days)

1. `DocumentList` → `PageHeader` (all sales/intake doc routes).
2. `ReportPageHeader` for report drill-downs.
3. Extend `EmptyState` for webhooks, banking, chart-of-accounts.
4. **POS responsive layout** (`flex-col lg:flex-row`).
5. Mobile card layouts for fixed-grid tables (sequences, price lists, chart of accounts).

### Phase 4 — Integration hardening

1. **revamp-it**: deploy #206; implement `syncP2POrderToKivvi`; send `sellerPayout` in agency-sales body.
2. **Idempotency** on `PATCH /inventory-items/{id}` and `PUT /documents/{id}` (status transitions).
3. **Defer `sellInventoryItem`** until invoice `sent`/`paid` (align owned-stock flow with §3.1).
4. Generate chart colors from CSS vars (eliminate `chart-colors.ts` hex drift).

### Phase 5 — Strategic

1. Collapse revamp-it dual-write (storefront reads owned-item facts live from Kivvi).
2. OpenAPI schemas generated from Zod/Drizzle (eliminate manual drift).
3. Extract god components (roadmap page, data-quality-panel, contact-form, document-form).

---

## Critical Findings Reference (Pre-Fix)

### Document workflow drift

- Domain allowed `draft → confirmed`, `sent → paid`; UI actions were a subset.
- **Mitigation**: transitions now SSOT in `document-constants.ts`; UI should validate actions against `isValidDocumentTransition` (Phase 2).

### Overdue triple definition

- Nav badge used `["sent", "partially_paid"]`; display used broader set.
- **Fixed**: nav uses `OPEN_STATUSES` via `OVERDUE_ELIGIBLE_STATUSES`.

### Webhook gaps (revamp-it)

- `status_changed` had partial payload; combined PATCH doubled events; `sellInventoryItem` silent.
- **Fixed** in this pass.

### UI duplication

- 3 parallel CSV import stacks; 3 settings back-button variants; inconsistent `h1` sizes.
- **Partially fixed**; Phase 1–3 completes migration.

---

## Automated Checks (post-fix)

```
pnpm --filter @kivvi/core test  → 1087 passed
pnpm type-check                 → 4/4 packages green
```

---

## Action Items

- [x] Centralize document status transitions
- [x] Fix overdue nav badge undercount
- [x] Unify inventory webhook payload + coalesce PATCH
- [x] Emit webhook from sellInventoryItem
- [x] P2P sellerPayout validation
- [x] Shared BackButton / SettingsSubpageHeader / CsvDropZone
- [x] OpenAPI transition diagram fix
- [x] Migrate all settings subpages to SettingsSubpageHeader
- [x] Wire CsvDropZone into import panels (inventory + product)
- [ ] Button migration on remaining list pages
- [ ] revamp-it syncP2POrderToKivvi + webhook receiver deploy
- [ ] OpenAPI webhooks + idempotency documentation
- [ ] data-repair domain extraction
- [ ] Responsive POS + fixed-grid tables
