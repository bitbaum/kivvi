# AccountKit migration

Kivvi signs in through AccountKit since 2026-11-01 (`AUTH_RUNTIME=accountkit`).
Auth.js (`apps/web/lib/auth.ts`) stays in the tree for a rollback. Migration
`packages/database/drizzle/0038_accountkit_staging.sql` adds AccountKit's
tables beside it under the `auth_` prefix (`createAuthTables("auth_")` in
`packages/database/src/accountkit.ts`), because Kivvi already owns `users`. The fleet's acceptance queue is
[Fleet's checkpoint](https://github.com/bitbaum/fleet/blob/main/docs/remediation-resume-2026-10-29.md).

The migration was written by hand: this repository's Drizzle snapshots are in
the old v5 format that the installed drizzle-kit no longer generates from. The
deploy's applier and `scripts/ci/apply-migrations.sh` apply the SQL in order.

## Rehearse the import

Against an isolated database holding an authorised snapshot, after every
migration:

```sh
DATABASE_URL=postgres://… pnpm --filter @kivvi/database run db:rehearse-import
```

It runs `scripts/db/accountkit-import.sql` in one transaction, always rolls
back, and prints only counts. There is no apply mode. It takes locks even
though it rolls back, so never point it at the served database.

The import keeps each `users.id` as the shared user id, so memberships,
documents and the audit log keep pointing at the same person. Addresses are
lower-cased. Kivvi has never verified an address, so every account starts
unverified, which signs in (AccountKit 0.16.0's default for every product).
bcrypt hashes are copied byte for byte and sign in through `legacyBcrypt`.
Companies, memberships and roles stay Kivvi's. Two addresses that collide
once lower-cased, drift between runs, or an already-used shared runtime fail
the transaction.

The import finally attaches the mirror triggers defined in migration 0038.
From then on every Kivvi writer of `users` (sign-up, the invite sign-up, the
reset link, the settings password change) keeps `auth_users` and the
credential row in step. A password change ends every other shared session; the
settings action names its own session in `kivvi.keep_session`, so the person
changing it stays signed in, and a reset ends everything.

## Shared runtime (on since 2026-11-01)

With `AUTH_RUNTIME=accountkit` the runtime in `apps/web/lib/accountkit/`
answers every sign-in; unset, Auth.js answers as today. The secret is
`BETTER_AUTH_SECRET`, or the `NEXTAUTH_SECRET` the box already holds; in
production it must be at least 32 characters.

- `auth()` keeps today's session shape. It is read from the shared session,
  plus the `users` row and the membership, on every request
  (`apps/web/lib/session-claims.ts`, the same rule the Auth.js jwt callback
  uses). A company switch, a finished onboarding, a role change or a deleted
  person applies on the next request.
- The pages keep `next-auth/react`. AccountKit's compat layer
  (`@bitbaum/accountkit/auth/nextauth-compat`, configured in
  `apps/web/lib/accountkit/compat.ts`) answers its calls from the shared
  runtime: `session` GET and POST, `csrf`, `providers`, `signout` and
  `callback/credentials`. Of AccountKit's own endpoints only session, sign-in
  and sign-out are open. Its sign-up, reset and password endpoints stay closed
  until Kivvi adopts its screens, so there is no second credential writer.
- The middleware reads the shared session from the database, so it runs on
  Node (`runtime: "nodejs"`, stable in Next 15.5) on both runtimes.

`apps/web/lib/accountkit/__tests__/journeys.test.ts` runs these through the
real handlers on the real migration chain and the real import. CI's
`browser-smoke.yml` account job runs the rehearsal and those journeys, then
the whole browser account journey (sign-up, onboarding, sign-out, wrong
password, sign-in, settings) once per runtime. That is not deployed evidence.

## Switched (2026-11-01)

The switch ran from Loki's `accountkit-switch.yml`
(`scripts/hetzner/accountkit-switch.sh`, see Loki's
`docs/architecture/accountkit-migration.md`):

1. A survey counted 4 accounts and nobody whose only way in would be
   lost.
2. The import ran once, under locks, and attached the mirror triggers.
3. `AUTH_RUNTIME=accountkit` was set and the app restarted.
4. A live proof ran on the public site. A throwaway account signed in through
   the product's own sign-in route, read its session back, signed out, and
   was deleted.

Everyone signed in under Auth.js signs in again once.

To roll back, run the same workflow with `rollback`. It unsets `AUTH_RUNTIME`,
restarts on Auth.js, drops the mirrors and empties the shared tables.
Every hash stays bcrypt in `users.password_hash`, so nothing needs a reset.

Still to prove with an approved test identity on the deployed artifact:
recovery, a company switch and revocation.

Later, and separately: AccountKit's screens (passkeys, sign-in links, its own
recovery), which need Kivvi's writers to move to AccountKit first.
