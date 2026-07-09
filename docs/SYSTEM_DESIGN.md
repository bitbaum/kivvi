# Kivvi — Exemplary System Design: Architecture, Integration & Accounting

**created_date**: 2026-07-02
**last_modified_date**: 2026-07-09
**last_modified_summary**: revamp-it `syncP2POrderToKivvi` contract implemented; Kivvi idempotency on PATCH inventory + PUT document status; OpenAPI webhooks section.
**Status**: Design reference (living doc)
**Audience**: Kivvi engineers + revamp-it ops + the Verein's Treuhänder (for the flagged VAT/NPO items)
**Scope**: How Kivvi + a storefront (revamp-it at `revampit.orangecat.ch`) form one coherent, automated, correct, and _helpful_ system.

---

## 1. Principles (the ground truths this design serves)

1. A transaction either happened or it didn't → every money event is recorded completely and atomically.
2. State defines behaviour → **one source of truth per fact**.
3. Automate the mechanical; reserve humans for judgment (grade, repair, price, tax classification).
4. Swiss law governs → VAT/NPO logic is validated by a Treuhänder before it is coded. Correctness beats speed.
5. Functional is the floor; **helpful is the goal** — Kivvi should guide, not just record.

---

## 2. Target architecture — hub-and-spoke, single source of truth

```
                 ┌──────────────── Kivvi (system of record) ───────────────┐
                 │  unique items · condition · price · lifecycle status     │
                 │  customers · invoices · accounting/GL · VAT · impact     │
                 └───────────────┬───────────────────────┬──────────────────┘
                     v1 REST API + signed webhooks (first-party)
        ┌───────────────────┬────┴───────────┬────────────────────┐
   revamp-it site        Ricardo            POS            (future channels)
   (marketplace,      (already a          (already a
    P2P, checkout)     Kivvi channel)      Kivvi channel)
```

- **Kivvi owns** the item-of-record (for owned stock), all pricing/condition truth, and **all accounting**.
- **The storefront owns** presentation, the P2P _relationship_, cart/checkout, and marketing/CMS — and **owns no catalog of its own truth**: it reads owned-item facts from Kivvi and writes back through the API.
- **The rule that prevents drift**: the storefront never keeps a second authoritative copy of price/condition/stock. If it caches, it invalidates on Kivvi's webhooks. (Today revamp-it still dual-writes; §3 hardens it, §6 collapses it.)

**Ownership split (SSOT per field):**
| Fact | Authority |
|---|---|
| Item identity, condition, price, lifecycle status | **Kivvi** |
| Accounting / GL / VAT / invoices | **Kivvi** |
| Web images, SEO, favourites, Q&A, cart | storefront |
| P2P seller relationship (`isRevampit=false`) | storefront (Kivvi only sees the agency economics — §4) |

---

## 3. Integration contract (revamp-it ↔ Kivvi) — verified, and how to make it live

### 3.1 Contract (verified to match Kivvi main and revamp-it PR #206)

**Forward (storefront → Kivvi)** — item created/edited on revamp-it:

- `POST /api/v1/inventory-items` on intake (Erfassung); `PATCH /api/v1/inventory-items/{id}` on edit.
- Bearer `kv_…` token; send an `Idempotency-Key` (revamp-it item id) so retries can't duplicate.

**Reverse (Kivvi → storefront)** — item changed in Kivvi:

- Kivvi emits signed webhooks from the **domain layer**, so API-origin changes fire too.
- Headers: `X-Kivvi-Event`, `X-Kivvi-Signature` = `HMAC-SHA256(rawBody, secret)` (hex).
- Body: `{ event, timestamp, companyId, data: { id, itemNumber, description, condition, status, warehouseId, askingPrice } }` — **same shape for `created`, `updated`, and `status_changed`** (SSOT: `buildInventoryItemWebhookPayload` in `inventory-items.ts`).
- Combined `PATCH /inventory-items/{id}` (status + fields) emits **one** webhook (`status_changed` wins). `sellInventoryItem` (invoice line with `inventoryItemId`) also emits `status_changed`.
- Receiver verifies the HMAC over the **raw** body, joins `data.id → inventory_items.kivviInventoryItemId`, maps `askingPrice→sellingPriceChf`, `condition→conditionOverride`, and delists the listing on a terminal status (`sold/returned/recycled/donated`).
- **Loop-safe**: receiver writes are internal and never push back; only human UI edits push forward.

