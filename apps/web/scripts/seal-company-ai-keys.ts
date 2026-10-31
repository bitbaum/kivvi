#!/usr/bin/env tsx
/**
 * Seal every company AI key that is still plaintext (saved before encryption)
 * or sealed under an older key version.
 *
 * The web app does this by itself once at every server start
 * (`instrumentation.ts` → `lib/seal-company-ai-keys.ts`), so on the box nobody
 * needs to run this. It stays for running the same sealing by hand from a
 * checkout, with the production env (it needs DATABASE_URL and the same app
 * secret the web app uses):
 *
 *   pnpm --filter @kivvi/web exec tsx scripts/seal-company-ai-keys.ts
 *
 * Prints counts only. It never prints a key.
 */
import { createDb, type Database } from "@kivvi/database";
import { describeSealCounts, sealCompanyAiKeys } from "@/lib/seal-company-ai-keys";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const db = createDb(process.env.DATABASE_URL) as unknown as Database;
  const counts = await sealCompanyAiKeys(db);
  process.stdout.write(`${describeSealCounts(counts)}\n`);
  process.exit(0);
}

main().catch((error: unknown) => {
  process.stderr.write(
    `seal-company-ai-keys failed: ${error instanceof Error ? error.message : "unknown error"}\n`,
  );
  process.exit(1);
});
