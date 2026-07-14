CREATE TABLE IF NOT EXISTS "api_idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"key" text NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"status" text NOT NULL,
	"response_status" integer,
	"response_body" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "api_idempotency_keys_company_key_idx" ON "api_idempotency_keys" ("company_id","key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_idempotency_keys_expires_at_idx" ON "api_idempotency_keys" ("expires_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_idempotency_keys" ADD CONSTRAINT "api_idempotency_keys_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
