<!--
Thanks for the PR! A short summary saves the reviewer 10 minutes.

If this is your first PR, scan CONTRIBUTING.md and the code review checklist there.
-->

## What this changes

<!-- One or two sentences. The "what" goes in the title; this is the "why". -->

## How I tested

- [ ] `pnpm lint`
- [ ] `pnpm type-check`
- [ ] `pnpm test`
- [ ] Manually verified in the UI (which page / flow?)

## Checklist

- [ ] Multi-table writes use `db.transaction()`
- [ ] Every query filters by `companyId` (or this PR touches `users`/`auth`)
- [ ] Money uses `decimal.js`, not floats
- [ ] Types derived from the Drizzle schema, not redeclared
- [ ] No raw hex colors / `gray-*` / `slate-*` — semantic tokens only
- [ ] If this adds an AI tool: gated by role and logged to `aiActionAudit`

## Related

<!-- Issue numbers, prior PRs, docs links. Use "Closes #123" to auto-close. -->
