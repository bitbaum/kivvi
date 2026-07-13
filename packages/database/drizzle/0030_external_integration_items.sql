CREATE TABLE IF NOT EXISTS "external_integration_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "source" text NOT NULL,
  "external_id" text NOT NULL,
  "kind" text NOT NULL,
  "status" text DEFAULT 'new' NOT NULL,
  "title" text NOT NULL,
  "summary" text,
  "from_name" text,
  "from_email" text,
  "occurred_at" timestamp,
  "url" text,
  "raw" jsonb DEFAULT '{}'::jsonb,
  "contact_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "external_integration_items"
    ADD CONSTRAINT "external_integration_items_company_id_companies_id_fk"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "external_integration_items"
    ADD CONSTRAINT "external_integration_items_contact_id_contacts_id_fk"
    FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE set null;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "external_integration_items_company_source_external_idx"
  ON "external_integration_items" ("company_id", "source", "external_id");
CREATE INDEX IF NOT EXISTS "external_integration_items_company_status_idx"
  ON "external_integration_items" ("company_id", "status");
CREATE INDEX IF NOT EXISTS "external_integration_items_contact_id_idx"
  ON "external_integration_items" ("contact_id");
