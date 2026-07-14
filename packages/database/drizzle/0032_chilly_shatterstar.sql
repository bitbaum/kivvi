DO $$ BEGIN
 CREATE TYPE "availability_type" AS ENUM('volunteer', 'employee', 'contractor', 'founder', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "join_request_status" AS ENUM('pending', 'accepted', 'declined', 'withdrawn');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "location_mode" AS ENUM('onsite', 'hybrid', 'remote');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "vacancy_status" AS ENUM('draft', 'published', 'closed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "vacancy_type" AS ENUM('employee', 'volunteer', 'internship', 'contractor', 'board', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"at" timestamp DEFAULT now() NOT NULL,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "external_integration_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"from_name" text,
	"from_email" text,
	"occurred_at" timestamp,
	"url" text,
	"raw" jsonb DEFAULT '{}'::jsonb,
	"contact_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ledger_heads" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"last_sequence_no" bigint DEFAULT 0 NOT NULL,
	"last_hash" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "taler_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"order_id" text NOT NULL,
	"status" text DEFAULT 'unpaid' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'CHF' NOT NULL,
	"taler_pay_uri" text,
	"order_status_url" text,
	"pay_deadline" timestamp,
	"paid_at" timestamp,
	"last_checked_at" timestamp,
	"last_error" text,
	"raw" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "permission_preset" text DEFAULT 'sales' NOT NULL;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "posted_at" timestamp;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "sequence_no" bigint;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "entry_hash" text;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "prev_hash" text;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "reverses_entry_id" uuid;--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN "reversed_by_entry_id" uuid;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "permission_preset" text DEFAULT 'sales' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "languages" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "skills" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "availability_type" "availability_type";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_company_at_idx" ON "audit_log" ("company_id","at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_entity_idx" ON "audit_log" ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "external_integration_items_company_source_external_idx" ON "external_integration_items" ("company_id","source","external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_integration_items_company_status_idx" ON "external_integration_items" ("company_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "external_integration_items_contact_id_idx" ON "external_integration_items" ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "join_requests_user_id_idx" ON "join_requests" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "join_requests_company_id_idx" ON "join_requests" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "join_requests_status_idx" ON "join_requests" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_profiles_company_id_idx" ON "organization_profiles" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_profiles_public_slug_idx" ON "organization_profiles" ("public_slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "organization_profiles_is_public_idx" ON "organization_profiles" ("is_public");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "taler_orders_document_id_idx" ON "taler_orders" ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "taler_orders_company_status_idx" ON "taler_orders" ("company_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "taler_orders_company_order_id_idx" ON "taler_orders" ("company_id","order_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "taler_orders_document_unpaid_claimed_idx" ON "taler_orders" ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vacancies_company_id_idx" ON "vacancies" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "vacancies_status_idx" ON "vacancies" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "journal_entries_company_seq_idx" ON "journal_entries" ("company_id","sequence_no");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reverses_entry_id_journal_entries_id_fk" FOREIGN KEY ("reverses_entry_id") REFERENCES "journal_entries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_reversed_by_entry_id_journal_entries_id_fk" FOREIGN KEY ("reversed_by_entry_id") REFERENCES "journal_entries"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "external_integration_items" ADD CONSTRAINT "external_integration_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "external_integration_items" ADD CONSTRAINT "external_integration_items_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_vacancy_id_vacancies_id_fk" FOREIGN KEY ("vacancy_id") REFERENCES "vacancies"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ledger_heads" ADD CONSTRAINT "ledger_heads_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "organization_profiles" ADD CONSTRAINT "organization_profiles_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "taler_orders" ADD CONSTRAINT "taler_orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "taler_orders" ADD CONSTRAINT "taler_orders_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vacancies" ADD CONSTRAINT "vacancies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
