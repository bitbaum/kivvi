# AGENTS.md — Kivvi ERP

<!-- fleet:rules:begin — generated from bitbaum/fleet templates/agent-rules.md; edit it there, not here -->

## Org rules

Read `bitbaum/fleet` `AGENTS.md`, `SHARED.md` and the registers it names before
inventing a host, a name, a page or a shared behaviour. Do not copy their facts
into this file.

- **Packages first.** If a `@bitbaum/*` package (or `bip-kit`, `limitkit`,
  `threadkit`, `ai-forms`) already does it, use it and fix a defect in the
  package, not in this app. Every chat is `@bitbaum/chatkit`, every search box
  `@bitbaum/searchkit`, every chart `@bitbaum/chartkit`, accounts
  `@bitbaum/accountkit`, model calls `@bitbaum/ai-kit`. Review this product's
  `package-plan.json` before building anything.
- **One shape per kind.** Things of the same kind look the same and sit in the
  same place (fleet `AGENTS.md`, "One shape per kind").
- **Finished work ships by itself.** Open a non-draft pull request; the fleet
  auto-merge sweep is the only merge path. Never merge by hand, through the
  merge API, with `--auto` or with an admin bypass, and never force-push a
  shared branch.
- **Nothing made up.** A fact on a page or in a doc needs a source that was
  opened; where there is none, the line is removed or softened.
- **Bitcoin orange is for Bitcoin and top-of-funnel actions only.**
- **No model identifier** in anything pushed to a repository.
- Before you finish, run `node <fleet>/scripts/ci/docs-truth-audit.mjs --dir .`:
  the same check the sweep runs on every pull request.

<!-- fleet:rules:end -->

Quick-start for coding agents. Deep context lives in `CLAUDE.md` (Engineering Bible) and `PRODUCT.md`. This file is the short operational map — do not duplicate the Bible here.

## What this is

AI-first, Swiss-native ERP for refurbishers, Brockenhäuser, repair workshops, and vintage shops. **Commercial, financial system-of-record — be conservative.** A transaction either happened or it didn't; money is never a float (use `decimal.js`); every query is tenant-isolated by `companyId`.

## Stack

- **Monorepo**: pnpm workspaces + Turbo. Apps in `apps/*`, packages in `packages/*`.
- **Web**: Next.js 14 (App Router) in `apps/web`. Mutations via Server Actions only (no API routes except streaming + webhooks).
- **Domain logic**: pure functions in `packages/core/src/domain/*.ts` — never in components or actions.
- **DB**: Drizzle ORM + PostgreSQL. Schema SSOT: `packages/database/src/schema.ts` (types derived via `$inferSelect`/`$inferInsert`).
- **Auth**: NextAuth v5 (`apps/web/lib/auth.ts`). **Money**: `decimal.js`, round per line item, CHF Rappen rounding (0.05).
- **Deploy**: push to the default branch (`main`) → CI-gated background deploy to a self-hosted Hetzner PostgreSQL box (behind Caddy) via the Loki push-deploy hook. Prod only receives commits CI verified green.

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
