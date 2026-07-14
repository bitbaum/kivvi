DO $$ BEGIN
 CREATE TYPE "cost_center_kind" AS ENUM('activity', 'fund');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cost_centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"kind" "cost_center_kind" DEFAULT 'activity' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "cost_center_id" uuid;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD COLUMN "cost_center_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cost_centers_company_id_code_idx" ON "cost_centers" ("company_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cost_centers_company_id_idx" ON "cost_centers" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journal_lines_cost_center_id_idx" ON "journal_lines" ("cost_center_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
