# Repair Intake & Reparaturbonus — Cross-System Spec

**created_date**: 2026-07-13
**Status**: draft spec (not yet implemented)
**Companion to**: [`REVAMPIT_ERP_COMPANION_ROADMAP.md`](./REVAMPIT_ERP_COMPANION_ROADMAP.md) — this spec implements roadmap items 5–6 for the _repair_ flow specifically, plus the deposit/advance and subsidy accounting the roadmap left **policy-blocked** (§3).
**Boundary (unchanged)**: revamp-it remains the operational system of record. Kivvi is the ERP companion. This spec does **not** move appointment scheduling, technician matching, or diagnosis workflow into Kivvi.

---

## 1. Problem

The Kivitendo screen "Auftragseingang erfassen" (customer brings a device → record fault → quote a base cost → take an advance, reduced by the Stadt-Zürich Reparaturbonus) is a **revamp-it custom Kivitendo module**, not core Kivitendo. revamp-it already has the equivalent natively:

- `revampit/src/db/schema/services.ts` → `service_appointments` (fault = `description`, device = `deviceInfo`, quote = `quotedPriceChf`, lifecycle `requested → confirmed → in_progress → completed`), plus repairer matching, IT-Hilfe, and Workshops.

**The gap is not the form — it is the ledger.** Of all revamp-it flows, only _inventory_ and _marketplace_ project to Kivvi. Services/workshops/IT-Hilfe payments live only in revamp-it's `payment_transactions` (Payrexx) and never reach the GL — the "labor leakage" already named in the roadmap. Kivvi's `service-sales.ts` bridge (`POST /api/v1/services/sales`) catches the _money_ when a service is **paid in full**, but it does not model:

1. a **customer-owned device** (which must never become sellable stock),
2. an **advance / deposit** taken before the work is billed (a liability, not revenue), or
3. a **third-party subsidy** (Reparaturbonus) that splits who pays.

This spec closes those three, and makes a repair usable from **either** front-end while keeping a single source of truth.

---

## 2. Core principle — one master _per field_, not per process

A repair is two different kinds of fact about one real-world job. Give each exactly one owner; cross-link by id; never co-master a field.

