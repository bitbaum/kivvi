import { sql } from "drizzle-orm";
import { companies, type CompanySettings, type Database } from "@kivvi/database";
import { sealStoredCompanyAiKey } from "@/lib/company-ai-key";
import { applicationSecret } from "@/lib/integration-secrets";
import { openCompanyAiKey } from "@/lib/security/company-ai-key-crypto";

/**
 * Seal every company AI key that is still plaintext (saved before encryption)
 * or sealed under an older key version.
 *
 * Chat and the company settings page already do this for a company the moment
 * they read its key; this covers the companies nobody has opened since. It runs
 * once at server start (`instrumentation.ts`) and from
 * `scripts/seal-company-ai-keys.ts`. It is idempotent: a second run changes
 * nothing. Each write lands only while the row still holds the value that was
 * read, so a key changed meanwhile is counted, not overwritten.
 *
 * Reports counts only. It never returns or logs a key.
 */

export type SealCounts = {
  /** Plaintext or older-version keys sealed by this run. */
  sealed: number;
  /** Already sealed under the current version: left alone. */
  alreadySealed: number;
  /** Sealed, but they do not open (app secret changed): only an admin can replace them. */
  unreadable: number;
  /** Changed by someone else between the read and the write: left for the next run. */
  unchanged: number;
};

export async function sealCompanyAiKeys(db: Database): Promise<SealCounts> {
  applicationSecret(); // fail before touching anything when no secret is configured

  const rows = await db
    .select({ id: companies.id, settings: companies.settings })
    .from(companies)
    .where(sql`${companies.settings} ? 'aiApiKey'`);

  const counts: SealCounts = { sealed: 0, alreadySealed: 0, unreadable: 0, unchanged: 0 };
  for (const row of rows) {
    const stored = (row.settings as CompanySettings | null)?.aiApiKey;
    const before = openCompanyAiKey(row.id, stored);
    if (before.status === "none") continue;
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
  return counts;
}

/** One line of counts, the same for the script and the start-up log. */
export function describeSealCounts(counts: SealCounts): string {
  return (
    `Company AI keys: ${counts.sealed} sealed now, ${counts.alreadySealed} already sealed, ` +
    `${counts.unreadable} unreadable (an admin must enter them again), ` +
    `${counts.unchanged} changed by someone else meanwhile (run again).`
  );
}

type Log = Pick<Console, "info" | "error">;

/**
 * The start-up run: never throws. Logs one line of counts, or one line saying
 * why it did not run. Resolves to the counts, or null when it failed.
 */
export async function sealCompanyAiKeysOnStart(
  db: Database,
  log: Log = console,
): Promise<SealCounts | null> {
  try {
    const counts = await sealCompanyAiKeys(db);
    log.info(`[seal-company-ai-keys] ${describeSealCounts(counts)}`);
    return counts;
  } catch (error) {
    log.error(
      `[seal-company-ai-keys] skipped at start-up: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
    return null;
  }
}
