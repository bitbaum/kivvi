# FER-21 Fund Accounting — Implementation Spec

**created_date**: 2026-07-13
**Status**: draft spec (not yet implemented)
**Implements**: Opportunity D1 of [`SWISS_AUTHORITY_AUTOMATION.md`](./SWISS_AUTHORITY_AUTOMATION.md). Directly serves revamp-it (a gemeinnütziger Verein). Depends on [`IMMUTABLE_BOOKS_SPEC.md`](./IMMUTABLE_BOOKS_SPEC.md) (fund movements are ledger postings and must be immutable).
**Ground truths**: #5 (system authoritative — restricted money must be provably ring-fenced), #4 (tenant isolation), #6 (correctness).

> **Confidence flag.** The _data model, the Fondsrechnung report structure, and the three-block capital classification_ are HIGH confidence. The _exact posting treatment_ (whether Zuweisung/Verwendung route through the Betriebsrechnung, and the precise account codes) is MEDIUM — the normative FER-21 text is paywalled. Those items are marked `‹policy›` and must be confirmed with the Treuhänder before auto-posting, exactly as in `TREUHAENDER_MWST_FRAGEN_REPARATURBONUS.md`.

---

## 1. Why revamp-it needs this

FER-21 (Swiss GAAP for charitable NPOs) is effectively mandatory for a Zewo-seal holder and expected by major grant-givers and the Stiftungsaufsicht. Its defining requirement over ordinary accounting: **restricted money must be ring-fenced and its movement reported separately** — a donor who funds "repair-café equipment" must see that their money went there and nowhere else. An ERP that can't ring-fence a restricted grant can't produce a FER-21 Jahresrechnung.

---

## 2. What exists today (half-built)

- `costCenters.kind` is already `'activity' | 'fund'` (`enums.ts`), and `journalLines.costCenterId` tags every line. But a `fund`-kind cost center is **only a tag**: `costCenters` has no balance, no purpose, no restriction source, no opening balance (`schema.ts` — just code/name/kind/isActive).
- `getBalanceSheet` (`reports.ts:416`) groups by account `type` and **lumps all equity into one block** — no Fremdkapital / Fondskapital / Organisationskapital split.
- The KMU seed has generic equity only (2800/2850/2900/2950/2970) — **no Fondskapital / Organisationskapital accounts** (`swiss-kmu-kontenrahmen.ts:148`).
- No Fondsrechnung report; no no-negative-fund rule.

So the tag exists; the fund _accounting_ does not.

---

## 3. The FER-21 capital model (the rules to encode)

Equity ("Kapital") splits into three balance-sheet blocks, and the **decisive test is who imposed the restriction**:

| Block                                   | Restriction              | Who set it                        | Example                                |
| --------------------------------------- | ------------------------ | --------------------------------- | -------------------------------------- |
| **Fondskapital** (zweckgebundene Fonds) | externally purpose-bound | a **third party** (donor/grantor) | "Grant X — repair-café equipment only" |
| **Organisationskapital — gebunden**     | internally designated    | the **board itself**              | "Board reserves CHF 20k for a van"     |
| **Organisationskapital — frei**         | unrestricted             | nobody                            | retained surplus, free capital         |

Key invariants:

- **Third-party restriction → Fondskapital** (explicitly _not_ equity in FER-21 presentation). Board earmarking or none → Organisationskapital.
- **External Fondskapital can never be transferred out internally** — only released as its stated purpose is fulfilled. Internal (board) designations _can_ be reversed by the board.
- **No-negative-fund rule**: a fund is never released below zero; an overspend beyond the fund balance falls to **free** capital, not the fund.

---

## 4. Key design decision: fund is an ORTHOGONAL dimension

A restricted grant (**fund**) can finance repair-café sessions (**activity**). You must report both "how much of Grant X did we use" _and_ "how much did we spend on repairs" — so **fund and activity are two dimensions that cross**, not one shared slot.

Therefore: introduce a dedicated **`funds`** table + **`journalLines.fundId`**, separate from `costCenterId`. **Deprecate `costCenters.kind='fund'`** (it was a simplification) and migrate any fund-kind cost centers into `funds`. `costCenters` reverts to purely `activity`.

---

## 5. Schema deltas (`packages/database/src/schema.ts`)

### New table `funds`

