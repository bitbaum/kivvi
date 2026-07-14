# Posting-Group Revenue Routing — Implementation Spec

**created_date**: 2026-07-13
**Status**: draft spec (not yet implemented)
**Implements**: Tier 1.1 of [`KIVITENDO_REPLACEMENT_GAPS.md`](./KIVITENDO_REPLACEMENT_GAPS.md) — the #1 cutover item. Unblocks Tier 1.2 (repair-labor) and 1.3 (Richtpreis).
**Ground truths served**: #5 (system authoritative — one revenue account per stream, config not code) and #6 (mechanical work automated — the right Erlöskonto is chosen automatically).

---

## 1. Problem

Kivvi routes all sales revenue to exactly **two** accounts, chosen by `products.type`:

```
account-mappings.ts → invoiceSent.revenueAccount = "3000" (product)
                                serviceRevenueAccount = "3200" (service)
accounting-integration.ts → buildInvoiceRevenueLines(): item.productType === "service" ? 3200 : 3000
```

revamp-it's real accounting identity has **many** revenue streams, each to its own Erlöskonto. From their live Kivitendo export (`revampit/daten/buchungsgruppen_posting_groups.csv`), which their live app still reads (`src/config/analyse/metrics.ts`, tagged `source: 'kivitendo'`):

| Buchungsgruppe                 | Erlöskonto Inland | Aufwandskonto Inland |
| ------------------------------ | ----------------- | -------------------- |
| Warenverkauf                   | **3100**          | 4000                 |
| Reparaturen                    | **3400**          | 6700                 |
| Dienstleistungen und Sonstiges | 3400              | 6700                 |
| Integrations-Arbeitsplätze     | **3450**          | 5830                 |
| Spenden                        | **3500**          | 8500                 |
| Mitgliederbeiträge             | **3610**          | 6700                 |
| Richtpreis-Aufstockung         | **3510**          | 8500                 |
| Richtpreis-Reduzierung         | **3803**          | 3803                 |
| Versandspesen                  | 3400              | 4710                 |
| Liftbenutzung                  | 6110              | 6110                 |
| Externe Arbeiten               | 5006              | 6700                 |
| Ausserordentliches             | 8510              | 8500                 |

Today none of this can be represented — every sale lands in 3000/3200. Their P&L, and the dashboards that read it, are impossible to reproduce. **This is the single biggest blocker to retiring Kivitendo for revamp-it.**

---

## 2. Model — port Kivitendo's `Buchungsgruppe`

A **posting group** is a named bundle of GL accounts assigned to an article; it decides which Erlöskonto a sale credits (and, later, which Aufwandskonto a purchase debits). This is exactly Kivitendo's `Buchungsgruppen` concept — we adopt it 1:1, minus the tax-zone columns (revamp-it is CHF-only domestic; see §8).

---

## 3. Schema deltas (`packages/database/src/schema.ts`)

### New table `postingGroups`

```
postingGroups
  id                 uuid pk
  companyId          uuid   -- tenant isolation (GT #4)
  name               text   -- "Reparaturen", "Warenverkauf", "Spenden"
  revenueAccountId   uuid   FK accounts  -- Erlöskonto Inland (the sale credit)
  expenseAccountId   uuid?  FK accounts  -- Aufwandskonto Inland (purchase debit; §8 follow-on)
  inventoryAccountId uuid?  FK accounts  -- Warenbestand (future stock capitalization; unused today)
  isDefault          boolean default false  -- exactly one per company; the fallback
  isActive           boolean default true
  sortOrder          integer default 0
  createdAt / updatedAt
  UNIQUE (companyId, name)
```

Accounts are referenced by **id** (FK), not code string — the account must exist (SSOT/referential integrity). The journal builder resolves id → `code` with one join, because `createAutoJournalEntry` consumes account **codes**.

### Assign the group (3-level resolution, most specific wins)

- `products.postingGroupId       uuid?  FK postingGroups` — per-article, mirrors Kivitendo
- `productGroups.defaultPostingGroupId uuid? FK postingGroups` — bulk default for a whole Warengruppe
- `documentItems.postingGroupId  uuid?  FK postingGroups` — per-line override, and the only way for **freeform lines** (no catalog product) to be routed

All nullable; absence falls through to the next level, ending at the company default.

---

## 4. Resolution order (per document line)

```
resolveRevenueAccount(line):
  1. documentItem.postingGroupId          → its revenueAccountId   (explicit / freeform override)
  2. else product.postingGroupId          → its revenueAccountId
  3. else productGroup.defaultPostingGroupId → its revenueAccountId
  4. else company default postingGroup     → its revenueAccountId
  5. else (no posting groups configured)  → LEGACY: product.type === 'service' ? 3200 : 3000
```

Step 5 keeps the feature **additive and non-breaking**: a company that never configures posting groups behaves exactly as today.

---

## 5. Domain changes

### 5.1 `buildInvoiceRevenueLines` (`accounting-integration.ts:44`)

Change its input from `{ total, productType }[]` to `{ total, revenueAccountCode }[]` (the caller resolves the account). Keep the group-by-account-then-sum logic — it already produces one credit line per distinct account, which is exactly what multi-stream needs.

### 5.2 `createInvoiceSentJournalEntry` (`accounting-integration.ts:80`)

Extend the item query to resolve the revenue account per line via the §4 chain. One query with left joins:

