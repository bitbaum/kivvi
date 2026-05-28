# Contributing to Kivvi

Thanks for considering a contribution. Kivvi is open source under MIT — the goal is for any secondhand business or refurbisher to be able to run, fork, or extend it.

## Before you start

- Read [`PRODUCT.md`](PRODUCT.md) to understand what Kivvi is for. Generic "would be nice in any ERP" features are not in scope; secondhand-specific workflows are.
- Read [`CLAUDE.md`](CLAUDE.md) for the engineering principles. They're not negotiable — they're why the code stays simple.

## Setup

```bash
git clone https://github.com/g-but/kivvi.git && cd kivvi
pnpm install
docker compose up -d postgres
cp .env.example .env.local   # edit DATABASE_URL + NEXTAUTH_SECRET
pnpm db:push
pnpm dev
```

## The development loop

1. **Branch.** `git checkout -b feat/short-description` or `fix/...` or `docs/...`.
2. **Code.** Domain logic in `packages/core/src/domain/*`. UI in `apps/web/`. Types derived from the Drizzle schema — never declared separately.
3. **Validate.**
   ```bash
   pnpm lint           # ESLint
   pnpm type-check     # tsc --noEmit across all packages
   pnpm test           # Vitest, 880+ tests
   ```
4. **Commit.** Conventional Commits: `feat(scope): …`, `fix(scope): …`, `refactor(scope): …`, `docs(scope): …`.
5. **PR.** Open against `main`. CI re-runs lint + type-check + tests + production build. A maintainer reviews.

## Code review checklist (for both reviewer and author)

- [ ] Every multi-table operation is in `db.transaction()`
- [ ] Every query filters by `companyId` (except `auth`/`users`)
- [ ] Types derived from `$inferSelect` / `$inferInsert`, not redeclared
- [ ] Money uses `decimal.js`, never floats
- [ ] Business logic lives in `packages/core/src/domain/*`, not in Server Actions or components
- [ ] Mutations use Server Actions, not API routes (API routes are _only_ for streaming + webhooks + the public REST API)
- [ ] No raw hex colors — use semantic Tailwind classes that map to CSS vars in `globals.css`
- [ ] No `gray-*`, `slate-*`, `zinc-*` — use `muted`, `border-input`, `text-muted-foreground`
- [ ] Touch targets ≥ 36×36 px (44×44 for primary actions)
- [ ] New AI capability? Register the tool, gate it by role, and verify it lands in `aiActionAudit`

## Tests

Tests live in `packages/core/src/__tests__`. Add one test per non-trivial domain function. Financial calculations need exact expected values, not approximations.

```bash
pnpm --filter @kivvi/core test
pnpm --filter @kivvi/core test -- documents      # filter by file
```

## What gets fast-tracked

- Bug fixes with a failing test
- Swiss compliance corrections (VAT, QR-bill format, KMU Kontenrahmen)
- Accessibility improvements with a clear before/after
- Documentation that fixes "I tried to do X and got stuck"

## What needs discussion first

- New tables in the schema
- New top-level routes
- New top-level dependencies
- Anything that changes how money is calculated, stored, or rounded

Open an issue first for these. Save the code for after we agree on the shape.

## Reporting security issues

Don't open public issues for vulnerabilities. See [`SECURITY.md`](SECURITY.md).

---

Questions? Open a [discussion](https://github.com/g-but/kivvi/discussions) or drop us a line at [revampit.ch](https://revampit.ch).
