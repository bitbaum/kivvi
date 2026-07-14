CREATE TABLE IF NOT EXISTS "posting_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"revenue_account_id" uuid NOT NULL,
	"expense_account_id" uuid,
	"inventory_account_id" uuid,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_items" ADD COLUMN "posting_group_id" uuid;--> statement-breakpoint
ALTER TABLE "product_groups" ADD COLUMN "default_posting_group_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "posting_group_id" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posting_groups_company_id_idx" ON "posting_groups" ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "posting_groups_company_name_idx" ON "posting_groups" ("company_id","name");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_items" ADD CONSTRAINT "document_items_posting_group_id_posting_groups_id_fk" FOREIGN KEY ("posting_group_id") REFERENCES "posting_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_groups" ADD CONSTRAINT "product_groups_default_posting_group_id_posting_groups_id_fk" FOREIGN KEY ("default_posting_group_id") REFERENCES "posting_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "products" ADD CONSTRAINT "products_posting_group_id_posting_groups_id_fk" FOREIGN KEY ("posting_group_id") REFERENCES "posting_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posting_groups" ADD CONSTRAINT "posting_groups_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posting_groups" ADD CONSTRAINT "posting_groups_revenue_account_id_accounts_id_fk" FOREIGN KEY ("revenue_account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posting_groups" ADD CONSTRAINT "posting_groups_expense_account_id_accounts_id_fk" FOREIGN KEY ("expense_account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posting_groups" ADD CONSTRAINT "posting_groups_inventory_account_id_accounts_id_fk" FOREIGN KEY ("inventory_account_id") REFERENCES "accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
