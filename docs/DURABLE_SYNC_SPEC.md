# Durable Sync for External Integrations (revamp-it & future)

**Status**: Proposed
**Owner**: TBD
**Ground truths served**: #1 (a transaction either happened or it didn't), #5 (system must be authoritative / SSOT)

---

## Problem

revamp-it drives Kivvi entirely through the token-authenticated `/api/v1/*` REST API
(inventory intake on Erfassung; invoice + payment + mark-sold on Payrexx checkout). The
integration works, but the wire is **one-way and best-effort**, which creates two real
correctness risks:

1. **The external API path emits no events.** Kivvi already has a complete outbound webhook
   system (`webhook_endpoints`, `webhook_deliveries` with retry cron, HMAC signing, settings
   UI, events `inventory_item.*` / `document.*` / `payment.received`). But `dispatchWebhookEvent`
   is called **only from the Server Action layer** (`apps/web/app/actions/documents.ts`,
   `actions/inventory-items.ts`). The `/api/v1/*` routes call domain functions directly
   (`createDocument`, `recordPayment`, …) and therefore fire **nothing**. So the exact path
   revamp-it uses cannot notify anyone — revamp-it is forced to fire-and-forget with no
   feedback and no way to reconcile.

2. **No idempotency on API writes.** `POST /api/v1/documents` and `POST /api/v1/documents/{id}/payments`
   (when no `bankTransactionId` is supplied — the card/Payrexx case) have no dedup guard. A
   retried Payrexx webhook — the normal behaviour of any payment gateway — creates a
   **duplicate invoice** and duplicate GL entries. That is corrupted books (violates #1).

Net effect today: an item can be sold and paid on the marketplace while the invoice silently
never lands in Kivvi's books, or lands twice. Neither is acceptable for an accounting system.

---

## Root cause (not a missing feature — a misplaced one)

Event emission is a **domain side-effect placed in the wrong layer**. It lives in each caller
(the Server Actions) instead of in the domain functions those callers share. The v1 API is a
second caller of the same domain functions and was never given the emission, so behaviour
diverges by entry point. Per Kivvi's own architecture rules, side-effects that must happen for
_every_ create/status-change belong in `packages/core/src/domain/`, emitted once, so all
callers inherit them (SSOT, Truth #5). Copy-pasting `dispatchWebhookEvent` into the API routes
would "fix" the symptom by duplicating the bug's cause — reject that approach.

---

## Proposed changes

### 1. Move webhook emission into the domain layer (SSOT)

Emit from the domain functions that own the state change, not from callers:

| Event                           | Emit inside                                     |
| ------------------------------- | ----------------------------------------------- |
| `document.created`              | `createDocument()`                              |
| `document.status_changed`       | `updateDocumentStatus()` / status-transition fn |
| `payment.received`              | `recordPayment()`                               |
| `inventory_item.created`        | `createInventoryItem()`                         |
| `inventory_item.updated`        | `updateInventoryItem()`                         |
| `inventory_item.status_changed` | inventory status-transition fn                  |

- Emission is best-effort and **must not** break the transaction that produced the state — keep
  the current fire-and-forget-with-logging behaviour of `dispatchWebhookEvent`, but enqueue the
  delivery row inside the same DB transaction as the state change so the event can't be lost if
  the process dies after commit (outbox pattern; `webhook_deliveries` already is the outbox).
- Remove the now-duplicate `dispatchWebhookEvent` calls from `actions/documents.ts` and
  `actions/inventory-items.ts` so there is exactly one emission site per event.
- Result: the `/api/v1/*` routes emit identically to the UI, with **zero changes to the route
  files**.

### 2. Idempotency keys on API writes

- Accept an `Idempotency-Key` request header on all `POST`/`PATCH`/`PUT` `/api/v1/*` routes.
- Add an `api_idempotency_keys` table: `(companyId, key)` unique, storing the first response
  (status + body) and a TTL. On replay with the same key + company, return the stored response
  without re-executing the domain function.
- Wire it in the shared `api-handler` so every write route gets it uniformly (one place, not per
  route). revamp-it's client sends the marketplace order id / Payrexx transaction id as the key.

### 3. (revamp-it side, tracked separately) stop fire-and-forgetting

Once Kivvi emits reliable events + honours idempotency, revamp-it can:

- Retry its intake/payment sync safely (idempotency makes retries free of duplicates).
- Subscribe to `payment.received` / `inventory_item.status_changed` to reconcile instead of
  assuming success.
- Add a periodic reconciliation job over rows where `kivviSyncStatus='error'`.

---

## Out of scope

- Building the webhook system (already exists).
- A Kivvi-hosted storefront/checkout — revamp-it owns the storefront by design.
- Bidirectional inventory ownership. SSOT stays explicit: **revamp-it is authoritative for
  listing/price/visibility; Kivvi is authoritative for the accounting record and canonical
  inventory item.** This spec makes Kivvi _notify_ revamp-it; it does not move ownership.

---

## Acceptance

- Creating an invoice / recording a payment / changing an item status **via `/api/v1/*`** fires
  the same webhook it fires via the dashboard (assert against `webhook_deliveries`).
- Replaying `POST /api/v1/documents` or `.../payments` with the same `Idempotency-Key` returns
  the original response and creates no second document/payment/GL entry.
- Exactly one emission site per event in the codebase (no duplication between actions and domain).
- Financial assertions use exact expected values (Ground Truth #2).
