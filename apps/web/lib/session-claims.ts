import { eq } from "drizzle-orm";
import { companies, users } from "@kivvi/database";
import type { CompanySettings, Database } from "@kivvi/database";
import { findMembership } from "@kivvi/core/src/domain/memberships";

/** What Kivvi's session carries beside who the person is. */
export interface KivviClaims {
  companyId: string | null;
  companyName: string | null;
  role: string;
  onboardingComplete: boolean;
  enabledModules: string[] | null;
}

const NO_COMPANY: KivviClaims = {
  companyId: null,
  companyName: null,
  role: "member",
  onboardingComplete: false,
  enabledModules: null,
};

/**
 * The person's active company and their place in it, read fresh. One rule for
 * both runtimes: the Auth.js jwt callback calls it at sign-in and on update;
 * the AccountKit session calls it on every request. The role comes from
 * `memberships` (the SSOT for roles), never from `users.role`.
 */
export async function claimsFor(db: Database, companyId: string | null, userId: string) {
  if (!companyId) return NO_COMPANY;
  const [membership, company] = await Promise.all([
    findMembership(db, userId, companyId),
    db.query.companies.findFirst({ where: eq(companies.id, companyId) }),
  ]);
  const settings = (company?.settings as CompanySettings | null) ?? {};
  return {
    companyId,
    companyName: company?.name ?? null,
    role: membership?.role ?? "member",
    onboardingComplete: !!settings.onboardingCompletedAt,
    enabledModules: settings.enabledModules ?? null,
  } satisfies KivviClaims;
}

/** The `users` row and its claims, or null when the person no longer exists. */
export async function sessionUserFor(db: Database, userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    ...(await claimsFor(db, user.companyId, user.id)),
  };
}
