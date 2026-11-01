-- AccountKit's account tables, staged beside Auth.js (bitbaum/accountkit).
--
-- Kivvi still signs in through Auth.js (apps/web/lib/auth.ts). These tables are
-- where @bitbaum/accountkit keeps accounts once AUTH_RUNTIME=accountkit is set;
-- until then nothing reads or writes them. They carry an `auth_` prefix because
-- Kivvi already owns `users` (createAuthTables('auth_') in src/accountkit.ts).
-- The columns are the package's own.
--
-- Additive: empty tables and two functions no trigger calls yet. The data
-- import is scripts/db/accountkit-import.sql, deliberately not a migration
-- (docs/ACCOUNTKIT-MIGRATION.md).

CREATE TABLE IF NOT EXISTS "auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_passkeys" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"public_key" text NOT NULL,
	"user_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"transports" text,
	"aaguid" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "auth_passkeys_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_two_factors" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL,
	"verified" boolean DEFAULT true,
	"failed_verification_count" integer DEFAULT 0,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'customer' NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auth_accounts_user_id_auth_users_id_fk') THEN
    ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auth_passkeys_user_id_auth_users_id_fk') THEN
    ALTER TABLE "auth_passkeys" ADD CONSTRAINT "auth_passkeys_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auth_sessions_user_id_auth_users_id_fk') THEN
    ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auth_two_factors_user_id_auth_users_id_fk') THEN
    ALTER TABLE "auth_two_factors" ADD CONSTRAINT "auth_two_factors_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_accounts_user_id_idx" ON "auth_accounts" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "auth_accounts_provider_account_uidx" ON "auth_accounts" USING btree ("provider_id","account_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_passkeys_user_id_idx" ON "auth_passkeys" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_two_factors_user_id_idx" ON "auth_two_factors" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_two_factors_secret_idx" ON "auth_two_factors" USING btree ("secret");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "auth_verifications_identifier_idx" ON "auth_verifications" USING btree ("identifier");
--> statement-breakpoint
-- The mirror between `users` and `auth_users`, attached only by the cutover
-- import (scripts/db/accountkit-import.sql). Until then no trigger calls these.
--
-- Once attached, every Kivvi writer of `users` (registration, the invite
-- sign-up, the reset link, the settings password change) keeps the shared row
-- in step. A password is copied only when `users.password_hash` itself
-- changes, and that change ends every shared session except the one named in
-- the transaction setting `kivvi.keep_session` (the person changing their own
-- password stays signed in; a reset ends everything). An address change made
-- by AccountKit reaches `users`. Both directions compare before writing, so
-- neither re-triggers the other.
CREATE OR REPLACE FUNCTION kivvi_accountkit_from_users() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM auth_users WHERE id = OLD.id::text;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO auth_users (id, name, email)
    VALUES (NEW.id::text, coalesce(NEW.name, ''), lower(trim(NEW.email)))
    ON CONFLICT DO NOTHING;
  ELSE
    UPDATE auth_users SET
      name = coalesce(NEW.name, ''),
      email = lower(trim(NEW.email)),
      updated_at = now()
    WHERE id = NEW.id::text AND (
      name IS DISTINCT FROM coalesce(NEW.name, '')
      OR email IS DISTINCT FROM lower(trim(NEW.email)));
  END IF;

  IF NEW.password_hash IS NOT NULL AND (TG_OP = 'INSERT'
      OR NEW.password_hash IS DISTINCT FROM OLD.password_hash) THEN
    INSERT INTO auth_accounts (id, account_id, provider_id, user_id, password)
    VALUES ('kivvi-credential:' || NEW.id, NEW.id::text, 'credential', NEW.id::text, NEW.password_hash)
    ON CONFLICT (provider_id, account_id)
      DO UPDATE SET password = EXCLUDED.password, updated_at = now();
    IF TG_OP = 'UPDATE' THEN
      DELETE FROM auth_sessions WHERE user_id = NEW.id::text
        AND id IS DISTINCT FROM nullif(current_setting('kivvi.keep_session', true), '');
    END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION kivvi_accountkit_to_users() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE users SET email = NEW.email, updated_at = now()
    WHERE id::text = NEW.id AND lower(email) IS DISTINCT FROM NEW.email;
  END IF;
  RETURN NEW;
END $$;