```
documentItems
  ⟕ products            on documentItems.productId
  ⟕ productGroups       on products.productGroupId
  ⟕ postingGroups pgItem on documentItems.postingGroupId     (level 1)
  ⟕ postingGroups pgProd on products.postingGroupId          (level 2)
  ⟕ postingGroups pgGrp  on productGroups.defaultPostingGroupId (level 3)
  ⟕ accounts            to turn the chosen revenueAccountId into a code
```

Resolve `COALESCE(pgItem.rev, pgProd.rev, pgGrp.rev, companyDefault.rev, legacy(product.type))` per line, then hand `{ total, revenueAccountCode }` to `buildInvoiceRevenueLines`. VAT (2200) and debtor (1100) lines are unchanged — posting groups touch **revenue only**.

### 5.3 Credit-note reversal (`createCreditNoteSentJournalEntry`)

Currently hardcodes the 3000 debit (`account-mappings.ts creditNoteSent.debitAccount`). It **must mirror the same resolution** so a credit note reverses the _same_ Erlöskonten the original invoice credited — otherwise a Reparatur credit note wrongly debits 3000 instead of 3400. Reuse the §5.2 resolver.

### 5.4 New domain file `posting-groups.ts`

- `create/update/list/deactivate` posting groups (CRUD, company-scoped).
- `seedDefaultPostingGroups(db, companyId)` — see §6.
- `resolveLineRevenueAccounts(db, documentId)` — the shared resolver used by 5.2 and 5.3 (SSOT: one resolution path, not two).

---

## 6. Seeding & back-compat

**Every company** gets two seeded groups on creation, preserving today's behavior exactly:

- `Warenertrag` → 3000 (`isDefault: true`)
- `Dienstleistungen` → 3200

Because the default maps to 3000 and step-5 legacy fallback still keys on `product.type`, **existing companies and tests are unaffected** until they opt in by assigning richer groups.

**revamp-it** additionally gets their real 12 groups seeded (from the CSV table in §1). Prerequisite: the referenced Erlöskonten must exist in the seeded chart — verify/create `3100, 3400, 3450, 3500, 3510, 3610, 3803` (several are beyond the base KMU seed). `seedDefaultPostingGroups` should create any missing account before linking it.

---

## 7. Migration import hook

The Kivitendo article importer (`import-mappings.ts` `KIVITENDO_PRODUCT_PROFILE`) currently drops the `Buchungsgruppe`. Add:

- Map the article's `Buchungsgruppe` column → resolve/create a `postingGroups` row by name → set `products.postingGroupId`.
- One-time: import `buchungsgruppen_posting_groups.csv` → `postingGroups` (name + Erlöskonto/Aufwandskonto Inland), before articles, so article rows can link.

This makes the 4,134-article import land each article on its correct Erlöskonto with zero hand-mapping.

---

## 8. Scope decisions (KISS / YAGNI)

- **Revenue first.** This spec routes the _sale credit_ (Erlöskonto). The `expenseAccountId` column is added now but wiring purchase-invoice expense routing (Aufwandskonto) is a follow-on that reuses the identical structure on `createPurchaseInvoiceJournalEntry`. Small, deferrable.
- **No tax zones.** Kivitendo's per-zone Erlöskonto columns (EU mit/ohne USt-ID, Ausserhalb EU) are omitted — revamp-it books identically across zones and is CHF-only/0 %. The single `revenueAccountId` is the Inland account. If a future customer needs zones, add a `postingGroupAccounts(postingGroupId, zone, revenueAccountId, expenseAccountId)` child table — the assignment model above stays unchanged.
- **Richtpreis / Spenden / Mitgliederbeiträge need no special line type** — each is just an article (or freeform line) carrying the matching posting group (3510 / 3803 / 3500 / 3610). So Tier 1.3 Richtpreis reduces to "a UI to add the top-up/reduction line," which this spec unblocks.

---

## 9. Reporting impact (why this matters beyond bookkeeping)

No report code changes needed: `getProfitAndLoss` already groups by account, so once revenue is routed to 3100/3400/3450/3500/3610, each stream **appears as its own P&L line automatically** — reproducing revamp-it's Kivitendo Erfolgsrechnung and feeding the same accounts their live `analyse` dashboards read. Posting groups are orthogonal to **cost centers** (activity/fund dimension): posting group = _which revenue account_; cost center = _which activity/fund_. A repair sale can be 3400 (Reparaturen) **and** cost-center REPAIR simultaneously.

---

## 10. Acceptance suite

1. Invoice with mixed lines (a Warenverkauf article + a Reparatur article) → journal credits **3100 and 3400** separately, sums correct, 1100 debit = total, VAT unchanged.
2. Company with **no** posting groups → invoice still books 3000/3200 by product type (back-compat).
3. Freeform line (no product) with an explicit `postingGroupId` → routes to that group's account.
4. Resolution precedence: item override beats product beats product-group beats company default.
5. Credit note for a Reparatur invoice → **debits 3400**, not 3000.
6. revamp-it seed + `daten/` article import → spot-check 5 articles land on the Erlöskonto their `Buchungsgruppe` dictates; a full-import P&L groups revenue into their real streams.
7. Tenant isolation: a posting group / account from company A is never resolvable for company B.

---

## 11. Out of scope

- Purchase-invoice expense routing (Aufwandskonto) — follow-on, same structure.
- Tax-zone-specific accounts — deferred child table (§8).
- Automatic Richtpreis-delta calculation UI (separate Tier 1.3 item).
- Changing cost-center behavior (orthogonal).
