# eCH-0217 VAT-Return Export (MWST-Abrechnung) — Implementation Spec

**created_date**: 2026-07-13
**Status**: draft spec (not yet implemented)
**Implements**: Opportunity B1 of [`SWISS_AUTHORITY_AUTOMATION.md`](./SWISS_AUTHORITY_AUTOMATION.md).
**Depends on**: [`IMMUTABLE_BOOKS_SPEC.md`](./IMMUTABLE_BOOKS_SPEC.md) (the return must reconcile to a final, immutable ledger). **Feeds/consumes**: Bezugsteuer (B2, Ziffer 380/381), Nicht-Entgelt flags (D4, Ziffer 900/910 → Vorsteuerkürzung 420), FER-21 subsidies.
**Ground truths**: #3 (Swiss law governs — the return must match the ESTV form exactly), #5 (authoritative — figures reconcile to the ledger), #6 (correctness).

> **Confidence.** _That the only accepted format is eCH-0217 spec E-MWST v2.0.0, uploaded (no submit API)_ = HIGH. _Exact Ziffer numbers and the XSD element/precision details_ = MEDIUM — validate against the official XSD (ech.ch/de/ech/eCH-0217/2.0.0) and a current ESTV form 0500/0510 before shipping. Marked `‹verify›` below.

---

## 1. Context

- **Online VAT filing is mandatory since 1 Jan 2025** (paper abolished). The portal is **"MWST-Abrechnung pro"** (AGOV login the sole method from 31 Oct 2026).
- It accepts **only eCH-0217 spec "E-MWST" version 2.0.0** XML (approved 17 Jun 2025); older/other formats are rejected.
- **There is no machine-to-machine submit API.** The flow is: **ERP generates the XML → the user uploads it** in the portal; company + period are auto-detected from the file.

So Kivvi's job is: (A) compute the return in the exact ESTV **Ziffern** structure as a human-review screen, and (B) serialize it as a valid **eCH-0217 v2.0.0 XML** for upload. Nothing submits automatically.

> **revamp-it note.** revamp-it books at 0 % VAT and is (below-threshold) not filing positive VAT — so this is a **product feature for VAT-paying KMU customers**, low personal value to them. For a 0 %/exempt company the requirement is only that the flow degrades cleanly (all-zero return, or "not VAT-registered" → feature hidden).

---

## 2. Current state

`getVatReport` (`reports.ts:514`) is a generic per-rate summary: it groups `documentItems.vatRate` for sales (`invoice` + `credit_note`) and purchases (`purchase_invoice`), computes VAT per rate, returns sales/purchase totals + payable. Gaps for a real return:

- **No ESTV Ziffern mapping** — no turnover block (200/220/…/299), no per-rate tax boxes, no input-tax split (400/405), no 500/510.
- **Credit notes are summed as positive with invoices** (`reports.ts:532`) — they must **reduce** turnover (Entgeltsminderung, Ziffer 235), not add to it. Correctness bug for the return.
- **No method selection** (effektiv / Saldo / Pauschal), **no cadence**, no annual option.
- **No ledger reconciliation**, no Nicht-Entgelt (900/910), no Bezugsteuer (380/381), no Vorsteuerkürzung (420).
- **No XML output.**

---

## 3. Deliverables

**(A) Ziffern-mapped VAT report + review screen** — aggregate the period into the exact effective-method boxes, shown for human review/adjustment before export.
**(B) eCH-0217 v2.0.0 XML serializer** — emit the reviewed figures as a schema-valid file; end at "download → user uploads."

---

## 4. Data sourcing & SSOT

The return needs both a **base (Entgelt)** and **tax per rate** — which live at the document/line level, not on journal lines. So:

- **Primary source = documents** (`documentItems`): net turnover per `vatRate` and per-line VAT. Sales invoices add to turnover; **credit notes subtract** (fix the current sign). Purchase-invoice input VAT → input boxes.
- **Control = ledger** (post-A1 immutable): sum the output-VAT account **2200** and input-VAT account **1170** for the period; the report **asserts** document-derived tax ≈ ledger VAT-account movement and **flags any divergence** (e.g. a manual VAT journal not tied to a document) for the user to resolve. This keeps the ledger authoritative while sourcing the Ziffern detail from documents.
- **Nicht-Entgelte** (Spenden/Subventionen): sourced from `payment-classification.ts` / the D4 flags → Ziffer 900 (Subvention, drives Vorsteuerkürzung 420) / 910 (Spenden). Not part of taxable turnover.
- **Bezugsteuer** (B2): reverse-charge self-assessment → 380/381 (and reclaimed via 400).

