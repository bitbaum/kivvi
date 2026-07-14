# Immutable, Audit-Trailed Books (GeBüV) — Implementation Spec

**created_date**: 2026-07-13
**Status**: draft spec (not yet implemented)
**Implements**: Opportunity A1 of [`SWISS_AUTHORITY_AUTOMATION.md`](./SWISS_AUTHORITY_AUTOMATION.md); also closes the closed-period-locking gap in [`KIVITENDO_REPLACEMENT_GAPS.md`](./KIVITENDO_REPLACEMENT_GAPS.md) §2.2.
**Ground truths**: #1 (a transaction happened or it didn't → the record of it is permanent), #5 (system authoritative → one unalterable truth), #6 (correctness beats speed).

---

## 1. Why this is first

Legal basis (in force): **OR 957a/958f** + **GeBüV (SR 221.431)**. Books must be complete, chronological, systematic, voucher-backed; **any change must be detectable** (GeBüV Art. 9); corrections happen by **reversal (Storno)**, not alteration; **10-year retention** (20 for immovable-property documents; MWSTG Art. 70). A Postgres row is a _changeable medium_, so compliance requires the integrity to be **technically guaranteed**, not assumed.

This is the property every downstream authority interaction rests on — a Treuhänder trusting the books, a clean ESTV audit, a credible VAT return. Cheap to build now, very expensive to retrofit once there's history.

---

## 2. Current state (verified in code)

**Already compliant — keep:**

- `updateDocument` (`documents.ts:792`): non-draft documents allow **notes-only** edits; items/contact/dates locked after draft. ✅
- `deleteDocument` (`documents.ts:1175`): **draft-only** deletion. ✅
- `deleteJournalEntry` refuses non-`manual` (auto) entries. ✅ (partial)
- `numberSequences`: atomic, gap-free. ✅
- Storno pattern exists for VAT reversals (`accounting-integration.ts:244/283`) and credit notes. ✅

**Gaps — the build:**

1. **`deleteJournalEntry` (`accounting.ts:554`) hard-deletes `manual` entries** (lines cascade). Combined with `createJournalEntry`, this is **create-then-delete = an untraceable edit** of a posted manual entry. GeBüV violation.
2. **No immutability marker or integrity data** on `journalEntries` — only `createdAt`/`createdBy`. No `postedAt`, no hash, no chain, no reversal links.
3. **Closed periods are not enforced.** `fiscalPeriods.isClosed` / `fiscalYears.isClosed` exist (`schema.ts:817/834`) but no posting path checks them.
4. **No general accounting audit trail.** Only `aiActionAudit` (AI actions) exists — nothing logs human/system ledger mutations.
5. **No way to prove integrity** — nothing detects a direct-DB tamper.

---

## 3. Design — an append-only ledger

Three primitives, plus period-locking, verification, and retention.

1. **Immutability**: once posted, a journal entry and its lines are never updated or deleted. Corrections only by **reverseJournalEntry** (Storno counter-entry).
2. **Tamper-evidence**: each posted entry carries a hash of its content chained to the previous posted entry (per company). Any after-the-fact change breaks the chain and is detectable.
3. **Audit trail**: an append-only `auditLog` records every ledger-affecting action (who/when/what), complementing the existing `sourceType`/`sourceId` Prüfspur (voucher ↔ journal ↔ statement, both directions).

---

## 4. Schema deltas (`packages/database/src/schema.ts`)

### `journalEntries` — add

```
postedAt        timestamptz        -- NULL = draft (editable); set once = posted (immutable)
sequenceNo      bigint             -- per-company, monotonic, gap-free posting order
entryHash       text               -- sha256 of this entry's canonical content (hex)
prevHash        text               -- entryHash of the previous posted entry (the chain link)
reversesEntryId uuid  FK self      -- set on a Storno entry → the entry it reverses
reversedByEntryId uuid FK self     -- set on the original → its Storno entry (nullable, one-shot)
```

`createdBy` stays (who posted). `sequenceNo` + `prevHash` together give both a human-auditable "no gaps" order and cryptographic tamper-evidence.

### New table `auditLog` (append-only, never updated/deleted)

```
auditLog
  id           uuid pk
  companyId    uuid            -- tenant isolation (GT #4)
  actorUserId  uuid?  FK users -- null = system/cron
  action       text            -- 'journal.posted' | 'journal.reversed' | 'document.status_changed' | 'period.closed' | 'document.voided' …
  entityType   text            -- 'journal_entry' | 'document' | 'fiscal_period'
  entityId     uuid
  at           timestamptz default now()
  detail       jsonb           -- before/after summary, amounts, reference
  prevHash     text            -- chain over the audit log itself (optional but cheap)
  hash         text
  UNIQUE (companyId, sequenceNo?)  -- optional per-company sequence for the log too
```

No domain function ever issues UPDATE/DELETE against it. Defense-in-depth (§9): a Postgres rule/trigger or `REVOKE UPDATE, DELETE` for the app role.

### `documents` (optional, small)

- `postedAt timestamptz` — mirror the moment an invoice's journal entry is posted (the notes-only-after-draft guard already protects the rest).
- `voidedByDocumentId uuid?` — the credit-note/reissue trail (credit notes already link via `convertedFromId`; this makes the reverse direction explicit).

---

## 5. Domain changes

### 5.1 Posting is a one-way, serialized transition

Where an entry becomes final (auto entries in `accounting-integration.ts`; `createJournalEntry` for manual), inside the **same `db.transaction()`** that writes entry+lines:

