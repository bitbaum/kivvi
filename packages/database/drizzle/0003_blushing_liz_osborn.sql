DROP INDEX IF EXISTS "accounts_code_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "products_company_id_idx";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_company_id_code_idx" ON "accounts" ("company_id","code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_messages_conversation_id_idx" ON "ai_messages" ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bank_transactions_date_idx" ON "bank_transactions" ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contact_addresses_contact_id_idx" ON "contact_addresses" ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_items_document_id_idx" ON "document_items" ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_payments_document_id_idx" ON "document_payments" ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "documents_company_id_type_number_idx" ON "documents" ("company_id","type","number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_project_id_idx" ON "documents" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_converted_from_id_idx" ON "documents" ("converted_from_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fiscal_periods_fiscal_year_id_idx" ON "fiscal_periods" ("fiscal_year_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fiscal_years_company_id_idx" ON "fiscal_years" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journal_entries_company_id_idx" ON "journal_entries" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journal_entries_date_idx" ON "journal_entries" ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journal_lines_journal_entry_id_idx" ON "journal_lines" ("journal_entry_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journal_lines_account_id_idx" ON "journal_lines" ("account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "manufacturers_company_id_idx" ON "manufacturers" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_lists_company_id_idx" ON "price_lists" ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "price_rules_price_list_id_idx" ON "price_rules" ("price_list_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_groups_company_id_idx" ON "product_groups" ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "products_company_id_article_number_idx" ON "products" ("company_id","article_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_company_active_idx" ON "products" ("company_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_company_id_idx" ON "projects" ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "serial_numbers_product_id_serial_number_idx" ON "serial_numbers" ("product_id","serial_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "serial_numbers_product_id_idx" ON "serial_numbers" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_movements_warehouse_product_idx" ON "stock_movements" ("warehouse_id","product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "warehouses_company_id_idx" ON "warehouses" ("company_id");