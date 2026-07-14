DO $$ BEGIN
 CREATE TYPE "subsidy_claim_status" AS ENUM('applied', 'claimed', 'settled', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subsidy_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"program_key" text NOT NULL,
	"code" text,
	"face_amount" numeric(12, 2) NOT NULL,
	"applied_amount" numeric(12, 2) NOT NULL,
	"status" "subsidy_claim_status" DEFAULT 'applied' NOT NULL,
	"settlement_party" text,
	"receivable_account_id" uuid,
	"settled_at" timestamp,
	"external_ref" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "device_info" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "fault_description" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "advance_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "external_job_ref" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subsidy_claims_company_id_idx" ON "subsidy_claims" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subsidy_claims_document_id_idx" ON "subsidy_claims" ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subsidy_claims_company_status_idx" ON "subsidy_claims" ("company_id","status");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subsidy_claims" ADD CONSTRAINT "subsidy_claims_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subsidy_claims" ADD CONSTRAINT "subsidy_claims_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subsidy_claims" ADD CONSTRAINT "subsidy_claims_receivable_account_id_accounts_id_fk" FOREIGN KEY ("receivable_account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
