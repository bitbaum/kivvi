DO $$ BEGIN
 CREATE TYPE "intake_source" AS ENUM('donation', 'trade_in', 'purchase', 'consignment');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "item_condition" AS ENUM('untested', 'like_new', 'good', 'fair', 'poor', 'parts_only', 'scrap');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "item_status" AS ENUM('intake', 'testing', 'repair', 'ready_for_sale', 'listed', 'reserved', 'sold', 'donated', 'recycled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "document_type" ADD VALUE 'intake';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"product_id" uuid,
	"warehouse_id" uuid,
	"item_number" text NOT NULL,
	"description" text NOT NULL,
	"condition" "item_condition" DEFAULT 'untested' NOT NULL,
	"status" "item_status" DEFAULT 'intake' NOT NULL,
	"intake_document_id" uuid,
	"sale_document_id" uuid,
	"donor_contact_id" uuid,
	"estimated_value" numeric(12, 2),
	"asking_price" numeric(12, 2),
	"min_price" numeric(12, 2),
	"sold_price" numeric(12, 2),
	"notes" text,
	"specs" jsonb,
	"serial_number" text,
	"location" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "intake_source" "intake_source";--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "donor_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "is_price_flexible" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "min_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "max_price" numeric(12, 2);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_items_company_id_idx" ON "inventory_items" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_items_company_status_idx" ON "inventory_items" ("company_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_items_company_condition_idx" ON "inventory_items" ("company_id","condition");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_items_intake_doc_idx" ON "inventory_items" ("intake_document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_items_item_number_idx" ON "inventory_items" ("company_id","item_number");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_donor_id_contacts_id_fk" FOREIGN KEY ("donor_id") REFERENCES "contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_intake_document_id_documents_id_fk" FOREIGN KEY ("intake_document_id") REFERENCES "documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_sale_document_id_documents_id_fk" FOREIGN KEY ("sale_document_id") REFERENCES "documents"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_donor_contact_id_contacts_id_fk" FOREIGN KEY ("donor_contact_id") REFERENCES "contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
