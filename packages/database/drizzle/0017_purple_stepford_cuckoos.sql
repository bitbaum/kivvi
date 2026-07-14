ALTER TABLE "inventory_items" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "checklist_data" jsonb;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "data_erasure_method" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "data_erased_at" timestamp;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "data_erased_by_user_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_data_erased_by_user_id_users_id_fk" FOREIGN KEY ("data_erased_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