```
funds
  id                uuid pk
  companyId         uuid            -- tenant isolation
  code              text            -- stable slug, e.g. "GRANT-ZH-REPAIR-2026"
  name              text            -- "Reparatur-Café Förderung Stadt Zürich"
  restrictionType   enum('extern_zweckgebunden' | 'intern_gebunden' | 'frei')
  purpose           text            -- the donor's stipulated purpose (audit + Anhang)
  restrictedBy      text?           -- the third party (for extern) / 'Vorstand' (intern)
  capitalAccountId  uuid FK accounts-- the Fondskapital/Organisationskapital account this fund rolls into
  openingBalance    numeric(12,2) default '0'   -- Bestand at fund creation / year start
  isActive          boolean default true
  createdAt / updatedAt
  UNIQUE (companyId, code)
```

`restrictionType` is the whole game — it decides the balance-sheet block (extern → Fondskapital, else → Organisationskapital) and whether internal transfer-out is allowed.

### `journalLines` — add

```
fundId  uuid?  FK funds   -- orthogonal to costCenterId; tags a line to a fund
```

### Capital accounts (seed extension — `swiss-kmu-kontenrahmen.ts`, NPO variant)

Add FER-21 capital accounts (equity type), seeded for NPO/Verein companies:

- `2800` Organisationskapital — frei (repurpose/rename the generic Eigenkapital for NPOs, or add `2890`)
- `2801` Organisationskapital — gebunden (board-designated)
- `2810` Fondskapital — zweckgebunden (external)
- Betriebsrechnung movement accounts `‹policy›`: `Zuweisung an Fonds` / `Verwendung/Entnahme aus Fonds` (the lines that move restricted money in/out of Fondskapital without hitting the operating result) — exact codes to confirm with Treuhänder.

Seeding is **NPO-conditional**: a company flagged as a Verein/NPO gets these; a normal KMU doesn't (KISS — don't burden GmbHs with Fondskapital).

---

## 6. Fund posting patterns `‹policy — confirm exact routing/accounts with Treuhänder›`

The mechanics that keep the operating result neutral for restricted money:

**Zuweisung (restricted money arrives).** A restricted donation/grant is recognized, then moved to the fund so the operating result isn't inflated by money that can't be freely spent:

```
Dr 1020 Bank                         / Cr 3500 Spenden/Subventionsertrag   (income)
Dr «Zuweisung an Fonds» (Betriebsr.) / Cr 2810 Fondskapital  [fundId=X]    (ring-fence)
```

Net effect on operating result ≈ 0; Fondskapital[X] grows.

**Verwendung (purpose fulfilled — release).** The expense books normally; a matching release from the fund offsets it:

```
Dr 4xxx/6xxx Aufwand                 / Cr 1020 Bank                        (real spend, activity-tagged)
Dr 2810 Fondskapital [fundId=X]      / Cr «Verwendung aus Fonds» (Betriebsr.) (release, capped at fund balance)
```

Release is **capped at the fund's balance** (no-negative-fund rule §3); any excess stays as an expense borne by free capital.

**Interne Transfers (board only).** Move between capital components:

```
Dr 2801 Org.kapital gebunden [fundId=A] / Cr 2800 Org.kapital frei          (nets to zero on total capital)
```