---

## 5. Ziffern mapping (effective method) — the config SSOT `‹verify numbers vs current ESTV form›`

Encoded in `packages/core/src/config/vat-return.ts` (never hardcoded in the report):

**Turnover / Umsatz**
| Ziffer | Meaning | Kivvi source |
|---|---|---|
| 200 | Total agreed consideration (all sales incl. exempt/zero) | Σ net of sales invoices − credit notes |
| 220 | Steuerbefreite Leistungen (Art. 23, exports) | lines flagged exempt |
| 221 | Leistungen im Ausland | lines flagged foreign place-of-supply |
| 225 | Übertragungen im Meldeverfahren | flagged transfers |
| 230 | Nicht-Entgelte (Subventionen etc.) | D4 classification (also 900) |
| 235 | Entgeltsminderungen | credit notes / discounts |
| 280 | Diverse (Wertverminderungen etc.) | manual |
| **289** | = Σ deductions (220+221+225+230+235+280) | computed |
| **299** | = 200 − 289 (steuerbares Gesamtentgelt) | computed |

**Tax / Steuer**
| Ziffer | Meaning | Source |
|---|---|---|
| 301/302 | Normalsatz 8.1 % — base / tax | turnover@8.1 |
| 311/312 | Reduziert 2.6 % — base / tax | turnover@2.6 |
| 341/342 | Beherbergung 3.8 % — base / tax | turnover@3.8 |
| 380/381 | Bezugsteuer — base / tax | B2 reverse charge |
| **399** | Total geschuldete Steuer | computed |

**Vorsteuer / input**
| Ziffer | Meaning | Source |
|---|---|---|
| 400 | Vorsteuer Material-/Dienstleistungsaufwand | purchase-invoice input VAT (opex) |
| 405 | Vorsteuer Investitionen/übriger Betriebsaufwand | purchase-invoice input VAT (capex) |
| 410 | Einlageentsteuerung | manual |
| 415 | Vorsteuerkorrekturen (gemischte Verwendung/Eigenverbrauch) | manual/config |
| 420 | Vorsteuerkürzungen (Nicht-Entgelte/Subventionen) | from 900 (Art. 33) |
| **479** | Total Vorsteuer | computed |

**Result**: **500** payable = 399 − 479 (or **510** refund). Declaratory: **900** Subventionen, **910** Spenden/Dividenden.

Rates come from the existing rate config (8.1/2.6/3.8; legacy 7.7/2.5/3.7 retained for corrections).

---

## 6. Company config (schema/settings)

Add to company settings (the `companies.settings` JSONB, or typed columns):

- `vatMethod`: `effective | net_tax_rate (Saldo) | flat_tax_rate (Pauschal) | none`.
- `vatCadence`: `quarterly | semi_annual | annual` (annual option since 2025, turnover ≤ CHF 5.005M).
- `saldoRates[]`: for Saldo/Pauschal, the industry flat rate(s) per activity (multi-rate allowed since 2025) — config, not hardcoded.
- **UID**: `companies.vatNumber` exists (`schema.ts:122`); require CHE-###.###.### MWST format for the return; validate via the UID service (A2).

---

## 7. Methods

- **Effektiv (v1 primary)**: §5 mapping; input VAT deducted; payable = output − input.
- **Saldosteuersatz (Saldo)**: invoice at statutory rates but remit an **industry flat rate on gross turnover**; **no separate input-VAT claim** (400/405 omitted). Eligibility ≤ CHF 5.024M turnover & ≤ CHF 108k tax; semi-annual; **multi-rate** (each activity > 10 % of turnover its own rate) since 2025. Different XML block (`netTaxRateMethod`).
- **Pauschalsteuersatz (Pauschal)**: the Saldo equivalent for public bodies / associations / foundations (no turnover cap; quarterly) — same shape as Saldo.

v1: implement **effektiv** end-to-end; build the config + XML block for Saldo/Pauschal (they share shape) but gate behind the method flag.