| Fact                                                                                                           | Master                                         | Notes                                                                                      |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Operational job: scheduling, technician match, diagnosis, parts, completion, ratings, home visit               | **revamp-it** `service_appointments`           | Fast-changing, non-accounting. Kivvi never stores it.                                      |
| Financial artifacts: quote/final price, VAT, advance (Anzahlung), subsidy split, GL postings, invoice, payment | **Kivvi** `documents` + journal                | Kivvi must be authoritative about money (GT #1, #5).                                       |
| Device / fault text shown on the invoice                                                                       | Kivvi holds a **snapshot** copied from the job | Same as snapshotting a contact address onto an invoice — descriptive, not a second master. |

The two records reference each other:

- revamp-it `service_appointments.kivviRepairOrderId`
- Kivvi repair document's durable source key `repair:{source}:{sourceId}` (same convention as `service-sales.ts`).

**Consequence:** because no field has two masters, the two systems cannot disagree — the property that already makes the inventory sync trustworthy.

### 2.1 The customer is mastered by Kivvi — there is no revamp-it customer store

Kivvi's `contacts` are **real, imported from Kivitendo** — they are the authoritative customer records. revamp-it does **not** currently have a populated customer/user store: `service_appointments.userId` is a `NOT NULL` FK to revamp-it's `users` table (`revampit/src/db/schema/auth.ts`), but that table holds no real customers, so that column is vestigial for this purpose.

Therefore:

- **Kivvi `contacts` is the single source of truth for who the customer is.** There is no "map a revamp-it user to a Kivvi contact" step — there is no revamp-it user to map.
- Both front-ends resolve the customer **against Kivvi**: search `GET /api/v1/contacts`, or create via `resolveOrCreateContact` (inline name/email/phone) when it's a genuinely new walk-in.
- revamp-it references the customer by **`kivviContactId`**, not by its local `userId` (see §4.1).
- Practical corollary: because real customers live only in Kivvi today, the **"start in Kivvi"** path (§7) is the _primary_ repair-entry path right now, not a secondary one.

---

## 3. Kivvi side

### 3.1 Schema deltas (`packages/database/src/schema.ts`)

`repair_order` and `intake` are already in `DOCUMENT_TYPE_VALUES` (`packages/database/src/enums.ts`). Follow the **`intake` precedent** (which added nullable type-specific columns — `intakeSource`, `donorId`, `consignmentRate` — directly on `documents`) for scalar repair attributes:

Add to `documents` (all nullable, only meaningful when `type = 'repair_order'`):

- `deviceInfo text` — brand/model snapshot
- `faultDescription text` — "won't boot", customer's reported fault
- `advanceAmount numeric(12,2)` — deposit taken at intake (see §5.2)
- `externalJobRef text` — the revamp-it appointment id (also encoded in the source key)

Subsidy is **not** a scalar attribute — it is a first-class entity with its own settlement lifecycle and is reusable beyond repairs. New table:

```
subsidyClaims
  id            uuid pk
  companyId     uuid   -- tenant isolation (GT #4)
  documentId    uuid   -- the repair_order / invoice it reduces
  programKey    text   -- FK to config, e.g. 'reparaturbonus_zh'
  code          text   -- the bonus code presented by the customer
  faceAmount    numeric(12,2)   -- e.g. 100.00
  appliedAmount numeric(12,2)   -- min(faceAmount, cap% * repairTotal)
  status        enum(applied | claimed | settled | rejected)
  settlementParty text          -- 'ERZ Stadt Zürich'
  receivableAccountId uuid       -- GL account carrying the reimbursement
  settledAt     timestamptz
  externalRef   text            -- ERZ settlement batch ref
  createdAt / updatedAt
```

> **Design note (unified document model, CLAUDE.md):** we do **not** create a per-type document table. `documents` stays the single doc table; `subsidyClaims` is an _extension detail_ table keyed by `documentId` — the same relationship `documentPayments` / `documentItems` already have to `documents`.

### 3.2 Config SSOT — `packages/core/src/config/subsidy-programs.ts` (new)

Never hardcode Zürich. A subsidy program is config (GT #3 — a Bern repair café is the next tenant):

```ts
export const SUBSIDY_PROGRAMS = {
  reparaturbonus_zh: {
    label: "Reparaturbonus Stadt Zürich",
    faceAmount: "100.00",
    maxPct: 50, // ≤ 50% of the repair
    eligibleCategories: ["electronics", "clothing", "shoes"],
    settlementParty: "ERZ Stadt Zürich",
    settlementCadence: "monthly",
    receivableAccountCode: "1109", // Übrige Forderungen (subsidy receivable)
    validate: { kind: "reparaturbonus_zh_api" }, // how a code is checked (see §6)
  },
} as const;
```

### 3.3 Domain — `packages/core/src/domain/repairs.ts` (new)

Follows the `service-sales.ts` shape (one atomic, idempotent function per economic event; natural-key replay via `apiIdempotencyKeys`):

- `createRepairOrder(db, companyId, input)` — resolves/creates the billable contact (`resolveOrCreateContact`), inserts a `repair_order` document (device/fault snapshot, no stock movement), returns id. Idempotent on `repair:{source}:{sourceId}`.
- `recordRepairAdvance(db, companyId, { documentId, amount, method })` — books the deposit as a **liability** (§5.2).
- `applySubsidy(db, companyId, { documentId, programKey, code })` — validates against config + external registry (§6), writes a `subsidyClaims` row, computes `appliedAmount`.
- `finalizeRepairInvoice(db, companyId, { documentId })` — converts `repair_order → invoice`, recognizes service revenue (3200), nets the advance, and books the subsidy receivable (§5).

### 3.4 API (`apps/web/app/api/v1/repair-orders/`)

A dedicated thin route family, mirroring the `services/sales` precedent (a distinct economic shape earns its own endpoint; internally it calls the `repairs.ts` domain + the unified `documents` domain):

- `POST /api/v1/repair-orders` → `createRepairOrder`. Honors `Idempotency-Key`.
- `POST /api/v1/repair-orders/{id}/advance` → `recordRepairAdvance`.
- `POST /api/v1/repair-orders/{id}/subsidy` → `applySubsidy`.
- `POST /api/v1/repair-orders/{id}/finalize` → `finalizeRepairInvoice`.

Auth: Bearer `kv_…` token, same as all `/api/v1/*`.

### 3.5 UI (`apps/web/app/(dashboard)/repairs/new`)

Replace the bare `<DocumentForm type="repair_order" />` with a config-driven repair form (device, fault, advance, optional subsidy code) — built the way `intake/quick` already is, not a bespoke god-component. This is the **walk-in / back-office** entry path (§7). Kivvi captures the billable job; it does **not** schedule technicians.

### 3.6 Webhooks

`document.created` and `document.status_changed` already exist as webhook events. Ensure they fire for `type = 'repair_order'` from the **domain layer** (per roadmap item 1 — emission lives in `packages/core/src/domain`, so both the Server Action and `/api/v1` paths emit; SSOT).

---

## 4. revamp-it side

### 4.1 Schema deltas (`revampit/src/db/schema/services.ts`)

Add to `service_appointments`, mirroring the inventory-sync columns already proven on `inventory_items`:

- `kivviRepairOrderId text`
- `kivviContactId text` — the customer, resolved against Kivvi (§2.1). This is the real customer reference; `userId` is not.
- `kivviSyncStatus text` (pending | synced | failed)
- `kivviSyncedAt timestamptz`

> **Migration concern:** `service_appointments.userId` is currently `NOT NULL → users`, but revamp-it has no populated customer store (§2.1). Make `userId` nullable (or drop the customer meaning of it) so an appointment can be created against a `kivviContactId` alone. A repair started in Kivvi (walk-in) has a Kivvi contact but no revamp-it user — the schema must allow that.

### 4.2 Client (`revampit/src/lib/kivvi/client.ts`)

Extend the existing server-only client with `createRepairOrder`, `recordRepairAdvance`, `applySubsidy`, `finalizeRepairInvoice` — same Bearer auth + `Idempotency-Key` pattern already used for inventory/marketplace.

### 4.3 Push (revamp-it → Kivvi)

Trigger points in the appointment lifecycle (fire-and-forget with the existing durable-sync/reconciliation safety net, roadmap item 2):

- **quote approved / advance paid** → `createRepairOrder` (+ `recordRepairAdvance` if a deposit was taken). Store `kivviRepairOrderId`.
- **subsidy code entered** → `applySubsidy`.
- **completed & paid** → `finalizeRepairInvoice`.

This reuses the Payrexx webhook path that already posts marketplace money to Kivvi — services simply stop being the exception.

### 4.4 Receive (Kivvi → revamp-it)

`revampit/src/app/api/webhooks/kivvi/route.ts` already validates HMAC and is loop-suppressed (never calls back into Kivvi). Extend it: on `document.created` / `document.status_changed` where `type = 'repair_order'` and no local match, **upsert a `service_appointments` row** — this is the "employee started in Kivvi" path (walk-in), materialising the operational job for a technician. revamp-it then masters the operational fields from that point.

---

## 5. Accounting (Swiss KMU Kontenrahmen)

Three invariants. Illustrative postings; **VAT lines marked `‹policy›` are Treuhänder-gated** and must not be auto-posted until approved (roadmap §3).

### 5.1 A customer device is a bailment, never inventory

A `repair_order` produces **no stock movement and no `inventoryItems` row**. The device is the customer's property held temporarily; recording it as stock would corrupt valuation and inflate impact metrics (GT #2). Only _parts consumed_ (`repairParts`) and _labor_ are Kivvi's economic events.

### 5.2 Advance / deposit is a liability, not revenue

Intake advance received (e.g. CHF 22.50):

```
Dr 1020 Bank / Kasse            22.50
   Cr 2030 Erhaltene Anzahlungen      22.50   ‹policy: VAT-on-advance timing›
```

On finalize, the advance clears against the invoice:

```
Dr 2030 Erhaltene Anzahlungen   22.50
   Cr 1100 Debitoren                  22.50
```

> Received advances for taxable services can trigger VAT at receipt vs. at invoice depending on method (vereinbart/vereinnahmt). **Open policy question — flag to Treuhänder**, do not assume.

### 5.3 Subsidy splits who pays — customer share + settlement-party receivable

Repair total CHF 60, Reparaturbonus applied CHF 30 (≤50% cap), customer pays CHF 30. On finalize:

```
Dr 1100 Debitoren (customer)     30.00
Dr 1109 Forderung ERZ Bonus      30.00     -- subsidyClaims.receivableAccount
   Cr 3200 Dienstleistungsertrag       55.50   ‹policy: net vs. Subvention treatment›
   Cr 2200 Geschuldete MWST             4.50   ‹policy›
```

At the **monthly ERZ settlement** (out-of-band Abrechnung), the receivable clears:

```
Dr 1020 Bank                     30.00
   Cr 1109 Forderung ERZ Bonus         30.00
```

`subsidyClaims.status: applied → claimed → settled`.

> Whether the bonus is treated as taxable turnover or a genuine **Subvention** (non-taxable, but causing Vorsteuerkürzung, Art. 33 MWSTG) is exactly the donation/grant/subvention question the roadmap keeps Treuhänder-gated. **This spec does not decide it** — it provides the `subsidyClaims` structure so either treatment is a config/policy choice, not a schema change.

---

## 6. Reparaturbonus end-to-end (the `reparaturbonus-zh` dependency)

The bonus registry is a separate revamp-it project (`~/dev/reparaturbonus-zh`, Prisma). Today it offers only **unauthenticated** endpoints and no shop settlement:

- `GET /api/bonus-codes/{code}?verify=true` — look up value/expiry/used.
- `POST /api/bonus-codes/{code}/use` — mark used (uploads residence proof).
- Shop reimbursement is **out-of-band via ERZ, monthly**; the platform is a code registry, not a payment processor.

**Where each step lives** (operational vs. financial split, §2):

1. Customer presents code → **revamp-it** (operational, at the counter) calls `verify=true`, checks category eligibility + cap, calls `.../use` at completion.
2. revamp-it passes the validated `{ code, faceAmount, appliedAmount }` to Kivvi via `applySubsidy` → Kivvi books the receivable (§5.3).
3. Monthly ERZ Abrechnung → settle `subsidyClaims` (manual or a future import).

**Prerequisite / risk:** `reparaturbonus-zh` has no shop API auth and its `.../use` endpoint is unauthenticated. For a trustworthy shop→registry integration, add a shop-scoped authenticated redeem endpoint there. Until then, code verification is best-effort and the residence-proof step stays manual. Track as a dependency, not part of Kivvi's scope.

---

## 7. Either front-end can start a repair (bidirectional, idempotent)

- **Start in Kivvi** (primary today — the real customers live in Kivvi, §2.1): repair form (§3.5) selects/creates the Kivvi contact and creates the `repair_order` → `document.created` webhook → revamp-it materialises the `service_appointment` against `kivviContactId` (§4.4). revamp-it masters the operational workflow thereafter.
- **Start in revamp-it** (once its intake UI is wired to Kivvi contacts): job created locally with a `kivviContactId` → on quote-approved/paid, push to Kivvi (§4.3). Kivvi masters the money; revamp-it mirrors invoice/paid status back for display.

Both directions key on `repair:{source}:{sourceId}` and use `Idempotency-Key`; the `apiIdempotencyKeys` unique `(company_id, key)` index is the DB-level SSOT for "this repair is booked once" — so double-submission, retries, and webhook replays converge to one repair regardless of who started it. Loop-suppression (webhook receiver never calls back) prevents ping-pong, exactly as inventory sync already does.

---

## 8. Implementation order

1. Kivvi schema deltas (§3.1) + `subsidy-programs.ts` config (§3.2). `pnpm db:generate`.
2. `repairs.ts` domain + `createRepairOrder` (with `resolveOrCreateContact` against real Kivvi contacts) + webhook emission for `repair_order`.
3. Kivvi repair form (§3.5) replacing the generic DocumentForm. **This is the primary entry path today** (§2.1 — real customers live in Kivvi), so it comes early, not last.
4. revamp-it: nullable `userId` + `kivviContactId` on `service_appointments` (§4.1) and webhook receiver for Kivvi-initiated repairs (§4.4) — materialise the operational job.
5. Advance/deposit accounting (§5.2) — **behind the Treuhänder policy gate**; ship the `subsidyClaims`/advance _structure_ first, keep auto-posting of the VAT lines blocked until policy is approved.
6. `applySubsidy` + `subsidyClaims` + monthly-settlement clearing (§5.3).
7. revamp-it push path (§4.3), once its intake UI selects Kivvi contacts — closes labor leakage for jobs started operationally.
8. `reparaturbonus-zh` shop-auth redeem endpoint (dependency, §6).

---

## 9. Acceptance suite (extends roadmap §5)

Each must prove correctness, idempotency, replay safety, **and** that no device becomes stock:

1. Repair started in revamp-it, paid in full → one `repair_order`, one invoice, one payment to 3200; **no `inventoryItems` row created**.
2. Repair with advance → deposit booked to 2030, cleared on finalize, never double-counted as revenue.
3. Repair with Reparaturbonus → customer share + `subsidyClaims` receivable; monthly settlement clears the receivable; total revenue unchanged.
4. Repair started in Kivvi (walk-in) → webhook materialises exactly one revamp-it `service_appointment`; no loop-back.
5. Duplicate submission / retried Payrexx webhook / replayed Kivvi webhook → one repair, one set of postings.
6. Category ineligible or code expired → subsidy rejected, repair still books at full customer price.

---

## 10. Out of scope

- Moving appointment scheduling, technician matching, or diagnosis workflow into Kivvi (roadmap §3).
- Deciding the VAT treatment of advances or of the Reparaturbonus (Treuhänder policy — this spec provides structure, not policy).
- Treating Kivvi inventory as the public catalog.
- IT-Hilfe / workshop-specific accounting beyond the existing `service-sales.ts` bridge (unchanged).
