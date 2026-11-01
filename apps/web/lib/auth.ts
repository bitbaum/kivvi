import type { Session } from "next-auth";
import { compat } from "./accountkit/compat";

/**
 * Who is signed in: AccountKit's session, in Kivvi's shape (company, role,
 * onboarding and modules), re-read from `users` and the membership on every
 * request (lib/accountkit/compat.ts, docs/ACCOUNTKIT-MIGRATION.md).
 */
export function auth(): Promise<Session | null> {
  return compat.currentSession();
}

/** /api/auth/*: AccountKit's endpoints and the next-auth/react protocol. */
export const handlers = compat.route;

// Helper to get current session in server components
export { auth as getSession };
