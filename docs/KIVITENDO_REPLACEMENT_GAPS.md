# Kivitendo Replacement — Gap List (grounded in revamp-it's real usage)

**created_date**: 2026-07-13
**Status**: assessment — what's left before Kivvi can retire Kivitendo for revamp-it
**Method**: five code-verified module audits of `/home/g/dev/kivvi` (read actual implementation, not doc claims) cross-referenced with revamp-it's **real Kivitendo export** at `/home/g/dev/revampit/daten/` (19 CSVs, kivitendo v3.9.2, data 2007→2026-02) and their live app's ongoing Kivitendo dependency.

> Scope note: this is about replacing Kivitendo **for what revamp-it actually uses it for today** — not generic ERP completeness. Items that matter only for _other_ (VAT-paying) Kivvi customers are listed separately in §5 so they aren't confused with cutover blockers.

---

## 0. The headline that de-risks everything: revamp-it books at 0 % VAT

Their Kivitendo export is unambiguous — `daten/README.txt`: _"Tax setup: No VAT (0 % tax rates only — nonprofit/exempt entity)"_; `steuern_taxes.csv` has only two 0.00 % keys. **revamp-it does not file positive VAT.**

Consequence: the scariest gaps our audit found — no ESTV **MWST-Abrechnung** form, per-line VAT rate not preserved on import, effektiv-vs-Saldo method selection — are **largely moot for revamp-it**. They become §5 product items, not cutover blockers.

**The one thing Kivvi must not do:** force positive VAT. Verify a 0 % company can invoice, book, and run the VAT report with all-zero output without errors (§4 correctness checks).

---

## 1. What is already solid (the base is strong)

Code-verified as production-grade, with tests:

- **Sales invoicing**: Swiss QR-bill (valid MOD-10 27-digit reference), PDF (logo, line items, VAT breakdown, Zahlteil/Empfangsschein), per-line + Rappen rounding, gap-free atomic numbering. `documents.ts`, `pdf-generation.ts`, `document-totals.ts`.
- **Purchase invoices (Kreditoren)**: full create → journal (Dr Aufwand/Vorsteuer / Cr 2000) → payment. `documents.ts`, `accounting-integration.ts`.
- **Bank reconciliation inbound**: real CAMT.053/.054 parser, QR-reference + amount auto-matching, atomic payment+journal. `camt-parser.ts`, `banking.ts`.
- **Bilanz & Erfolgsrechnung**: correct double-entry math from journal lines. `reports.ts`.
- **Debtor aging, dunning escalation (Mahnstufe 1/2/3), recurring invoices, cost-center reporting, fiscal-year close mechanics** — all present.
- **Master-data importers** for contacts, vendors, products, stock. `import-mappings.ts`.

The high-volume core revamp-it runs daily (5,803 customers, 4,134 articles, full Angebot→Auftrag→Lieferschein→Rechnung cycle, AP, 9,333-row GL, dunning, stock) is covered.

---

## 2. TIER 1 — revamp-it's accounting identity (the real build)

