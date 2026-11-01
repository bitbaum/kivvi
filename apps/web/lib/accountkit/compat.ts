/**
 * /api/auth/*: AccountKit's own endpoints (its sign-in, sign-up, recovery and
 * account screens call them), plus the next-auth/react protocol that
 * `useSession` and `signOut` on Kivvi's other pages still speak, answered with
 * Kivvi's session: company, role and onboarding claims, re-read on every
 * request (docs/ACCOUNTKIT-MIGRATION.md).
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
  // Kivvi renders AccountKit's screens and has no credential writer of its own.
  screens: "accountkit",
});
