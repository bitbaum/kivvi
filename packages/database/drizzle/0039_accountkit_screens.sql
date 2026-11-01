-- AccountKit's screens are the only writer of credentials since this release
-- (docs/ACCOUNTKIT-MIGRATION.md). Its account panel renames a person and
-- deletes an account in `auth_users`; both now reach Kivvi's `users`:
--   - a rename sets users.name (an empty name clears it);
--   - a deletion deletes the users row; memberships and reset tokens cascade.
--     Rows that must be kept (documents, journal, audit log) reference users
--     without a cascade, so such a person is refused before anything is
--     deleted (lib/accountkit/kivvi-plugin.ts).
-- The functions are replaced in place, so a box whose mirror is attached picks
-- them up at once. The deletion trigger is attached here only where the mirror
-- already is (production since the 2026-11-01 import); elsewhere the import
-- attaches it with the others. Additive and idempotent.
CREATE OR REPLACE FUNCTION kivvi_accountkit_to_users() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE users SET email = NEW.email, updated_at = now()
    WHERE id::text = NEW.id AND lower(email) IS DISTINCT FROM NEW.email;
  END IF;
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE users SET name = nullif(NEW.name, ''), updated_at = now()
    WHERE id::text = NEW.id AND coalesce(name, '') IS DISTINCT FROM NEW.name;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION kivvi_accountkit_delete_users() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM users WHERE id::text = OLD.id;
  RETURN OLD;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'kivvi_accountkit_to_users' AND NOT tgisinternal) THEN
    DROP TRIGGER IF EXISTS kivvi_accountkit_delete_users ON auth_users;
    CREATE TRIGGER kivvi_accountkit_delete_users AFTER DELETE ON auth_users
      FOR EACH ROW EXECUTE FUNCTION kivvi_accountkit_delete_users();
  END IF;
END $$;
