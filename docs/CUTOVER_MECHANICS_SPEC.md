# Cutover Mechanics — Opening Balances, Open Items & Kontoauszug — Spec

**created_date**: 2026-07-13
**Status**: draft spec (not yet implemented)
**Implements**: Tier 2 of [`KIVITENDO_REPLACEMENT_GAPS.md`](./KIVITENDO_REPLACEMENT_GAPS.md) — §2.1 (opening-balance + open-items import) and §2.3 (per-account Kontoauszug).
**Depends on**: [`IMMUTABLE_BOOKS_SPEC.md`](./IMMUTABLE_BOOKS_SPEC.md) — the opening entry is the genesis of the immutable ledger; everything before cutover is a closed period.
**Ground truths**: #1 (a transaction happened or it didn't — no double-count of open items), #5 (authoritative — day-1 Bilanz must equal Kivitendo's closing Bilanz), #6 (correctness).

---

## 1. The cutover principle

**Freeze Kivitendo for history; start Kivvi clean at a cutover date.** Do **not** import the 9,333-row historical journal (`buchungsjournal_gl.csv`) — Kivitendo stays archived read-only for the 10-year OR 958f retention. Kivvi's day-1 ledger consists of exactly two imports:

1. **Opening balances** — the trial balance (`summen_saldenliste_trial_balance.csv`) → one balanced opening journal entry.
2. **Open items** — the open receivables (`offene_forderungen_open_receivables.csv`, 1,135 rows) + open payables (37) → carried-forward documents, **with no journal entry** (their aggregate is already in the opening balance).

Everything else (master data: 5,803 contacts, 4,134 articles) is already covered by the existing importers.

---

## 2. What the real data looks like (revamp-it)

- **Saldenliste** (`daten/`): `Konto, Beschreibung, Eröffnungsbilanzwerte (Soll/Haben), Summe …, Saldo per 31.12` — account-code-keyed net balances.
- **Open receivables**: `Kunde, Rechnung, Datum, Fällig, Betrag, Offen, Letzter Zahlungseingang, Offener Betrag` — header-level, one row per open invoice.
- **Kivitendo's own convention** (from `buchungsjournal_gl.csv`): opening balances book **against an Eröffnungsbilanzkonto** — e.g. `Dr 1100 / Cr 9100 "Eröffnung offene Debitoren"`. Kivvi seeds this role as **9000 Eröffnungsbilanzkonto** (`swiss-kmu-kontenrahmen.ts:304`). Use 9000.

---

## 3. Part A — Opening-balance import

### 3.1 Transform

Input: a trial-balance snapshot as of the **cutover date** (each account → net balance). Produce **one** journal entry:

- `date` = cutover date, `sourceType = 'opening_balance'`, `reference = 'Eröffnungsbilanz'`.
- One line per account with a non-zero balance: **Dr** if the balance is debit-nature (asset/expense), **Cr** if credit-nature (liability/equity/revenue), booked **against 9000 Eröffnungsbilanzkonto** as the contra so each opening figure is traceable and 9000 mirrors the whole opening balance sheet.
- Because a trial balance is balanced (Σ assets = Σ liabilities + equity), the entry balances and 9000 nets to zero.

### 3.2 Correctness gates (never create unbalanced books)

