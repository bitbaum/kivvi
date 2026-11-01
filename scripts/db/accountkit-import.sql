-- Copy Kivvi's accounts into AccountKit's auth_* tables (migration 0038). Run
-- only inside a transaction, with Kivvi's credential writes stopped for the
-- cutover. The rehearsal CLI (accountkit-import-rehearse.mjs) always rolls
-- back; this is deliberately not a migration. docs/ACCOUNTKIT-MIGRATION.md.
--
-- Each users.id stays the shared user id, so every table that references it
-- (memberships, documents, audit rows) keeps pointing at the same person.
-- Company, membership and role stay Kivvi's; AccountKit's generic role is not
-- used. Kivvi has never verified an address, so every imported address starts
-- unverified, which since AccountKit 0.16.0 still signs in.
LOCK TABLE users, auth_users, auth_accounts, auth_sessions,
  auth_passkeys, auth_two_factors, auth_verifications IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE kivvi_accountkit_users ON COMMIT DROP AS
SELECT id::text AS id, coalesce(name, '') AS name, lower(trim(email)) AS email,
  password_hash AS password
FROM users;

DO $$ BEGIN
  IF EXISTS (SELECT email FROM kivvi_accountkit_users GROUP BY email HAVING count(*) > 1)
    OR EXISTS (SELECT 1 FROM kivvi_accountkit_users WHERE email = '' OR email NOT LIKE '%@%')
  THEN RAISE EXCEPTION 'Account import requires address reconciliation'; END IF;

  -- Never a second writer beside a live shared runtime: nothing a person did
  -- there (a session, a passkey, a factor, a token) may be overwritten.
  IF EXISTS (SELECT 1 FROM auth_sessions) OR EXISTS (SELECT 1 FROM auth_passkeys)
    OR EXISTS (SELECT 1 FROM auth_two_factors) OR EXISTS (SELECT 1 FROM auth_verifications)
  THEN RAISE EXCEPTION 'Account import refuses an active shared runtime'; END IF;
END $$;

INSERT INTO auth_users (id, name, email, email_verified)
SELECT id, name, email, false FROM kivvi_accountkit_users
ON CONFLICT DO NOTHING;

-- bcrypt hashes byte for byte: the runtime verifies them through legacyBcrypt.
INSERT INTO auth_accounts (id, account_id, provider_id, user_id, password)
SELECT 'kivvi-credential:' || id, id, 'credential', id, password
FROM kivvi_accountkit_users WHERE password IS NOT NULL
ON CONFLICT DO NOTHING;

DO $$ BEGIN
  -- A repeat is a no-op only for the same snapshot. Anything that drifted (an
  -- address, a password) fails the whole transaction.
  IF EXISTS (
    SELECT 1 FROM kivvi_accountkit_users s
    LEFT JOIN auth_users u ON u.id = s.id
    LEFT JOIN auth_accounts c ON c.user_id = s.id AND c.provider_id = 'credential'
    WHERE u.id IS NULL OR u.email IS DISTINCT FROM s.email
      OR c.password IS DISTINCT FROM s.password
      OR (s.password IS NULL AND c.id IS NOT NULL)
  ) OR EXISTS (
    SELECT 1 FROM auth_users u
    WHERE NOT EXISTS (SELECT 1 FROM kivvi_accountkit_users s WHERE s.id = u.id)
  ) OR EXISTS (
    SELECT 1 FROM auth_accounts a WHERE a.provider_id <> 'credential'
  ) THEN RAISE EXCEPTION 'Account import snapshot differs; no changes committed'; END IF;
END $$;

-- From here on every writer of either table keeps the other in step
-- (functions in migrations 0038 and 0039). Rolled back with everything else in a rehearsal.
DROP TRIGGER IF EXISTS kivvi_accountkit_from_users ON users;
CREATE TRIGGER kivvi_accountkit_from_users AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION kivvi_accountkit_from_users();
DROP TRIGGER IF EXISTS kivvi_accountkit_to_users ON auth_users;
CREATE TRIGGER kivvi_accountkit_to_users AFTER UPDATE ON auth_users
  FOR EACH ROW EXECUTE FUNCTION kivvi_accountkit_to_users();
-- AccountKit's own account deletion removes the Kivvi person (migration 0039).
DROP TRIGGER IF EXISTS kivvi_accountkit_delete_users ON auth_users;
CREATE TRIGGER kivvi_accountkit_delete_users AFTER DELETE ON auth_users
  FOR EACH ROW EXECUTE FUNCTION kivvi_accountkit_delete_users();
