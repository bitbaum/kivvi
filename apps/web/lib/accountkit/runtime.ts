/**
 * Kivvi's accounts, on AccountKit's shared runtime: email and password, an
 * email sign-in link, passkeys, two-factor codes, password recovery, Continue
 * with OrangeCat and the shared bitbaum sign-in, each shown when its env is set
 * (signInMethods in lib/accountkit/methods.ts). AccountKit is the only writer
 * of credentials (docs/ACCOUNTKIT-MIGRATION.md).
 */
import bcrypt from "bcryptjs";
import { createAuthRuntime } from "@bitbaum/accountkit/auth/next";
import { createAuthMailer } from "@bitbaum/accountkit/auth/mail";
import { authTables } from "@kivvi/database";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/security/public-url";
import { ensureKivviUser } from "./accounts";
import { kivviPlugin } from "./kivvi-plugin";

/** The public origin every redirect and every AccountKit origin check uses. */
export { siteUrl };

const site = { url: siteUrl(), title: "Kivvi", slug: "kivvi" };

/** Account mail (sign-in links, recovery, confirmation) through the fleet transport (RESEND_*). */
export const authMail = createAuthMailer({ site });

export const sharedAuth = createAuthRuntime({
  site,
  mail: authMail,
  // The secret is BETTER_AUTH_SECRET, or the NEXTAUTH_SECRET the box already holds.
  // Read live, never snapshotted at import (a build has no secrets).
  env: new Proxy(process.env, {
    get: (env, key) =>
      key === "BETTER_AUTH_SECRET"
        ? env.BETTER_AUTH_SECRET || env.NEXTAUTH_SECRET
        : env[key as string],
  }),
  isDatabaseConfigured: (env) => Boolean(env.DATABASE_URL),
  getDatabase: () => db,
  schema: authTables,
  // Hashes imported from Auth.js (users.password_hash) are bcrypt; every
  // password set through AccountKit is its native scrypt.
  legacyBcrypt: bcrypt,
  // users.id is a uuid that every Kivvi table references.
  ids: "uuid",
  onAccountCreated: ensureKivviUser,
  plugins: [kivviPlugin()],
});