---

## 8. eCH-0217 v2.0.0 XML `‹validate against official XSD›`

- Root **`VATDeclaration`**, namespace **`http://www.ech.ch/xmlns/eCH-0217/2`**; depends on **eCH-0058 v5.1.0** (message envelope) + **eCH-0108 v6.0.0** (business/UID).
- `generalInformation`: UID, reporting period (from/to), method, and **`sendingApplication` = Kivvi** (name/version).
- Method block: **`effectiveReportingMethod`** (or `netTaxRateMethod` for Saldo) containing `turnoverComputation`, per-rate tax, **`acquisitionTax`** (Bezugsteuer), `inputTaxMaterialAndServices` (400), `inputTaxInvestments` (405), `payableTax`.
- Serialize deterministically; **validate against the official XSD** at build/test time (fixture-based) and at generation time (fail loudly on a non-conformant document — a rejected upload is worse than a blocked export).
- New `packages/core/src/domain/vat-return.ts`: `computeVatReturn(db, companyId, period)` → the Ziffern object (reused by the review screen); `serializeECH0217(vatReturn, company)` → validated XML string. Route: `GET /api/documents/vat-return/[period]/xml` (auth, tenant-scoped), returns the file for download.

---

## 9. Rounding / precision `‹verify vs XSD›`

Follow the XSD/ESTV rules: turnover typically whole **CHF** (rounded down), tax in **Rappen** (2 dp). Use decimal.js throughout (never floats). Per-line VAT is already correctly rounded upstream; the return sums those and applies the ESTV field precision — confirm exact rounding against the XSD.

---

## 10. Flow (explicit)

`compute → review screen (adjust exceptional boxes 280/410/415) → export eCH-0217 XML → user uploads to MWST-Abrechnung pro`. **No auto-submit exists — do not build one.** Also produce a **human-readable PDF** of the Ziffern (for records/Treuhänder), alongside the XML.

---

## 11. Reuse & ties

- **Immutable books (A1)**: the return is computed over a final, reconciled period; the 2200/1170 control check leans on ledger integrity.
- **Bezugsteuer (B2)** feeds 380/381 + 400.
- **Nicht-Entgelt / Art. 33 (D4)** feeds 900/910 + the 420 Vorsteuerkürzung — and connects to FER-21 subsidy funds.
- **UID validation (A2)** for the company's own UID.
- Replaces the current `getVatReport` (which becomes the effektiv summary underneath the Ziffern mapping; fix the credit-note sign there regardless).

---

## 12. Scope / out of scope

**In:** effektiv-method Ziffern report + review screen + eCH-0217 v2.0.0 XML export (validated) + config (method/cadence/UID) + the Saldo/Pauschal XML block behind the method flag + credit-note sign fix + ledger reconciliation check.
**Out:** auto-submission (none exists); the ESTV **annexes** (Meldeverfahren form, Einlageentsteuerung) uploaded separately since 8 Mar 2025 — flag as a later add; full Saldo eligibility automation; historical rate-correction workflows beyond keeping legacy rates available.

---

## 13. Acceptance suite

1. A period with 8.1 %, 2.6 %, and 0 % sales maps to 200/299, 301/302, 311/312 correctly; totals match a hand-computed return.
2. **Credit notes reduce** turnover (235) and output tax — not add (regression test for the current bug).
3. Purchase input VAT lands in 400/405; **500 payable = 399 − 479** exactly.
4. **Ledger reconciliation**: document-derived output tax equals the 2200 movement for the period; a seeded manual-VAT divergence is surfaced, not silently dropped.
5. A **Nicht-Entgelt** (Subvention) appears in 900 and drives a 420 Vorsteuerkürzung; a Spende appears in 910 with no input-tax effect.
6. **0 %/exempt company**: produces a clean all-zero return with no errors (revamp-it path).
7. The generated XML **validates against the official eCH-0217 v2.0.0 XSD** (fixture test); `sendingApplication` = Kivvi; UID present and well-formed.
8. Saldo-method company: emits the `netTaxRateMethod` block with flat rate on gross, no 400/405.
9. Rounding matches the ESTV field precision on a known example.
10. Tenant isolation: the return only aggregates the requesting company's data.
