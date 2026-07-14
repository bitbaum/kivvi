ALTER TABLE "bank_transactions" ADD COLUMN "entry_reference" text;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "value_date" timestamp;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "debtor_name" text;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "creditor_name" text;--> statement-breakpoint
ALTER TABLE "bank_transactions" ADD COLUMN "remittance_info" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bank_transactions_entry_ref_unique" ON "bank_transactions" ("bank_account_id","entry_reference") WHERE entry_reference IS NOT NULL;