These are the revamp-it-specific things a generic ERP lacks. They come straight from `daten/buchungsgruppen_posting_groups.csv` and are confirmed as **ongoing** (their live app's `src/config/analyse/metrics.ts` maps the same streams, tagged `source: 'kivitendo'`).

### 1.1 Revenue routing by posting group → Erlöskonto **[biggest gap]**

**Now:** Kivvi routes all revenue to just two accounts — `revenueAccount` 3000 / `serviceRevenueAccount` 3200 — chosen only by `products.type` (`account-mappings.ts`, `accounting-integration.ts:44-75`). Products/product-groups have **no** revenue-account field.
**Needed:** revamp-it books distinct streams to distinct accounts:

| Stream                                             | Account     |
| -------------------------------------------------- | ----------- |
| Warenverkauf                                       | 3100        |
| Reparaturen (repair labor)                         | 3400        |
| Dienstleistungen und Sonstiges                     | 3400        |
| Integrations-Arbeitsplätze (subsidized employment) | 3450        |
| Spenden (donations)                                | 3500        |
| Mitgliederbeiträge (membership)                    | 3610        |
| Richtpreis-Aufstockung / -Reduzierung              | 3510 / 3803 |

**Fix:** add a configurable **posting-group** concept — a revenue account (and optionally cost account) resolvable per product / product-group / document line, replacing the hardcoded product/service split. Follows Kivitendo's own `Buchungsgruppen` model. **Effort: L.** _This is #1 — their entire financial reporting identity, in both Kivitendo and their live dashboards, depends on it._

### 1.2 Per-employee work-hours → billable repair-labor line

**Now:** partial — `billing.ts` / `findUninvoicedRepairLabor` (`revenue-leakage.ts`) + the repair-labor-invoice API exist; `repairHours` is tracked. **Needed:** the wiki "Wunschliste" explicitly wants hours captured _per Mitarbeitende_ and summed, and their orders carry `Bearbeiter` + hourly price groups ("50/100 CHF pro Stunde"). Finish: hourly-rate config + hours→billable line on the repair document, booked to 3400. **Effort: M.** (Ties into the repair-intake spec, `REPAIR_INTAKE_AND_SUBSIDY_SPEC.md`.)

### 1.3 Richtpreis top-up / reduction (solidarity pricing)

Genuinely unusual, no generic ERP has it: a customer pays above or below a suggested price (Richtpreis); the **delta is booked separately** — surplus → 3510 (Aufstockung), shortfall → 3803 (Reduzierung). Central to how a solidarity-priced secondhand shop books income. Needs a line-level mechanism + the two posting groups from 1.1. **Effort: M** (once 1.1 exists).

### 1.4 `Mahnsperre` — per-contact dunning block

Their `kunden_customers.csv` and invoices carry `Mahnsperre` / `Mahnstufe`. Kivvi has dunning but must **honor a per-contact block** so blocked customers are skipped by the dunning cron. **Effort: S.**

---

## 3. TIER 2 — cutover mechanics (needed to go live cleanly)

### 2.1 Opening balances + open-items import **[cutover blocker]**

The real migration payload is **not** the 9,333-row history — it's **1,135 open receivables + 37 open payables + the trial balance** (`offene_forderungen_open_receivables.csv`, `summen_saldenliste_trial_balance.csv`). Freeze Kivitendo for the history (OR 958f archival). But the importer has **no opening-balance / trial-balance path** and **no open-items path** (audit: import-mappings covers master data + documents, not GL opening balances). Without this, day-1 Bilanz is wrong and no invoices are dunnable. **Fix:** an opening-balance journal import (trial balance → one dated opening entry) + open-AR/AP import as header-level open documents. **Effort: M.**

### 2.2 Closed-period locking

`closeFiscalYear()` sets `isClosed` and posts the P&L→2950 closing entry, **but nothing blocks new journal entries dated into a closed year** (`accounting.ts`). Audit integrity risk. **Fix:** reject postings into a closed period/year at the domain boundary. Also add opening-balance carry-forward so the next year doesn't start from zero. **Effort: S–M.**

### 2.3 Per-account statement (Kontoauszug) with running balance

Journal list exists, but there's **no drill-into-one-account view** with opening balance + running balance — which both revamp-it and their Treuhänder need to verify postings. **Effort: S–M.**

---

## 4. TIER 3 — operational robustness (daily-use quality)

- **Email delivery**: send is **synchronous, no retry/queue/delivery-tracking** (`actions/email.ts`, `lib/email/transporter.ts`). A slow Brevo call hangs the request; a failure is only logged. Add a queue + retry + a BCC-to-self archive. **Effort: M.**
- **Payment edge cases**: reconciliation has **no partial-payment split, no one-payment-across-multiple-invoices, no overpayment handling** (`banking.ts`). Common in practice. **Effort: M.**
- **Donation/grant triage wired to reconciliation**: `payment-classification.ts` (classifies Spende/Subvention/pass-through) **exists but isn't wired into the bank-reconciliation UI** — and revamp-it books Spenden (3500) + grants, so incoming non-invoice money needs this at the point of matching. **Effort: S–M.** _(Also the Art. 33 Subvention-vs-Spende VAT nuance — but moot while 0 % VAT.)_
- **Dunning polish**: no dunning **fee / Verzugszins / PDF letter** (text only); wiki wants batch ODT dunning templates. **Effort: M.**

---

## 5. Product-completeness items that do NOT block revamp-it

Real gaps, but not for _this_ cutover — flagged so they aren't conflated. Build when Kivvi onboards VAT-paying customers:

- **ESTV MWST-Abrechnung** (Ziffern 200/302/312/400/405…, effektiv + Saldosteuersatz). Moot at 0 % VAT. **Needed for any normal Swiss KMU customer — high value for the product, low for revamp-it.**
- **DATEV / Abacus export** for Treuhänder handoff (today: CSV only). revamp-it feeds their own analyse dashboards, so a clean journal/GL **export or API** may suffice; a full DATEV format is product-tier.
- **Comparative (prior-year) columns** in Bilanz/ER for a formal Jahresabschluss.
- **pain.001 creditor payment run** (pay suppliers via bank file). Only 37 open payables → likely handled via e-banking manually; low for revamp-it, medium for the product.
- **Creditor aging** (AP side); **multi-currency** (revamp-it is CHF-only); **recurring-invoice line overrides**.

---

## 6. Correctness checks to run before cutover

1. **0 % VAT path**: a company with only 0 % rates can invoice, confirm (journal has no 2200 VAT line), and run the VAT report with all-zero output — no crashes, no forced positive VAT.
2. **QR-IBAN vs. regular IBAN**: a 27-digit QRR reference is only valid with a **QR-IBAN** (IID 30000–31999). Confirm Kivvi pairs QRR↔QR-IBAN and falls back to SCOR/NON for a normal IBAN — otherwise banks reject the slip.
3. **Year-end carry-forward**: after `closeFiscalYear`, next year's opening Bilanz equals prior closing (currently not carried — see 2.2).
4. **Import round-trip**: import the real `daten/` trial balance + open items into a scratch company; Bilanz and open-items totals must match Kivitendo's `summen_saldenliste`.

---

## 7. Suggested sequence

1. **1.1 posting-group revenue routing** — unblocks 1.2/1.3 and their whole reporting identity.
2. **2.1 opening-balance + open-items import** + **2.2 period locking** — makes a clean go-live possible.
3. **1.2 work-hour billing**, **1.3 Richtpreis**, **1.4 Mahnsperre** — the remaining revamp-specific behavior.
4. **2.3 Kontoauszug**, then Tier 3 robustness (email, payment edge cases, donation triage, dunning polish).
5. §5 product items on the product roadmap, decoupled from revamp-it's cutover.

**Bottom line:** the transactional core is genuinely ready. What stands between Kivvi and retiring Kivitendo _for revamp-it_ is (a) their multi-stream revenue accounting (Tier 1), and (b) a clean opening-balance/open-items cutover with period locking (Tier 2). The VAT-filing and Treuhänder-export anxieties are **product-tier, not revamp-it blockers**, because they run at 0 % VAT.