**Field ownership on the wire**: storefront pushes item _data_ (title/price/condition); Kivvi pushes _lifecycle status_. Minimal overlap, deterministic.

### 3.2 Go-live checklist (the ops wiring — makes the connection actually work)

1. Deploy current **Kivvi `main`** (includes per-company modules, durable sync, repair-labor billing); run `pnpm db:push` or `pnpm db:migrate` so `api_idempotency_keys` exists.
2. Deploy revamp-it **#206** → the receiver goes live at `https://revampit.orangecat.ch/api/webhooks/kivvi`.
3. In Kivvi (revamp-it's tenant): **Settings → Webhooks → Add endpoint**
   - URL `https://revampit.orangecat.ch/api/webhooks/kivvi`
   - Events `inventory_item.updated`, `inventory_item.status_changed`
   - Generate a shared secret.
4. Set revamp-it env: `KIVVI_WEBHOOK_SECRET` (= step 3 secret), `KIVVI_API_URL`, `KIVVI_API_TOKEN`, `KIVVI_DEFAULT_WAREHOUSE_ID`.
5. One-time **backfill**: push owned items created before the integration (`kivviSyncStatus IS NULL/'error'`).
6. Add a **reconciliation cron** on revamp-it that retries `kivviSyncStatus='error'` rows (turns fire-and-forget into self-healing).

### 3.3 Known gap to close for "same product, right status"

An item lands in Kivvi at `intake` and does **not** auto-advance to `listed` when published for sale. Add: on publish/list, `PATCH` Kivvi status → `listed`, so Kivvi mirrors reality between intake and sale.

### 3.4 P2P marketplace sync contract (`syncP2POrderToKivvi`)

When Payrexx confirms payment, revamp-it must branch on **who owns the listing** — never on seller email domain.

```
payment confirmed (Payrexx webhook)
        │
        ├─ listing.is_revampit === true  →  syncOrderToKivvi()     (existing)
        │                                 invoice + payment + mark Kivvi item sold
        │
        └─ listing.is_revampit === false →  syncP2POrderToKivvi() (new)
                                          agency journal only — NO invoice, NO full revenue
```

#### Owned stock (`is_revampit=true`) — unchanged

Keep the current path in `payment-webhook.ts:syncOrderToKivvi`:

1. `POST /api/v1/documents` (invoice) → `PATCH …/status` → `sent`
2. `POST /api/v1/documents/{id}/payments`
3. `PATCH /api/v1/inventory-items/{id}` → `status: sold` (when backed by a Kivvi item)

Idempotency-Key on document create: `marketplace-order:{orderId}:invoice`

#### P2P facilitated sale (`is_revampit=false`) — agency model

**Do not** create an invoice or book full-price revenue. Call:

```
POST /api/v1/marketplace/agency-sales
Authorization: Bearer kv_…
Idempotency-Key: marketplace-order:{orderId}:paid
Content-Type: application/json
```

**Request body** (all amounts decimal strings, never floats):

| Field                 | Source                                      | Notes                                                         |
| --------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| `orderReference`      | `MO-{order.id}` or marketplace order number | Stable, human-readable                                        |
| `date`                | payment date `YYYY-MM-DD`                   | ISO 8601                                                      |
| `grossAmount`         | `order.amountChf`                           | What the buyer paid (incl. shipping if in total)              |
| `commissionAmount`    | net commission                              | Platform fee **excl. VAT**                                    |
| `commissionVatAmount` | computed                                    | VAT on the fee only (8.1% of `commissionAmount` when taxable) |
| `sellerPayout`        | `order.sellerPayoutChf`                     | Optional but recommended — when sent, must balance gross      |
| `sourceId`            | `order.id`                                  | UUID for journal `sourceId`                                   |
| `description`         | optional                                    | e.g. `P2P sale MO-… Payrexx {txnId}`                          |

**Invariant** (enforced by Kivvi Zod schema when `sellerPayout` is provided):

```
grossAmount = commissionAmount + commissionVatAmount + sellerPayout  (±0.01)
```

**At 0% commission** (`COMMISSION_RATE=0` today):

```json
{
  "orderReference": "MO-550e8400-e29b-41d4-a716-446655440099",
  "date": "2026-07-08",
  "grossAmount": "350.00",
  "commissionAmount": "0",
  "commissionVatAmount": "0",
  "sourceId": "550e8400-e29b-41d4-a716-446655440099"
}
```

→ Kivvi posts `DR 1020 / CR 2140` for CHF 350.00 (pure pass-through).

**With commission** (future `COMMISSION_RATE > 0`):

```json
{
  "orderReference": "MO-…",
  "date": "2026-07-08",
  "grossAmount": "110.81",
  "commissionAmount": "10.00",
  "commissionVatAmount": "0.81",
  "sourceId": "…"
}
```

→ `DR 1020 110.81 / CR 2140 100.00 / CR 3200 10.00 / CR 2200 0.81`

**Response** (success):

```json
{
  "success": true,
  "data": {
    "journalEntryId": "…",
    "reference": "MO-…",
    "sourceType": "marketplace_agency_sale"
  }
}
```

Retries with the same `Idempotency-Key` return the stored response (`Idempotent-Replayed: true`).

#### Seller payout (when funds released)

Separate event — do not combine with the paid webhook:

```
POST /api/v1/marketplace/payouts
Idempotency-Key: marketplace-order:{orderId}:payout
```

```json
{
  "amount": "100.00",
  "date": "2026-07-15",
  "reference": "PAYOUT-MO-…",
  "description": "Seller payout MO-…"
}
```

→ `DR 2140 / CR 1020`

#### Reference implementation sketch (revamp-it)

```typescript
async function syncP2POrderToKivvi(
  order: MarketplaceOrder,
  payrexxTxnId: string | null,
) {
  const commissionNet = order.commissionChf; // must be NET excl. VAT
  const commissionVat = computeCommissionVat(commissionNet); // 0 when rate is 0
  const sellerPayout = new Decimal(order.sellerPayoutChf);
  const gross = new Decimal(order.amountChf);
  // Assert: gross = commissionNet + commissionVat + sellerPayout (±0.01 rounding)

  await kivviFetch("/api/v1/marketplace/agency-sales", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KIVVI_API_TOKEN}`,
      "Idempotency-Key": `marketplace-order:${order.id}:paid`,
    },
    body: JSON.stringify({
      orderReference: `MO-${order.id}`,
      date: new Date().toISOString().split("T")[0],
      grossAmount: gross.toFixed(2),
      commissionAmount: commissionNet,
      commissionVatAmount: commissionVat,
      sourceId: order.id,
      description: payrexxTxnId ? `P2P Payrexx ${payrexxTxnId}` : undefined,
    }),
  });
  // No invoice. No inventory mark-sold (P2P items are not Kivvi owned stock).
}
```

#### Inventory import dry-run (10-item sample)

Fixture: `docs/fixtures/inventory-import-sample-10.csv` — upload at **Intake → Items → Import** (`/intake/items/import`). The file deliberately mixes ready rows, missing locations, duplicates, and incomplete info so the review UI can be exercised before any Shopware bulk import.

---

## 4. Accounting model — exact double-entry per transaction type

**Kivvi uses expense-as-incurred (periodic inventory):** purchases are expensed immediately (`4000 Warenaufwand`), inventory is **not** capitalized, and there is **no COGS on sale**. This is deliberate and correct — do not add COGS/inventory-asset/disposal-write-off entries; they would double-count.

Accounts per Swiss KMU Kontenrahmen. ✅ = works today · 🟡 = partial · 🔨 = to build · ⚖️ = **needs Treuhänder sign-off before coding**.

| Transaction                                 | Double entry                                                                                                                                                                                                                                                       | State                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| **Owned refurb sale**                       | invoice: `DR 1100 / CR 3000 + CR 2200 (VAT 8.1%)`; payment: `DR 1020 / CR 1100`                                                                                                                                                                                    | ✅                                                                           |
| **Purchase (parts/goods/services)**         | `DR 4000 + DR 1170 (Vorsteuer) / CR 2000`; payment: `DR 2000 / CR 1020`                                                                                                                                                                                            | ✅                                                                           |
| **Consignment sale**                        | sale as above **+** consignor share `DR 4200 / CR 2140`; payout `DR 2140 / CR 1020`                                                                                                                                                                                | ✅ (merged)                                                                  |
| **P2P secure sale (agency)**                | Kivvi books only revamp-it's economics: `DR 1020` gross; `CR 2140` pass-through owed to seller; `CR 3200` commission; `CR 2200` VAT on the fee only; payout `DR 2140 / CR 1020`. **No full-price revenue.** 0% commission collapses safely to `DR 1020 / CR 2140`. | ✅ Kivvi domain + tests; ✅ revamp-it `syncP2POrderToKivvi` (deploy pending) |
| **Customer repair**                         | parts already expensed at purchase (no COGS); labor `→ CR 3200 Dienstleistungserlöse` as an invoice line                                                                                                                                                           | ✅ tracked hours can now create a draft labor invoice                        |
| **Pure service (consulting/Linux install)** | `DR 1100 / CR 3200 + CR 2200`                                                                                                                                                                                                                                      | ✅ service invoice lines now route to 3200                                   |
| **Donated goods in**                        | none (expense-as-incurred → nothing capitalized). Optionally record fair-value donation income for transparency.                                                                                                                                                   | ✅ (no entry is correct); income = policy choice                             |
| **Monetary donation (Spende)**              | `DR 1020 / CR 3xxx Spenden` — **no** input-VAT reduction (Art. 33 Abs. 1)                                                                                                                                                                                          | 🔨 ⚖️                                                                        |
| **Grant / Subvention**                      | `DR 1020 / CR 3xxx Subventionen` **+ proportional input-VAT reduction (Art. 33 Abs. 2)**                                                                                                                                                                           | 🔨 ⚖️ (highest error-risk rule)                                              |
| **Purchased used goods**                    | full-price output VAT on resale **+ fiktiver Vorsteuerabzug (Art. 28a)** keyed to the per-item purchase price                                                                                                                                                      | 🔨 ⚖️ (~0 for donated stock)                                                 |
| **Foreign services (SaaS/ads)**             | **Bezugsteuer / reverse charge (Art. 45)** self-declared above CHF 10k/yr                                                                                                                                                                                          | 🔨 ⚖️                                                                        |
| **Advance payment / deposit**               | `DR 1020 / CR 2030 Erhaltene Anzahlungen` (liability, VAT deferred); settle on final invoice                                                                                                                                                                       | 🔨 (currently all to AR 1100)                                                |
| **Disposal / recycle / scrap**              | none (nothing was capitalized). If input VAT _was_ deducted on a purchased item → possible Eigenverbrauch/Vorsteuerkorrektur (Art. 31)                                                                                                                             | ✅ (no entry is correct) ⚖️ (Art. 31 edge case)                              |
| **Fixed assets / depreciation**             | manual journal entries for now                                                                                                                                                                                                                                     | ⚪ low (Kivitendo lacks it too — parity, not a regression)                   |

**Do NOT build:** German-style margin taxation (Differenzbesteuerung) — abolished for used goods in CH (2010); only art/collectibles (Art. 24a). Refurb IT is fully taxable at 8.1% regardless of donated origin.

---

## 5. Helpful, not just functional — the AI-first layer

Recording correctly is the floor. Kivvi should actively reduce the human's cognitive load and catch the errors above _before_ they hit the books. The same domain functions power the UI and the AI, so guidance is consistent.

**Proactive guidance (the highest-value "helpful"):**

- **Money-in classifier**: on an incoming payment with no matching invoice, Kivvi suggests _Spende vs. Subvention vs. sale_ and, if Subvention, warns: _"This triggers a proportional input-VAT reduction (Art. 33) — confirm the funded activity."_ Turns the single most error-prone rule into a guided step.
- **Repair labor prompt**: _"You logged 3.5 h on this repair — add a labor line at CHF X/h?"_ — closes the revenue-leakage gap.
- **Foreign-VAT watchdog**: on a foreign invoice without Swiss VAT, _"Bezugsteuer may apply — you're at CHF Y of the CHF 10k/yr threshold."_
- **Status nudge**: _"This item is listed for sale on revamp-it but shows `intake` in Kivvi — advance to `listed`?"_ (or automate via §3.3).
- **Reconciliation**: _"3 items failed to sync to the shop in the last hour — retry now."_
- **Fiktive-Vorsteuer helper**: for a _purchased_ (not donated) used item, prompt to capture the purchase price so Art. 28a can be computed.

**Command bar (Cmd+K, natural language)**: "50 laptops donated by UBS", "invoice the repair for K-00123", "how much VAT do I owe this quarter" — each maps to the same audited domain functions.

**Smart defaults & progressive disclosure**: per-company module toggles hide what a business doesn't use; a repair-café sees repairs, a vintage shop doesn't see data-erasure. Complexity appears only when needed.

**Guardrails as help**: API idempotency keys make retries safe; the P2P revenue guard stops phantom income; validation blocks unbalanced journals. Helpful = the system won't let you post something wrong.

**Smart inventory import** (`/intake/items/import`): a bulk import of secondhand items is never a blind insert — an external export (Shopware, a spreadsheet) often lists items we may no longer physically have, that lack key info, or whose location is unknown. Before anything is written, Kivvi classifies every row and asks the three questions a human would (`analyzeInventoryImportRows`, pure/testable):

1. **Do we actually have it?** Presence is _unconfirmed_ by default; a row can't be imported until a human ticks "present" (bulk-confirm available). This directly handles "most of which don't even exist".
2. **Do we have the right info?** A per-row completeness score + missing-field list; missing description blocks, missing price/condition/serial warn.
3. **Where exactly is it?** Each row must resolve to a warehouse (shop vs storage vs _which_ storage) — the free-text hint is matched to known warehouses (exact → unique-substring → ambiguous/unresolved is flagged, never guessed); shelf/bin is captured as a recommended detail.

The importer de-duplicates on serial number (against existing items and within the file), caps batch size to protect production, and reuses `createInventoryItem` so imported items inherit the same numbering + webhook behaviour as manual intake. Recommended flow: dry-run with ~10 rows, review the worklist, then scale up.

---

## 6. Roadmap (prioritized)

**Now — makes the connection actually work + closes revenue leakage (no tax-law dependency):**

1. Deploy + wire the sync (§3.2); add reconciliation + status-on-publish (§3.3).
2. Repair-labor billing (hours × rate → invoice line) + route service revenue to 3200. ✅
3. Cost centers (Kostenstellen) — per-activity P&L + grant reporting.

**After Treuhänder sign-off (⚖️ items) — Swiss NPO/VAT correctness:** 4. Subvention/Spende classifier + Art. 33 input-VAT reduction. 5. Fiktiver Vorsteuerabzug (Art. 28a) for purchased used goods. 6. Bezugsteuer (Art. 45) tracking for foreign services. 7. Monetary donation/grant income + (if FER 21 applies) restricted-fund accounting.

**Later — structural:** 8. ✅ P2P agency accounting (commission + pass-through liability) — Kivvi domain done (`recordMarketplaceAgencySale` / `recordMarketplacePayout`); remaining work is revamp-it calling it from the `secure sale paid` webhook (see §3.2) instead of booking a full-price invoice. 9. Advance-payment liability routing. 10. Collapse the dual-write (storefront reads owned-item facts live from Kivvi) → true SSOT. 11. Fixed assets/depreciation; Postgres RLS (defense-in-depth before scaling tenants).

---

## 7. Open items requiring Treuhänder / cantonal ruling (do not hard-code from inference)

- Whether **FER 21**, the **CHF 250k vs 100k VAT threshold**, or **Art. 21 exemptions** apply to _this_ Verein (depends on charitable status + activities).
- Exact mechanics of **Art. 28a** fiktive Vorsteuer and **Art. 33** Vorsteuerkürzung, and the **Art. 31** disposal edge case.
- Confirm CHF-0 fiktive Vorsteuer for donated goods against **ESTV MWST-Info 09**.

Statutory references here came from secondary sources; verify against Fedlex before implementing any VAT logic.