- **Assert Σdebit = Σcredit.** If the source TB doesn't balance, post the residual to 9000 and **fail loudly** with the delta — never silently import unbalanced opening books.
- **Account existence**: every source `Konto` must map to a seeded account; unmapped codes are reported (create-or-map step), not dropped.
- Idempotent: re-running the import replaces the single `opening_balance` entry (only permissible **before** it's locked); once the cutover period is closed (A1), it's immutable.

### 3.3 Immutability & periods (A1 tie-in)

The opening entry is the **genesis** of Kivvi's hash chain — posted, hashed, `sequenceNo = 1`. The cutover date defines the first open fiscal period; **all prior periods are closed** so nothing can back-post before the opening balance.

---

## 4. Part B — Open-items import (the subtle part)

### 4.1 The double-count trap

The opening-balance entry already carries the **aggregate** `1100 Debitoren` and `2000 Kreditoren` balances. So importing the individual open invoices **must NOT create journal entries** — that would double the AR/AP. Open items are imported for **operational visibility only** (dunning + CAMT payment-matching need the individual documents), not for booking.

### 4.2 Transform

- Open receivables → `documents` of type `invoice`, **carried-forward**: contact resolved by number/name, `issueDate`, `dueDate`, `total = Betrag`, recorded partial payment = `Betrag − Offen` (so `Offen` is the outstanding), status derived (`sent` / `partially_paid` / `overdue`). QR reference generated so CAMT matching works post-cutover.
- Open payables → type `purchase_invoice`, same shape.
- **`skipJournal` mode**: a dedicated path (extend `bulkInsertDocuments` `import-bulk.ts:457`, or a new `bulkInsertOpenItems`) that inserts the document + payment records **without** invoking `createInvoiceSentJournalEntry`. Flag the document `isCarriedForward = true` (new nullable column) so it's auditable and excluded from any re-booking.

### 4.3 Reconciliation gate (correctness)

- **Σ open AR (`Offen`) must equal the 1100 opening balance**; **Σ open AP must equal 2000**. Assert and report the delta; block cutover on mismatch (a mismatch means the two imports disagree — exactly what must not reach production). This is the single most important cutover check.

---

## 5. Part C — Per-account Kontoauszug (account statement)

The auditor/Treuhänder question "show me every posting to 3400 with a running balance" has no answer today (only entry-level `listJournalEntries` and account-total `getTrialBalance` exist).

### 5.1 `getAccountStatement(db, companyId, { accountCode | accountId, dateFrom, dateTo })`

- **`openingBalance`** = signed sum of all journal lines for the account with `entry.date < dateFrom` (sign by account nature: asset/expense = debit-normal, liability/equity/revenue = credit-normal). For an account, this naturally includes the §3 opening-balance entry.
- **`rows`**: each journal line in `[dateFrom, dateTo]` for the account, with `date, entryReference, description, counterAccounts, debit, credit, runningBalance` (running = openingBalance + cumulative signed movement).
- **`closingBalance`** = openingBalance + period movement (must equal `getTrialBalance` for that account/date — an internal consistency assertion).
- Add `getAccountStatement` to `reports.ts` beside `getBalanceSheet`/`getProfitAndLoss`.

### 5.2 Surface

- UI: click any account (journal / accounts / balance-sheet drill-down) → its Kontoauszug.
- **Export CSV + PDF** — the per-account ledger a Treuhänder expects (extends the DATEV/export gap). PDF is GeBüV-friendly for the audit file.

---

## 6. Cutover reconciliation report

A one-screen `getCutoverReconciliation(companyId)` proving the migration (MIGRATION_CHECKLIST Phase 7):

- Kivvi opening Bilanz per account **vs** the source Saldenliste (line-by-line delta).
- Σ open AR/AP **vs** 1100/2000 (§4.3).
- Green/red per line; any red blocks "go live." This is what lets revamp-it trust day one.

---

## 7. Reuse & non-duplication

- **Master data** (contacts/products) — existing importers, unchanged.
- **Immutable books (A1)** — opening entry is genesis; carried-forward docs never re-book.
- **Dunning / CAMT matching** — consume the carried-forward open items (that's why they're imported as documents, not just balances).
- **Kontoauszug** builds only on existing `journalLines` + account nature; no schema change beyond the `isCarriedForward` flag.
- Fixes the current importer gaps named in the replacement doc (no line-item parsing needed here — open items are header-level; opening balances are aggregate).

---

## 8. Scope / out of scope

**In:** trial-balance → opening-balance entry (balanced, 9000 contra, gates); open AR/AP → carried-forward documents with `skipJournal` + reconciliation; `getAccountStatement` (CSV/PDF); the cutover reconciliation report; `isCarriedForward` column.
**Out:** importing the historical journal (freeze Kivitendo); per-line VAT on historical docs (0 %-VAT for revamp-it anyway, and history isn't imported); document line-item parsing (open items are header-level); multi-currency opening balances (revamp-it is CHF-only).

---

## 9. Acceptance suite

1. A balanced Saldenliste → one `opening_balance` entry, Σdebit = Σcredit, one line per non-zero account against 9000; Kivvi opening Bilanz equals the source per account.
2. An **unbalanced** source TB → import **fails loudly** with the delta; no partial/unbalanced entry is created.
3. Open receivables → carried-forward `invoice` documents with correct outstanding (`Offen`), **and zero journal entries created** (no double-count of 1100).
4. **Reconciliation**: Σ open AR = 1100 opening balance; a seeded mismatch is reported and blocks go-live.
5. A carried-forward open invoice is **dunnable** (appears in the aging/dunning run) and **matchable** by a CAMT import against its QR reference.
6. `getAccountStatement` for account 1100 over the year shows the opening line first, then movements, with a correct running balance; closingBalance equals `getTrialBalance` for that account.
7. Kontoauszug CSV/PDF export renders and reconciles.
8. Opening entry is immutable (A1) — `sequenceNo = 1`, hashed; prior periods closed so back-posting before cutover is rejected.
9. Cutover reconciliation report is all-green for a correct import and red (blocking) for a seeded discrepancy.
10. Tenant isolation throughout.
