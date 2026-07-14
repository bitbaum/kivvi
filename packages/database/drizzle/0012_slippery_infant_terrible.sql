ALTER TABLE "document_items" ADD COLUMN "inventory_item_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "document_items" ADD CONSTRAINT "document_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