1. Acquire a **per-company serialization lock** (`pg_advisory_xact_lock(hashtext(companyId))` or `SELECT … FOR UPDATE` on a per-company ledger-head row) — the hash chain requires a total order, so concurrent posts must serialize.
2. Read the company's last posted entry (`prevHash`, max `sequenceNo`).
3. Set `postedAt = now`, `sequenceNo = last+1`, `prevHash = last.entryHash`, compute `entryHash` (§6).
4. Append one `auditLog` row `journal.posted`.

### 5.2 Replace deletion with reversal

- **`deleteJournalEntry` (`accounting.ts:554`)**: restrict to **`postedAt IS NULL`** (true drafts) only. A posted entry — manual or auto — can never be deleted. (Removes the manual-delete loophole.)
- **New `reverseJournalEntry(db, companyId, entryId, {date?, reason})`**: creates a new posted entry with debit/credit swapped, `reversesEntryId = entryId`; sets the original's `reversedByEntryId`; audit `journal.reversed`. This is the _only_ way to undo a posted entry. Existing credit-note / status→cancelled paths route through it instead of any delete.

### 5.3 Period locking

Shared guard `assertPeriodOpen(db, companyId, date)` called by **every** posting path (invoice send, payment, manual entry, reversal): reject (`DomainError "periodClosed"`) if `date` falls in a closed `fiscalPeriod` or `fiscalYear`. Reversing an entry that sits in a **closed** period books the Storno into the **current open** period (dated today), referencing the original — standard practice, never reopen a closed period.

### 5.4 Audit writer

Single `recordAudit(tx, {...})` appended within the same transaction as each state change (post, reverse, document status change, period close, document void). One code path, never mutated.

### 5.5 Integrity verification

`verifyLedgerIntegrity(db, companyId)`: walk entries by `sequenceNo`, recompute each `entryHash`, check `prevHash` continuity and sequence gaps. Returns `{ ok, firstBrokenSequenceNo?, reason? }`. Surface in admin diagnostics (reuse the `integration-health.ts` / `RevampitIntegrationHealth` pattern) and as an on-demand + periodic cron check. This is what turns "we assume the DB is fine" into a provable green check for the Treuhänder.

---

## 6. Hash construction (reproducible, exact)

```
entryHash = sha256_hex( canonicalJSON({
  companyId,
  sequenceNo,
  date:        ISO-8601,
  reference,
  sourceType, sourceId,
  postedAt:    ISO-8601,
  prevHash,
  lines: sortedBy(accountCode).map({ accountCode, debit: fixed2|null, credit: fixed2|null }),
}) )
```

- Amounts are **fixed-2 decimal strings** (never floats — GT #2). Canonical JSON = sorted keys, no whitespace.
- First entry per company: `prevHash = GENESIS` (a fixed constant).
- Only **immutable** inputs go into the hash (no `description` edits, no derived fields) — so the hash is stable and any change to a hashed field is, by design, a detectable tamper.

---

## 7. Retention & export

- **PDF/A archival** of every posted invoice + Storno (deterministically regenerable from immutable data, or stored). 10-year (flag the rare 20-year immovable-property case).
- **GeBüV export bundle** (dated archive): entries + lines + hashes + chain, the `verifyLedgerIntegrity` report, and document PDF/As — the "hand to Treuhänder / survive an ESTV audit" artifact. Extends the DATEV/journal export gap.
- **Verfahrensdokumentation** template — a short document describing how integrity is ensured (GeBüV expects documented procedures). Ship as a fill-in template.

---

## 8. Migration / back-compat (non-breaking)

- One-time backfill migration: existing entries → `postedAt = createdAt`, `sequenceNo` assigned in `(createdAt, id)` order per company, chain (`prevHash`/`entryHash`) computed once from genesis. After that, append-only rules apply.
- Draft entries (`postedAt IS NULL`) remain freely editable/deletable — nothing changes for work-in-progress.
- Additive: no existing posted data is altered except gaining hash/sequence metadata.

---

## 9. Acceptance suite

1. A **posted** journal entry cannot be updated or deleted (both paths throw); it can only be reversed.
2. `reverseJournalEntry` creates a linked counter-entry; original persists; net effect zero; both are hashed and chained.
3. Editing a **sent** invoice's items/contact is rejected (already true); credit-note + reissue is the correction path; `voidedByDocumentId` links it.
4. Posting (invoice/payment/manual/reversal) into a **closed** period or year is rejected; reversing a closed-period entry books into the open period.
5. **Tamper test**: a direct-DB update to a posted line's amount is caught by `verifyLedgerIntegrity` (hash mismatch), reporting the first broken `sequenceNo`.
6. A **gap** in `sequenceNo` is detected.
7. Every post/reverse/status-change/period-close appends **exactly one** `auditLog` row; no code path updates or deletes the log.
8. **Concurrency**: two simultaneous posts for one company produce a valid, gap-free, single-linked chain (serialization lock holds).
9. Backfill migration over existing data yields a chain where `verifyLedgerIntegrity` returns `ok`.
10. **Tenant isolation**: company A's chain and audit log never interleave with company B's.

---

## 10. Scope / out of scope

- **DB-level immutability** (Postgres triggers / `REVOKE UPDATE,DELETE` on posted rows, or a WORM archive tier): recommended as **defense-in-depth** after the app-level enforcement lands — noted, not required for v1.
- **Qualified electronic timestamp/signature** (RFC-3161 / a TSA): GeBüV accepts hash + documented procedure for ordinary books; qualified timestamps are optional hardening, flagged for regulated cases.
- **20-year immovable-property retention**: flagged; rare for revamp-it.
- Does **not** change master data (accounts, contacts) mutability — those are legitimately editable; this spec governs the **ledger** and its Prüfspur only.
