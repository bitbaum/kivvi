# revamp-it + Kivvi ERP Companion Roadmap

**created_date**: 2026-07-09
**Status**: working roadmap
**Boundary**: revamp-it remains its own application and database. Kivvi replaces kivitendo as the ERP companion, not as revamp-it's operational backend.

---

## 1. What Kivvi should do like kivitendo

Kivvi should cover the ERP jobs revamp-it used kivitendo for, with cleaner APIs and less manual recovery:

- Accounting ledger, journals, VAT, payments, receivables, payables, banking, dunning.
- Customer/vendor/contact records when they are financial counterparties.
- Invoices, credit notes, payment recording, QR-bill/payment matching, and document numbering.
- Product/item records where an ERP inventory/accounting record is needed.
- Import and historical migration from kivitendo exports.
- Auditability: stable document references, traceable postings, idempotent API writes, and replayable integration events.

This is the baseline: if revamp-it previously expected kivitendo to account for a money or inventory outcome, Kivvi should be able to account for it.

---

## 2. What Kivvi should do better than kivitendo

Kivvi should be the modern, AI-assisted ERP layer that reduces bookkeeping drag without taking over revamp-it's workflows:

- Idempotent REST APIs and signed webhooks for every revamp-it money/inventory projection.
- Durable sync state, reconciliation jobs, and admin-visible diagnostics for failed ERP projections.
- AI-assisted classification of unclear money-in events: sale, donation, grant/subvention, refund, pass-through, or manual review.
- AI-assisted banking reconciliation and suggestions, with human confirmation for uncertain postings.
- Service revenue automation for workshops, appointments, IT-Hilfe, repairs, and other paid flows.
- P2P/agency accounting that books only revamp-it's economics: commission, VAT on the fee, seller liability, and seller payout.
- Repair-labor prompts and revenue leakage checks based on logged work that should become invoiceable service lines.
- Drift detection between revamp-it operational state and Kivvi ERP projection, with safe replay keys.
- Treuhänder-gated helpers for donation/grant VAT effects, fiktiver Vorsteuerabzug, deposits, and advance payments.

The goal is not more ERP screens. The goal is fewer manual accounting interventions and fewer silent integration failures.

---

## 3. What Kivvi must not do

Kivvi must not become revamp-it's general backend or a duplicate revamp-it product:

- Do not move revamp-it's marketplace, checkout, P2P relationships, workshop scheduling, appointment booking, IT-Hilfe workflow, community CRM, CMS, or local user/profile model into Kivvi.
- Do not require revamp-it to abandon its database as the operational source for its own app workflows.
- Do not treat Kivvi inventory as the public marketplace catalog unless a narrow, explicit read-model pilot is designed and accepted.
- Do not book full-price revenue for P2P/agency sales.
- Do not automate donation, grant, advance-payment, or deposit accounting before the accounting policy is explicit and approved.
- Do not add broad generic ERP modules while current money paths still lack replay, diagnostics, and reconciliation.

---

## 4. Implementation order

1. Finish production ERP wiring: webhook endpoint, env vars, tenant token, default warehouse, and one-time backfill for owned items with missing/failed Kivvi sync.
2. Make existing inventory and marketplace ERP projections durable: sync status, replay keys, reconciliation worker, duplicate-webhook protection, and admin diagnostics.
3. Close the listed-status gap: when revamp-it publishes/lists an item, PATCH the Kivvi ERP item status to `listed`.
4. Bridge paid workshop registrations into Kivvi as service invoice/payment events, keyed by registration/payment id.
5. Bridge full-payment appointment flows into Kivvi as service invoice/payment events. Keep deposits out of scope until liability accounting is implemented.
6. Inventory all other paid revamp-it flows, especially IT-Hilfe and manually settled services, and map each to invoice/payment, agency/pass-through, or policy-blocked.
7. Standardize financial contact resolution: revamp-it user/community profiles stay in revamp-it; Kivvi contacts represent accounting counterparties.
8. Add AI-assisted ERP work: payment classification, reconciliation suggestions, drift detection, labor-to-invoice prompts, and Treuhänder-gated VAT warnings.

---

## 5. Acceptance suite

Each bridged flow must prove correctness, idempotency, and replay safety:

1. Owned inventory intake/edit/list/sell keeps revamp-it and Kivvi's ERP projection consistent.
2. Owned marketplace sale posts one invoice, one payment, and one sold-state ERP update.
3. P2P sale posts one agency sale and one payout, with no full-price revenue.
4. Workshop payment posts one service revenue event.
5. Appointment full payment posts one service revenue event.
6. Forced Kivvi/API failure can be retried without duplicate accounting artifacts.

---

## 6. Status (2026-07-10)

Implementation order:

1. **Done** — webhook dispatcher (`packages/core/src/domain/webhooks.ts`), `apiTokens`, idempotency keys, retry cron (`apps/web/app/api/cron/webhook-retry`).
2. **Done** — sync status enums, reconciliation (`banking.ts`), retry with backoff, admin diagnostics on the dashboard (`RevampitIntegrationHealth` + `integration-health.ts`).
3. **Done** — `listed` item status + `PATCH /api/v1/inventory-items/[id]` emitting `inventory_item.status_changed`.
   4–6. **Done** — one atomic, idempotent **service-sale bridge** covers all paid revamp-it service flows (workshop, appointment, IT-Hilfe, other): `POST /api/v1/services/sales` → `recordServiceSale` (`packages/core/src/domain/service-sales.ts`). Books one service invoice + one payment routed to service revenue (3200), idempotent by `service-sale:{source}:{sourceId}`. Deposits remain out of scope (liability accounting not yet built), per §3.
4. **Done** — `resolveOrCreateContact`; revamp-it profiles stay in revamp-it, Kivvi contacts are accounting counterparties only.
5. **Partial → advisory pieces done**:
   - Payment classification — `classifyMoneyIn` (`payment-classification.ts`) + `classify_payment` AI tool. Deterministic, advisory; donation/grant/refund/pass-through always flagged for Treuhänder confirmation (never auto-posted, per §3).
   - Labor-to-invoice prompts — `findUninvoicedRepairLabor` (`revenue-leakage.ts`) + `find_uninvoiced_repair_labor` AI tool.
   - Reconciliation — `reconcile_transaction` tool + `banking.ts` matching.
   - **Drift detection**: Kivvi-side projection health (failed webhooks, pending replays, missing wiring) is surfaced by `RevampitIntegrationHealth`. Full cross-system drift (revamp-it operational state vs. Kivvi projection) requires revamp-it to report its state to a Kivvi endpoint — deliberately out of scope until that contract exists, since Kivvi must not own revamp-it's operational data (§3).
   - Treuhänder-gated VAT automation for donation/grant/advance/deposit stays **policy-blocked** until the accounting policy is explicit and approved (§3).

Acceptance suite: 1 ✅ (webhooks on intake/edit/list + stock movements on sale), 2 ✅, 3 ✅, 4 ✅ (via service-sale bridge), 5 ✅ (via service-sale bridge), 6 ✅ (idempotency keys + durable source key).
