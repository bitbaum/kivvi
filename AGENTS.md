# AGENTS.md — Kivvi ERP

Quick-start for coding agents. Deep context lives in `CLAUDE.md` (Engineering Bible) and `PRODUCT.md`. This file is the short operational map — do not duplicate the Bible here.

## What this is

AI-first, Swiss-native ERP for refurbishers, Brockenhäuser, repair workshops, and vintage shops. **Commercial, financial system-of-record — be conservative.** A transaction either happened or it didn't; money is never a float (use `decimal.js`); every query is tenant-isolated by `companyId`.

## Stack

- **Monorepo**: pnpm workspaces + Turbo. Apps in `apps/*`, packages in `packages/*`.
- **Web**: Next.js 14 (App Router) in `apps/web`. Mutations via Server Actions only (no API routes except streaming + webhooks).
- **Domain logic**: pure functions in `packages/core/src/domain/*.ts` — never in components or actions.
- **DB**: Drizzle ORM + PostgreSQL on Hetzner (`kivvi` on bitbaum). Schema SSOT: `packages/database/src/schema.ts`. Neon is gone; `USE_NEON` stays unset. A laptop `.env.local` naming `neon.tech` is not production.
- **Auth**: NextAuth v5 (`apps/web/lib/auth.ts`). **Money**: `decimal.js`, round per line item, CHF Rappen rounding (0.05).
- **Deploy**: push to the default branch (`main`) → CI-gated background deploy to a self-hosted Hetzner PostgreSQL box (behind Caddy) via the FleetCrown push-deploy hook. Prod only receives commits CI verified green.

## Commands

```bash
pnpm install        # install workspace deps
pnpm dev            # dev server (turbo)
pnpm verify         # SSOT check bundle: lint + type-check + test — run before every commit
pnpm build          # production build
```

`pnpm verify` is exactly what CI runs (`.github/workflows/ci.yml`) before the gated `build` step. Green verify locally ⇒ green CI.

## Database migrations

- **Location**: `packages/database/drizzle/*.sql` (+ `meta/` snapshots). Config: `packages/database/drizzle.config.ts`.
- **Generate** after a schema change: `pnpm db:generate`. **Never edit an applied migration file — always create a new, forward-only one.**
- **Application is MANUAL and intentionally not in the CI/deploy pipeline.** Migrations are applied by hand against production (`pnpm db:migrate` → `drizzle-kit migrate`) by an operator, separately from code deploys. Do not add automatic migration application to CI or the deploy path without an explicit design decision by the owner — this is a financial system-of-record.

## Non-negotiables (see CLAUDE.md "Critical Rules")

- Every query filters by `companyId` (except auth/users tables).
- Multi-table writes run inside `db.transaction()`.
- No floating-point money; no hardcoded VAT rates / account codes / doc prefixes (config only).
- Server Actions return `ActionResult<T>` and validate input with Zod at the boundary.
