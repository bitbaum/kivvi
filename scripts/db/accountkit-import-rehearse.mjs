// Rehearse scripts/db/accountkit-import.sql against an isolated database that
// holds an authorised snapshot. Always rolls back and prints only counts.
// There is no apply mode until the runtime switch is ready
// (docs/ACCOUNTKIT-MIGRATION.md). It takes locks even though it rolls back, so
// never point it at the served database.
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// postgres-js is a dependency of @kivvi/database, not of the workspace root.
const postgres = createRequire(new URL("../../packages/database/package.json", import.meta.url))(
  "postgres",
);

if (process.argv.length > 2) throw new Error("This command only supports rollback rehearsals");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const ROLLBACK = Symbol("rollback");
const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 5, onnotice: () => {} });
const script = await readFile(
  fileURLToPath(new URL("./accountkit-import.sql", import.meta.url)),
  "utf8",
);
let counts;
try {
  await sql.begin(async (tx) => {
    await tx.unsafe("SET LOCAL lock_timeout = '5s'; SET LOCAL statement_timeout = '30s'");
    await tx.unsafe(script);
    [counts] = await tx.unsafe(`
      SELECT (SELECT count(*)::int FROM kivvi_accountkit_users) AS accounts,
        (SELECT count(*)::int FROM kivvi_accountkit_users WHERE password IS NOT NULL) AS password_accounts
    `);
    throw ROLLBACK;
  });
} catch (error) {
  if (error !== ROLLBACK) {
    // Constraint errors can carry addresses or hashes; keep output fixed.
    console.error("Account import rehearsal failed; transaction rolled back");
    process.exitCode = 1;
  }
} finally {
  await sql.end();
}
if (counts) console.log(JSON.stringify({ rehearsal: "rolled_back", ...counts }));
