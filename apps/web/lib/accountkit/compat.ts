/**
 * Kivvi's screens on the shared runtime, unchanged: AccountKit's
 * next-auth/react compat layer, given what is Kivvi's own — the session with
 * its company, role and onboarding claims, re-read on every request, and the
 * password form (docs/ACCOUNTKIT-MIGRATION.md).
 */
import type { Session } from "next-auth";
import { createNextAuthCompat } from "@bitbaum/accountkit/auth/nextauth-compat";
import { db } from "@/lib/db";
import { sessionUserFor } from "@/lib/session-claims";
import { sharedAuth, siteUrl } from "./runtime";

export const compat = createNextAuthCompat<Session>({
  runtime: sharedAuth,
  siteUrl: () => siteUrl(),
  signInPath: "/login",
  landing: "/dashboard",
  toSession: async (shared) => {
    const user = await sessionUserFor(db, shared.user.id);
    return user ? { user, expires: new Date(shared.session.expiresAt).toISOString() } : null;
  },
  credentials: {
    credentials: {
      name: "credentials",
      resolve: async (form) => {
        const email = String(form.get("email") ?? "").trim();
        return email ? { email } : null;
      },
    },
  },
  // The login page shows one sentence for every refusal it can explain.
  codes: { missing: "credentials" },
});
