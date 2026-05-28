# Kivitendo Export

Local-only directory for kivitendo CSV exports used during migration
testing. **All CSVs in this directory are gitignored** — they contain
real customer data and must never be committed.

To test the kivitendo import flow:

1. Export your kivitendo data as CSV.
2. Drop the files into this directory (filenames must match
   `packages/core/src/domain/import-mappings.ts` profiles, e.g.
   `kunden_customers.csv`, `artikel_products.csv`).
3. Run the upload flow from the onboarding wizard, or invoke
   `scripts/import-kivitendo.ts` directly.

The expected schema for each file is documented in
`packages/core/src/domain/import-mappings.ts`.
