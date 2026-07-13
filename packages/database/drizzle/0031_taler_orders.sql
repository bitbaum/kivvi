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
DO $$ BEGIN
 ALTER TABLE "taler_orders" ADD CONSTRAINT "taler_orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "taler_orders" ADD CONSTRAINT "taler_orders_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "taler_orders_document_id_idx" ON "taler_orders" USING btree ("document_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "taler_orders_company_status_idx" ON "taler_orders" USING btree ("company_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "taler_orders_company_order_id_idx" ON "taler_orders" USING btree ("company_id","order_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "taler_orders_document_unpaid_claimed_idx" ON "taler_orders" USING btree ("document_id") WHERE "status" IN ('unpaid', 'claimed');
