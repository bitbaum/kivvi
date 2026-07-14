DO $$ BEGIN
 CREATE TYPE "fund_restriction" AS ENUM('extern_zweckgebunden', 'intern_gebunden', 'frei');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "funds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"restriction_type" "fund_restriction" DEFAULT 'extern_zweckgebunden' NOT NULL,
	"purpose" text,
	"restricted_by" text,
	"capital_account_id" uuid,
	"opening_balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal_lines" ADD COLUMN "fund_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "funds_company_id_code_idx" ON "funds" ("company_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funds_company_id_idx" ON "funds" ("company_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_fund_id_funds_id_fk" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "funds" ADD CONSTRAINT "funds_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "funds" ADD CONSTRAINT "funds_capital_account_id_accounts_id_fk" FOREIGN KEY ("capital_account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