Rejected at the domain boundary if the source is **`extern_zweckgebunden`** (external Fondskapital can't be transferred out internally).

A `funds.ts` domain exposes `allocateToFund` / `releaseFromFund` / `transferBetweenCapital`, each posting through the immutable ledger (A1) and validating the no-negative + no-external-transfer-out rules.

---

## 7. The Fondsrechnung report (Rechnung über die Veränderung des Kapitals)

The marquee FER-21 statement — a matrix, one row per capital component (each fund + each Organisationskapital class), columns:

```
Bestand 1.1.  →  Zuweisungen  →  interne Transfers  →  Verwendung  →  Bestand 31.12.
```

- Balances computed from `journalLines` grouped by `fundId` (+ the capital-account balance for the free/residual rows), over the fiscal period.
- **Reconciles to the Bilanz**: sum of closing balances = the Fondskapital + Organisationskapital totals on the balance sheet (an assertion the report checks).
- Fund movements appear here as **capital movements, never netted into the operating result**.
- New `getFundStatement(db, companyId, { fiscalYearId })` in `reports.ts`, alongside the existing `getBalanceSheet` / `getProfitAndLoss` / `getActivityBreakdown`.

---

## 8. Balance-sheet integration

Extend `getBalanceSheet` (`reports.ts:416`) so the passive side presents the three FER-21 blocks instead of one equity lump:

- **Fremdkapital** (liabilities — unchanged),
- **Fondskapital** (sum of `extern_zweckgebunden` funds),
- **Organisationskapital** (gebunden + frei + Grundkapital + year result).

Grouping is driven by account → capital-class mapping (config, §9), so a non-NPO company still sees a normal single equity block.

---

## 9. Config-driven, not hardcoded

A `fer21-capital.ts` config maps capital classes → account codes and defines the restriction-type → balance-sheet-block rule. NPO status is a company flag. This keeps the whole feature **off** for ordinary KMU customers and lets a different NPO use a different capital-account layout without code changes (GT #3).

---

## 10. Reuse & orthogonality (what this does NOT duplicate)

- **Cost centers** (`activity`) stay as-is and orthogonal — a line can carry both `costCenterId` (repair activity) and `fundId` (grant X). `getActivityBreakdown` is untouched.
- **Immutability (A1)**: fund allocations/releases/transfers are ordinary posted entries — immutable, reversible only by Storno.
- **Donation/grant classification**: `payment-classification.ts` already distinguishes Spende / Subvention / pass-through; a restricted inflow it flags becomes a fund `Zuweisung`. Ties to the Nicht-Entgelt/Art. 33 work (D4) and the Reparaturbonus subsidy (`REPAIR_INTAKE_AND_SUBSIDY_SPEC.md`).
- **Leistungsbericht**: fed by Kivvi's existing impact tracking — separate report, not in this spec.

---

## 11. Scope / out of scope

**In:** the fund dimension, capital classification, Zuweisung/Verwendung/Transfer postings with the no-negative + no-external-transfer-out rules, the Fondsrechnung report, and the three-block balance sheet — i.e. the FER-21 fund-accounting core.

**Out (separate items):**

- **Zewo cost-category ratios** (projekt/mittelbeschaffung/administration ≥65/≤35/≤25 %) — Opportunity D2, a second orthogonal tag.
- **Geldflussrechnung, Anhang, Leistungsbericht** — the rest of the FER-21 statement set (separate reports; Leistungsbericht reuses impact tracking).
- **FER 10–28** (large-NPO standards, thresholds CHF 10M/20M/50 FTE) and **FER 30** consolidation.
- Final Swiss-GAAP posting treatment (the `‹policy›` items) — pending the Treuhänder ruling.

---

## 12. Acceptance suite

1. A restricted grant → `allocateToFund` grows Fondskapital[X], operating result net ≈ 0.
2. Spending against the fund → `releaseFromFund` offsets the expense; fund balance decreases.
3. **No-negative-fund**: releasing more than the fund balance releases only up to the balance; the remainder stays as free-capital expense (fund never goes negative).
4. **No external transfer-out**: `transferBetweenCapital` from an `extern_zweckgebunden` fund is rejected; from an `intern_gebunden` one it succeeds and nets to zero on total capital.
5. Fondsrechnung closing balances reconcile exactly to the Bilanz Fondskapital + Organisationskapital totals.
6. Balance sheet presents Fremd- / Fonds- / Organisationskapital as three blocks for an NPO company; a normal KMU still sees a single equity block.
7. A line can carry both `costCenterId` and `fundId`; activity and fund reports each aggregate correctly and independently.
8. Fund postings are immutable (A1) — a booked allocation can only be reversed by Storno.
9. Migration: existing `costCenters.kind='fund'` rows are moved to `funds` with a sensible default `restrictionType`; no data lost.
10. Tenant isolation: funds/capital of company A never appear for company B.

---

## 13. Questions for the Treuhänder (attach to the MWST doc)

1. Do **Zuweisung** and **Verwendung** route through the Betriebsrechnung (via "Zuweisung an/Verwendung aus Fonds" lines) so the operating result is neutral for restricted money — or directly against Fondskapital? Confirm the exact accounts.
2. Confirmed account codes for **Fondskapital** and **Organisationskapital (gebunden/frei)** in our seeded Kontenrahmen.
3. Presentation: does restricted grant income appear as income _then_ Zuweisung, or is it booked straight to Fondskapital?
4. Interaction with **Art. 33 MWSTG** (Subventionen → Vorsteuerkürzung) for a fund fed by a public subsidy.
