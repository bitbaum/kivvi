CREATE TYPE "availability_type" AS ENUM ('volunteer', 'employee', 'contractor', 'founder', 'other');
CREATE TYPE "vacancy_type" AS ENUM ('employee', 'volunteer', 'internship', 'contractor', 'board', 'other');
CREATE TYPE "location_mode" AS ENUM ('onsite', 'hybrid', 'remote');
CREATE TYPE "vacancy_status" AS ENUM ('draft', 'published', 'closed');
CREATE TYPE "join_request_status" AS ENUM ('pending', 'accepted', 'declined', 'withdrawn');

ALTER TABLE "users" ADD COLUMN "location" text;
ALTER TABLE "users" ADD COLUMN "languages" text[] DEFAULT ARRAY[]::text[] NOT NULL;
ALTER TABLE "users" ADD COLUMN "skills" text[] DEFAULT ARRAY[]::text[] NOT NULL;
ALTER TABLE "users" ADD COLUMN "availability_type" "availability_type";

ALTER TABLE "memberships" ADD COLUMN "permission_preset" text DEFAULT 'sales' NOT NULL;
UPDATE "memberships"
SET "permission_preset" = CASE
  WHEN "role" = 'owner' THEN 'owner'
  WHEN "role" = 'admin' THEN 'admin'
  WHEN "role" = 'viewer' THEN 'viewer'
  ELSE 'sales'
END;

ALTER TABLE "invitations" ADD COLUMN "permission_preset" text DEFAULT 'sales' NOT NULL;
UPDATE "invitations"
SET "permission_preset" = CASE
  WHEN "role" = 'admin' THEN 'admin'
  WHEN "role" = 'viewer' THEN 'viewer'
  ELSE 'sales'
END;

CREATE TABLE IF NOT EXISTS "organization_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "public_slug" text NOT NULL,
  "public_name" text NOT NULL,
  "short_description" text,
  "category" text,
  "location" text,
  "website" text,
  "logo_base64" text,
  "is_public" boolean DEFAULT false NOT NULL,
  "accepting_applications" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "organization_profiles_company_id_unique" UNIQUE("company_id"),
  CONSTRAINT "organization_profiles_public_slug_unique" UNIQUE("public_slug")
);

CREATE TABLE IF NOT EXISTS "vacancies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "title" text NOT NULL,
  "type" "vacancy_type" NOT NULL,
  "location_mode" "location_mode" NOT NULL,
  "workload" text,
  "skills" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "status" "vacancy_status" DEFAULT 'draft' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "join_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "vacancy_id" uuid,
  "message" text,
  "status" "join_request_status" DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "organization_profiles"
    ADD CONSTRAINT "organization_profiles_company_id_companies_id_fk"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "vacancies"
    ADD CONSTRAINT "vacancies_company_id_companies_id_fk"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "join_requests"
    ADD CONSTRAINT "join_requests_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "join_requests"
    ADD CONSTRAINT "join_requests_company_id_companies_id_fk"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "join_requests"
    ADD CONSTRAINT "join_requests_vacancy_id_vacancies_id_fk"
    FOREIGN KEY ("vacancy_id") REFERENCES "vacancies"("id") ON DELETE set null;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "organization_profiles_company_id_idx" ON "organization_profiles" ("company_id");
CREATE INDEX IF NOT EXISTS "organization_profiles_public_slug_idx" ON "organization_profiles" ("public_slug");
CREATE INDEX IF NOT EXISTS "organization_profiles_is_public_idx" ON "organization_profiles" ("is_public");
CREATE INDEX IF NOT EXISTS "vacancies_company_id_idx" ON "vacancies" ("company_id");
CREATE INDEX IF NOT EXISTS "vacancies_status_idx" ON "vacancies" ("status");
CREATE INDEX IF NOT EXISTS "join_requests_user_id_idx" ON "join_requests" ("user_id");
CREATE INDEX IF NOT EXISTS "join_requests_company_id_idx" ON "join_requests" ("company_id");
CREATE INDEX IF NOT EXISTS "join_requests_status_idx" ON "join_requests" ("status");
