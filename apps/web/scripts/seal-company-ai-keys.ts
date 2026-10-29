#!/usr/bin/env tsx
/**
 * Seal every company AI key that is still plaintext (saved before encryption)
 * or sealed under an older key version.
 *
 * Chat and the company settings page already do this for a company the moment
 * they read its key; this covers the companies nobody has opened since. It is
 * idempotent — a second run changes nothing — and each write only lands while
 * the row still holds the value that was read.
 *
 * Run by an operator, like `pnpm db:migrate`, with the production env (it needs
 * DATABASE_URL and the same app secret the web app uses):
 *
 *   pnpm --filter @kivvi/web exec tsx scripts/seal-company-ai-keys.ts
 *
 * Prints counts only. It never prints a key.
 */
import { sql } from "drizzle-orm";
import { companies, createDb, type CompanySettings, type Database } from "@kivvi/database";
import { sealStoredCompanyAiKey } from "@/lib/company-ai-key";
import { applicationSecret } from "@/lib/integration-secrets";
import { openCompanyAiKey } from "@/lib/security/company-ai-key-crypto";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  applicationSecret(); // fail before touching anything when no secret is configured

  const db = createDb(process.env.DATABASE_URL) as unknown as Database;
  const rows = await db
    .select({ id: companies.id, settings: companies.settings })
    .from(companies)
    .where(sql`${companies.settings} ? 'aiApiKey'`);

  const counts = { sealed: 0, alreadySealed: 0, unreadable: 0, unchanged: 0 };
  for (const row of rows) {
    const stored = (row.settings as CompanySettings | null)?.aiApiKey;
    const before = openCompanyAiKey(row.id, stored);
    if (before.status === "unreadable") {
      counts.unreadable++;
      continue;
    }
    if (before.status === "sealed" && !before.stale) {
      counts.alreadySealed++;
      continue;
    }
    const after = await sealStoredCompanyAiKey(db, row.id, stored);
    if (after !== stored) counts.sealed++;
    else counts.unchanged++;
  }

  process.stdout.write(
    `Company AI keys: ${counts.sealed} sealed now, ${counts.alreadySealed} already sealed, ` +
      `${counts.unreadable} unreadable (an admin must enter them again), ` +
      `${counts.unchanged} changed by someone else meanwhile (run again).\n`,
  );
  process.exit(0);
}

main().catch((error: unknown) => {
  process.stderr.write(
    `seal-company-ai-keys failed: ${error instanceof Error ? error.message : "unknown error"}\n`,
  );
  process.exit(1);
});
