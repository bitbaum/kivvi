# REVIEW.md — kivvi review bar

Judge the DIFF against these gates, in order. Flag correctness and requirement
gaps only — lint owns style. Demand evidence (test output), not assertions.
Global standards are loaded via CLAUDE.md; this file is ONLY kivvi's scars.

## Fatal invariants (one violation = block)

1. **Tenant isolation** — every query on company-scoped tables filters by the
   caller's `companyId`. Regression net: `packages/core/src/__tests__/tenant-isolation.test.ts`
   — extend it when adding read paths, never bypass it.
2. **Money is never float** — `decimal.js` only; round per line-item (not per
   total); Rappen rounding to 0.05. No `parseFloat` on amounts, ever.
3. **Accounting writes are atomic** — multi-table postings (document + journal)
   inside one `db.transaction()`. A partial write corrupts the books.
4. **Immutable books** — posted journal entries are never UPDATEd/DELETEd;
   corrections are new reversing entries.
5. **Document numbering** — German prefixes (RE/AN/AU/GU/LS/MA/BE/ER) come from
   the unified `documents` table config, never hardcoded.

## Repo gotchas that have bitten before

- `@kivvi/core` barrel imports can pull the postgres driver into client bundles
  — check what the diff imports where.
- kivitendo CSV quirks: `5'007.20` apostrophe thousands, BOM headers — parsers
  must keep handling both.

## Process gates

- `verify`/`pnpm test` green before review; CI must pass on the PR.
- Diff updates CLAUDE.md if it changes documented structure/behavior.
- Second fix of the same bug class ships the rule/test that ends the class.
