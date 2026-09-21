import { eq, sql } from "drizzle-orm";
import { companies } from "@kivvi/database";
import type { Database, Company, CompanySettings } from "@kivvi/database";

export async function getCompany(db: Database, companyId: string): Promise<Company | undefined> {
  return db.query.companies.findFirst({
    where: eq(companies.id, companyId),
  });
}

export async function getCompanySettings(
  db: Database,
  companyId: string,
): Promise<CompanySettings> {
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
    columns: { settings: true },
  });
  return (company?.settings as CompanySettings) ?? {};
}

/**
 * Split a settings patch into the keys to write and the keys to delete.
 *
 * An explicit `undefined` means "remove this key" — it mirrors the semantics of
 * the read-modify-write this helper replaces, where `{ ...existing, k: undefined }`
 * was serialised by `JSON.stringify` and the key vanished from the stored JSON.
 */
export function splitSettingsPatch(patch: Partial<CompanySettings>): {
  set: Record<string, unknown>;
  remove: string[];
} {
  const set: Record<string, unknown> = {};
  const remove: string[] = [];

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      remove.push(key);
    } else {
      set[key] = value;
    }
  }

  return { set, remove };
}

/**
 * Merge a patch into `companies.settings` atomically, in a single UPDATE.
 *
 * Ground Truth #5 — the system must be authoritative. The obvious shape here is
 * SELECT settings, spread a patch over it in JS, UPDATE the whole column back.
 * That is a lost update waiting to happen: two writers that read before either
 * writes will each persist their own merge, and whoever commits last silently
 * erases the other's fields.
 *
 * This is not hypothetical on the billing path. Stripe fires
 * `checkout.session.completed` and `customer.subscription.updated` within
 * milliseconds of the same subscription being created, and Next.js serves them
 * as concurrent requests. Read-modify-write there can drop `stripeSubscriptionId`
 * or `plan: "premium"` from a customer who has already paid — the subscriber is
 * charged and left on the free plan.
 *
 * Postgres `jsonb ||` does the same shallow merge server-side, against the row's
 * current value, under the UPDATE's row lock. Concurrent merges of disjoint keys
 * both survive.
 */
export async function mergeCompanySettings(
  db: Database,
  companyId: string,
  patch: Partial<CompanySettings>,
): Promise<void> {
  const { set, remove } = splitSettingsPatch(patch);

  if (Object.keys(set).length === 0 && remove.length === 0) return;

  let settingsExpr = sql`COALESCE(${companies.settings}, '{}'::jsonb) || ${JSON.stringify(set)}::jsonb`;
  // `jsonb - text` drops a key. Applied one key at a time so every operand stays
  // a plain bound parameter (no driver-specific text[] binding).
  for (const key of remove) {
    settingsExpr = sql`${settingsExpr} - ${key}::text`;
  }

  await db
    .update(companies)
    .set({ settings: settingsExpr, updatedAt: new Date() })
    .where(eq(companies.id, companyId));
}
