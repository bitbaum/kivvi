#!/usr/bin/env node
/**
 * CI only: one account as Auth.js left it — a `users` row with a bcrypt hash,
 * the owner of an onboarded company, and no shared rows — for the browser
 * journey to prove an imported account signs in on AccountKit's form with its
 * old password. Prints SQL for psql, run before scripts/db/accountkit-import.sql.
 * Synthetic address and password, from env.
 *
 *   LEGACY_EMAIL=… LEGACY_PASSWORD=… node scripts/ci/seed-legacy-account.mjs | psql "$DATABASE_URL"
 */
import bcrypt from "bcryptjs";

const { LEGACY_EMAIL, LEGACY_PASSWORD } = process.env;
if (!LEGACY_EMAIL || !LEGACY_PASSWORD) {
  console.error("set LEGACY_EMAIL and LEGACY_PASSWORD");
  process.exit(2);
}
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
// Auth.js-era Kivvi hashed at cost 12 (the removed registerAction).
const hash = await bcrypt.hash(LEGACY_PASSWORD, 12);
process.stdout.write(`
WITH company AS (
  INSERT INTO companies (name, settings)
  VALUES ('Legacy Werkstatt', '{"onboardingCompletedAt":"2026-10-01T00:00:00Z"}')
  RETURNING id
), person AS (
  INSERT INTO users (email, name, password_hash, company_id)
  SELECT ${quote(LEGACY_EMAIL)}, 'Legacy Person', ${quote(hash)}, id FROM company
  RETURNING id, company_id
)
INSERT INTO memberships (user_id, company_id, role) SELECT id, company_id, 'owner' FROM person;
`);
console.error("seeded 1 legacy account (bcrypt, owner of an onboarded company)");
