CREATE INDEX IF NOT EXISTS "ai_conversations_company_id_user_id_idx" ON "ai_conversations" ("company_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bank_accounts_account_id_idx" ON "bank_accounts" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_created_by_idx" ON "documents" ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_manufacturer_id_idx" ON "products" ("manufacturer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_product_group_id_idx" ON "products" ("product_group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serial_numbers_warehouse_id_idx" ON "serial_numbers" ("warehouse_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serial_numbers_sold_to_contact_id_idx" ON "serial_numbers" ("sold_to_contact_id");