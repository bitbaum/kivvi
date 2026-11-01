/**
 * Kivvi on AccountKit's shared account runtime. Off until
 * AUTH_RUNTIME=accountkit; Auth.js stays authoritative until the import and the
 * switch (docs/ACCOUNTKIT-MIGRATION.md).
 */
import bcrypt from "bcryptjs";
import { createAuthRuntime } from "@bitbaum/accountkit/auth/next";
import { createAuthMailer } from "@bitbaum/accountkit/auth/mail";
import { authTables } from "@kivvi/database";
import { db } from "@/lib/db";

/** Whether the shared runtime answers. Auth.js answers otherwise. */
export function sharedAuthEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.AUTH_RUNTIME === "accountkit";
}

/** The public origin every redirect and every AccountKit origin check uses. */
export function siteUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (env.NEXTAUTH_URL || env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

const site = { url: siteUrl(), title: "Kivvi", slug: "kivvi" };

export const sharedAuth = createAuthRuntime({
  site,
  // Account mail through the fleet transport (RESEND_*). Kivvi's own reset
  // link keeps its own mailer; only AccountKit's own mail would use this.
  mail: createAuthMailer({ site }),
  // The secret is BETTER_AUTH_SECRET, or the NEXTAUTH_SECRET the box already holds.
  // Read live, never snapshotted at import (a build has no secrets).
  env: new Proxy(process.env, {
    get: (env, key) =>
      key === "BETTER_AUTH_SECRET"
        ? env.BETTER_AUTH_SECRET || env.NEXTAUTH_SECRET
        : env[key as string],
  }),
  isDatabaseConfigured: (env) => sharedAuthEnabled(env) && Boolean(env.DATABASE_URL),
  getDatabase: () => db,
  schema: authTables,
  // Imported bcrypt hashes (users.password_hash) keep working, and Kivvi's own
  // writers (sign-up, reset, password change) keep writing bcrypt.
  legacyBcrypt: bcrypt,
  // users.id is a uuid that every Kivvi table references.
  ids: "uuid",
});
