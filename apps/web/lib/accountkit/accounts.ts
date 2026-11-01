/**
 * A person AccountKit created itself (a sign-up, an email sign-in link to a
 * new address, or a first OrangeCat or bitbaum sign-in) gets Kivvi's `users`
 * row under the same id, so memberships, documents and the audit log can
 * reference them. They start without a company and land on /join, where they
 * create one or accept an invitation. Idempotent: AccountKit may call this
 * more than once for one person.
 */
import { eq } from "drizzle-orm";
import { authUsers, users } from "@kivvi/database";
import { db } from "@/lib/db";

export async function ensureKivviUser(account: { userId: string }): Promise<void> {
  const existing = await db.query.users.findFirst({
    where: eq(users.id, account.userId),
    columns: { id: true },
  });
  if (existing) return;
  const [shared] = await db
    .select({ email: authUsers.email, name: authUsers.name })
    .from(authUsers)
    .where(eq(authUsers.id, account.userId))
    .limit(1);
  if (!shared) return;
  await db
    .insert(users)
    .values({
      id: account.userId,
      // An OIDC person carries AccountKit's `.invalid` placeholder: unique,
      // never mailed, and never matched against an invitation.
      email: shared.email,
      name: shared.name || null,
    })
    .onConflictDoNothing();
}
