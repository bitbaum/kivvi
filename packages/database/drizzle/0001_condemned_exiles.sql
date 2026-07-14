DO $$ BEGIN
 CREATE TYPE "recurring_periodicity" AS ENUM('monthly', 'quarterly', 'annual');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recurring_invoice_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"periodicity" "recurring_periodicity" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"auto_extension_months" integer,
	"last_generated_date" date,
	"next_generation_date" date NOT NULL,
	"email_recipients" text[],
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recurring_invoice_configs_company_id_idx" ON "recurring_invoice_configs" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recurring_invoice_configs_next_generation_idx" ON "recurring_invoice_configs" ("next_generation_date","is_active");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recurring_invoice_configs" ADD CONSTRAINT "recurring_invoice_configs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "recurring_invoice_configs" ADD CONSTRAINT "recurring_invoice_configs_order_id_documents_id_fk" FOREIGN KEY ("order_id") REFERENCES "documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
