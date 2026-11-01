import { createAuthTables } from "@bitbaum/accountkit/auth/schema";

/**
 * AccountKit's account tables under the `auth_` prefix, beside Kivvi's own
 * `users`. Read and written by the shared runtime (apps/web/lib/accountkit/)
 * and the mirror triggers (migrations 0038 and 0039).
 * See docs/ACCOUNTKIT-MIGRATION.md.
 */
export const authTables = createAuthTables("auth_");

export const {
  user: authUsers,
  account: authAccounts,
  session: authSessions,
  verification: authVerifications,
  passkey: authPasskeys,
  twoFactor: authTwoFactors,
} = authTables;
