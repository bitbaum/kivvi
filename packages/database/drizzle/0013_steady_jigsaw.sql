ALTER TYPE "item_status" ADD VALUE 'returned';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "repair_cost" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "repair_hours" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "repair_log" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "photo_base64" text;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "photo_mime_type" text;