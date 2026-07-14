# Implementation Sequence — the nine specs, prioritized

**created_date**: 2026-07-13
**Purpose**: dependency-aware build order across all specs in `docs/`. The organizing goal is **retire Kivitendo for revamp-it**, with product-tier features sequenced after the cutover critical path.

---

## The two hard constraints that set the order

1. **Immutability must come before history accumulates.** Retrofitting GeBüV immutability + a hash chain onto a ledger that already has months of postings is painful. `IMMUTABLE_BOOKS_SPEC` (A1) must land first — it's also the genesis + period-locking that `CUTOVER_MECHANICS` depends on.
2. **The Treuhänder answers are the long external pole.** Every `‹policy›`-marked line (repair advance/Anzahlung, Reparaturbonus split, FER-21 fund posting) is blocked until the fiduciary replies. **Send `TREUHAENDER_MWST_FRAGEN_REPARATURBONUS.md` on day 0** so answers arrive before Phase 3.

## Critical path to go-live

`A1 immutable books → cutover mechanics` (with `posting groups` in parallel) = revamp-it can run on Kivvi. Everything else layers on after.

## Dependency map (who blocks whom)

- **A1 (immutable books)** → blocks Cutover; strengthens B1 (reconciliation) and D1 (fund postings immutable).
- **Posting groups (1.1)** → blocks Work-hour billing (1.2), Richtpreis (1.3), correct P&L, and repair-intake 3400 routing.
- **Cutover mechanics** → needs A1; needs posting groups live _for new invoices_ (opening balances themselves are account-level).
- **Treuhänder answers** → block Repair advance+subsidy and FER-21 posting treatment.
- **A2 (Zefix/UID)**, the two bug-fixes, **B1**, Tier-3 robustness → independent, parallelizable.

---

## Phase 0 — Day 0, no engineering blocked by it

| Item                                                               | Why now                                                        | Size |
| ------------------------------------------------------------------ | -------------------------------------------------------------- | ---- |
| **Send the Treuhänder letter** (MWST §A–E + FER-21 §F)             | Long external pole; unblocks Phase 3                           | —    |
| **Fix `getVatReport` credit-note sign** (`reports.ts:532`)         | Real correctness bug, independent, hours                       | S    |
| **Verify QR-IBAN↔QRR pairing + structured address** (authority A3) | Dated compliance (SPS 2025); a wrong slip is rejected by banks | S    |

## Phase 1 — Foundations (parallelizable across two tracks)

| Spec                                                            | Track   | Size | Delivers                                                                                                         |
| --------------------------------------------------------------- | ------- | ---- | ---------------------------------------------------------------------------------------------------------------- |
| **A1 — Immutable, audit-trailed books**                         | Ledger  | L    | GeBüV-safe books, period locking, hash chain + audit log, integrity verification. _Prerequisite for cutover._    |
| **Posting groups (1.1)** — `POSTING_GROUP_REVENUE_ROUTING_SPEC` | Revenue | M    | revamp-it's real Erlöskonten (3100/3400/3450/3500/3610/3510/3803); correct P&L; unblocks 1.2/1.3/repair routing. |

These two touch different areas (ledger integrity vs revenue routing) → run in parallel.

## Phase 2 — Cutover critical path (get revamp-it live)

| Spec / item                                                         | Size | Notes                                                                                            |
| ------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------ |
| **Cutover mechanics** — opening balances + open items + Kontoauszug | M    | Needs A1. The thing that retires Kivitendo. Includes the reconciliation gate (Σ open AR = 1100). |
| **1.4 Mahnsperre** (per-contact dunning block)                      | S    | Small; honored by the dunning cron.                                                              |
| **1.2 Work-hour → repair-labor billing**                            | M    | Needs posting groups (→3400). Closes labor leakage.                                              |
| **A2 Zefix/UID enrichment** (opportunistic)                         | S–M  | Independent; cheapest daily-value win — slot in when a track is free.                            |

**End of Phase 2 = revamp-it can go live** on Kivvi for its actual daily usage (invoicing, purchases, banking, dunning, correct multi-stream P&L, opening balances, audit-proof books). Repair intake's _operational_ side works; its _advance + subsidy accounting_ waits for Phase 3.

## Phase 3 — Policy-gated + Verein differentiator (after Treuhänder replies)

| Spec                                                                                            | Size | Gated on                         |
| ----------------------------------------------------------------------------------------------- | ---- | -------------------------------- |
| **Repair intake: advance (Anzahlung) + Reparaturbonus** — `REPAIR_INTAKE_AND_SUBSIDY_SPEC` §5–6 | M    | Treuhänder answers B/C           |
| **FER-21 fund accounting (D1)**                                                                 | M–L  | A1 (done) + Treuhänder §F        |
| **1.3 Richtpreis** (solidarity top-up/reduction)                                                | S–M  | Posting groups (done); mostly UI |

## Phase 4 — Product completeness (decoupled from revamp-it cutover)

| Item                                                                                                                                           | Size   | Note                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| **B1 — eCH-0217 VAT export** (full)                                                                                                            | M–L    | Headline for VAT-paying customers; **low for revamp-it (0 % VAT)**. Bug-fix already done Phase 0. |
| **Tier-3 robustness** (email queue/retry; partial/multi/overpayment matching; donation/grant triage wired to reconciliation; dunning fees/PDF) | M      | Daily-use quality.                                                                                |
| **C1 pain.001 supplier payments; B2 Bezugsteuer; E1 eBill (needs partner contract)**                                                           | M each | Authority/banking breadth.                                                                        |
| **E2 Swissdec ELM payroll**                                                                                                                    | XL     | Only if payroll becomes a product goal; revamp-it has none.                                       |

---

## Two-track staffing view

- **Ledger/accounting track**: A1 → Cutover mechanics → FER-21 (D1) → B1.
- **Revenue/features track**: Posting groups → Work-hour billing + Mahnsperre → Repair advance/subsidy + Richtpreis → A2/Tier-3.
  The two converge at go-live (end of Phase 2).

## If you only do three things

1. **A1 immutable books** (before more history accrues).
2. **Posting groups** (their accounting identity).
3. **Cutover mechanics** (retires Kivitendo).
   …and **send the Treuhänder letter today** so Phase 3 isn't blocked when you reach it.

---

## Spec index

| Spec                                            | Phase              | Lens                  |
| ----------------------------------------------- | ------------------ | --------------------- |
| `IMMUTABLE_BOOKS_SPEC` (A1)                     | 1                  | R+P foundation        |
| `POSTING_GROUP_REVENUE_ROUTING_SPEC` (1.1)      | 1                  | revamp-it identity    |
| `CUTOVER_MECHANICS_SPEC`                        | 2                  | revamp-it go-live     |
| `KIVITENDO_REPLACEMENT_GAPS` (1.2/1.4 + Tier-3) | 2 / 4              | scope map             |
| `REPAIR_INTAKE_AND_SUBSIDY_SPEC`                | 3                  | revamp-it + policy    |
| `FER21_FUND_ACCOUNTING_SPEC` (D1)               | 3                  | Verein differentiator |
| `ECH0217_VAT_RETURN_SPEC` (B1)                  | 0 (bug) / 4 (full) | product               |
| `SWISS_AUTHORITY_AUTOMATION` (A2/A3/B2/C1/E1)   | 0/2/4              | product breadth       |
| `TREUHAENDER_MWST_FRAGEN_REPARATURBONUS`        | 0 (send)           | unblocks Phase 3      |
