# AccountKit migration

Kivvi signs in through AccountKit since 2026-11-01, and on AccountKit's own
screens since the release that added migration 0039 (see "AccountKit's
screens" below). Auth.js is gone from the tree. Migration
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

## AccountKit's screens

Every auth page is AccountKit's own form (`@bitbaum/accountkit/auth/react`,
wrapped in Kivvi's look in `apps/web/components/auth/auth-forms.tsx`):

- `/login`: password, "Sign in with a passkey", an email sign-in link,
  "Forgot your password?", Continue with OrangeCat and the shared bitbaum
  sign-in (Morulia). Each shows when its env is set
  (`apps/web/lib/accountkit/methods.ts`): the email link and recovery need
  account mail (`RESEND_*`), OrangeCat needs `ORANGECAT_OAUTH_CLIENT_ID` and
  `_SECRET`, the bitbaum sign-in needs `SIGNIN_ISSUER`, `SIGNIN_CLIENT_ID` and
  `SIGNIN_CLIENT_SECRET`.
- `/register`: the same methods, asking for an email and a password only. A
  new person lands on `/join`, where they create their organisation or accept
  an invitation. An invitation link sends them to `/register?callbackUrl=` and
  back to the invitation.
- `/forgot-password`: AccountKit's recovery form. The mailed link lands on
  `/login`, which sets the new password. `/reset-password` forwards there.
- `/settings/profile`: AccountKit's account panel, with password change,
  passkeys, two-factor, linked sign-ins and deleting the account.

`apps/web/lib/accountkit/compat.ts` passes `screens: "accountkit"`
(AccountKit 0.20.0), which opens every AccountKit endpoint. `useSession` and
`signOut` on the other pages keep Kivvi's session shape. The session is read
from the shared session, plus the `users` row and the membership, on every
request (`apps/web/lib/session-claims.ts`), so a company switch, a finished
onboarding, a role change or a deleted person applies on the next request. The
middleware reads it from the database, so it runs on Node.

AccountKit is the only credential writer. Kivvi's own sign-up, invite
sign-up, reset link and settings password change are removed. What stays
Kivvi's (`apps/web/lib/accountkit/kivvi-plugin.ts` and `accounts.ts`):

- A person AccountKit creates gets Kivvi's `users` row under the same id,
  without a company. That covers a sign-up, a first OrangeCat or bitbaum
  sign-in, and an email sign-in link to a new address.
- Deleting an account is refused, before anything is deleted, when the
  person is named on records that must be kept (documents, the journal, the
  audit log) or is the only owner of a company other people work in. The
  refusal says what to do instead.

Migration `0039_accountkit_screens.sql` (additive, idempotent) makes the
panel's rename and deletion reach `users`. It replaces the mirror function in
place and attaches the delete trigger only where the mirror is attached
(production), so the deploy's applier applies it; the import attaches it on a
fresh database.

Existing accounts keep their ids. Imported bcrypt hashes verify through
`legacyBcrypt`; a password set through AccountKit is its native scrypt and
lives in `auth_accounts`, not `users.password_hash`. Kivvi had no OrangeCat
sign-in before, so there were no OrangeCat links to keep.

Known changes:

- Sign-up no longer sends Kivvi's welcome mail, because the organisation is
  created later, on `/join`. AccountKit sends its address confirmation.
- When an email sign-in link proves an unconfirmed address, better-auth drops
  any password set before that proof (its pre-hijack guard). The person sets a
  password again through recovery.

`apps/web/lib/accountkit/__tests__/journeys.test.ts` runs the ways in through
the real handlers on the real migration chain and the real import. CI's
`browser-smoke.yml` account job runs the rehearsal, those journeys, and the
browser journey (`apps/web/e2e/account-journey.spec.ts`), with AccountKit's
real mail caught by `apps/web/scripts/ci/mail-sink.cjs`. That is not deployed
evidence.

To roll back the screens, revert the pull request. The shared runtime keeps
verifying every password set since then. Do not use Loki's
`accountkit-switch.yml rollback` any more: it would empty the only copy of
those credentials.

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

Proven live on 2026-11-01 by Loki's `accountkit-switch.yml` `prove` action,
using throwaway accounts that it deleted again:

- two sessions at once;
- a change to the person's row, read on the next request (the path a role,
  staff or company change takes);
- a password write, which is what a reset and a password change do. It ended
  both sessions, the old password was refused and the new one signed in;
- sign-out, and deleting the person ending their session.

A real password reset is proven live too (2026-11-02, the same `prove`). The
product's own forgot-password page sent the mail, and it arrived in a real
throwaway inbox. Its link opened the product's reset page, a new password was
set there, and that password signed in. The inbox and the account were deleted
again.