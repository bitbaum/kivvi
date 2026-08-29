import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  bigint,
  decimal,
  boolean,
  jsonb,
  pgEnum,
  date,
  uniqueIndex,
  unique,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  CONTACT_TYPE_VALUES,
  DOCUMENT_TYPE_VALUES,
  DOCUMENT_STATUS_VALUES,
  ACCOUNT_TYPE_VALUES,
  COST_CENTER_KIND_VALUES,
  FUND_RESTRICTION_VALUES,
  STOCK_MOVEMENT_TYPE_VALUES,
  PRICE_RULE_TYPE_VALUES,
  RECURRING_PERIODICITY_VALUES,
  INTAKE_SOURCE_VALUES,
  ITEM_CONDITION_VALUES,
  ITEM_STATUS_VALUES,
  WEBHOOK_EVENT_VALUES,
  MEMBERSHIP_ROLE_VALUES,
  AVAILABILITY_TYPE_VALUES,
  VACANCY_TYPE_VALUES,
  LOCATION_MODE_VALUES,
  VACANCY_STATUS_VALUES,
  JOIN_REQUEST_STATUS_VALUES,
  SUBSIDY_CLAIM_STATUS_VALUES,
  type AiProviderValue,
  type WebhookEvent,
} from "./enums";

// Re-export enums for consumer convenience (client-safe, no DB deps)
export * from "./enums";

// ============================================================================
// ENUMS
// ============================================================================

export const contactTypeEnum = pgEnum("contact_type", [...CONTACT_TYPE_VALUES]);

export const documentTypeEnum = pgEnum("document_type", [...DOCUMENT_TYPE_VALUES]);

export const documentStatusEnum = pgEnum("document_status", [...DOCUMENT_STATUS_VALUES]);

export const accountTypeEnum = pgEnum("account_type", [...ACCOUNT_TYPE_VALUES]);
export const fundRestrictionEnum = pgEnum("fund_restriction", [...FUND_RESTRICTION_VALUES]);
export const costCenterKindEnum = pgEnum("cost_center_kind", [...COST_CENTER_KIND_VALUES]);
export const subsidyClaimStatusEnum = pgEnum("subsidy_claim_status", [
  ...SUBSIDY_CLAIM_STATUS_VALUES,
]);

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [...STOCK_MOVEMENT_TYPE_VALUES]);

export const priceRuleTypeEnum = pgEnum("price_rule_type", [...PRICE_RULE_TYPE_VALUES]);

export const recurringPeriodicityEnum = pgEnum("recurring_periodicity", [
  ...RECURRING_PERIODICITY_VALUES,
]);

export const intakeSourceEnum = pgEnum("intake_source", [...INTAKE_SOURCE_VALUES]);

export const itemConditionEnum = pgEnum("item_condition", [...ITEM_CONDITION_VALUES]);

export const itemStatusEnum = pgEnum("item_status", [...ITEM_STATUS_VALUES]);

export const membershipRoleEnum = pgEnum("membership_role", [...MEMBERSHIP_ROLE_VALUES]);

export const availabilityTypeEnum = pgEnum("availability_type", [...AVAILABILITY_TYPE_VALUES]);

export const vacancyTypeEnum = pgEnum("vacancy_type", [...VACANCY_TYPE_VALUES]);

export const locationModeEnum = pgEnum("location_mode", [...LOCATION_MODE_VALUES]);

export const vacancyStatusEnum = pgEnum("vacancy_status", [...VACANCY_STATUS_VALUES]);

export const joinRequestStatusEnum = pgEnum("join_request_status", [...JOIN_REQUEST_STATUS_VALUES]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
  "revoked",
]);

// ============================================================================
// AUTH & COMPANIES
// ============================================================================

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  legalName: text("legal_name"),
  vatNumber: text("vat_number"),
  address: text("address"),
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country").default("CH"),
  currency: text("currency").default("CHF"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  settings: jsonb("settings").default({}).$type<CompanySettings>(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  avatarBase64: text("avatar_base64"),
  location: text("location"),
  languages: text("languages")
    .array()
    .default(sql`ARRAY[]::text[]`)
    .notNull(),
  skills: text("skills")
    .array()
    .default(sql`ARRAY[]::text[]`)
    .notNull(),
  availabilityType: availabilityTypeEnum("availability_type"),
  companyId: uuid("company_id").references(() => companies.id),
  role: text("role").default("member"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: index("password_reset_tokens_token_idx").on(table.token),
    userIdIdx: index("password_reset_tokens_user_id_idx").on(table.userId),
  }),
);

// ============================================================================
// MEMBERSHIPS & INVITATIONS
// ============================================================================

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    role: membershipRoleEnum("role").default("member").notNull(),
    permissionPreset: text("permission_preset").default("sales").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueMembership: unique().on(table.userId, table.companyId),
    userIdx: index("memberships_user_id_idx").on(table.userId),
    companyIdx: index("memberships_company_id_idx").on(table.companyId),
  }),
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    email: text("email").notNull(),
    role: membershipRoleEnum("role").default("member").notNull(),
    permissionPreset: text("permission_preset").default("sales").notNull(),
    status: invitationStatusEnum("status").default("pending").notNull(),
    invitedBy: uuid("invited_by")
      .references(() => users.id)
      .notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: index("invitations_token_idx").on(table.token),
    emailCompanyIdx: index("invitations_email_company_idx").on(table.email, table.companyId),
  }),
);

// ============================================================================
// PUBLIC ORGANIZATION & PARTICIPATION
// ============================================================================

export const organizationProfiles = pgTable(
  "organization_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    publicSlug: text("public_slug").notNull().unique(),
    publicName: text("public_name").notNull(),
    shortDescription: text("short_description"),
    category: text("category"),
    location: text("location"),
    website: text("website"),
    logoBase64: text("logo_base64"),
    isPublic: boolean("is_public").default(false).notNull(),
    acceptingApplications: boolean("accepting_applications").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index("organization_profiles_company_id_idx").on(table.companyId),
    publicSlugIdx: index("organization_profiles_public_slug_idx").on(table.publicSlug),
    publicIdx: index("organization_profiles_is_public_idx").on(table.isPublic),
  }),
);

export const vacancies = pgTable(
  "vacancies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    type: vacancyTypeEnum("type").notNull(),
    locationMode: locationModeEnum("location_mode").notNull(),
    workload: text("workload"),
    skills: text("skills")
      .array()
      .default(sql`ARRAY[]::text[]`)
      .notNull(),
    status: vacancyStatusEnum("status").default("draft").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    companyIdx: index("vacancies_company_id_idx").on(table.companyId),
    statusIdx: index("vacancies_status_idx").on(table.status),
  }),
);

export const joinRequests = pgTable(
  "join_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    vacancyId: uuid("vacancy_id").references(() => vacancies.id, {
      onDelete: "set null",
    }),
    message: text("message"),
    status: joinRequestStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("join_requests_user_id_idx").on(table.userId),
    companyIdx: index("join_requests_company_id_idx").on(table.companyId),
    statusIdx: index("join_requests_status_idx").on(table.status),
  }),
);

// ============================================================================
// EXTERNAL INTEGRATION INBOX (MAIL + FILES)
// ============================================================================

export const externalIntegrationItems = pgTable(
  "external_integration_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    source: text("source").notNull().$type<"mail" | "nextcloud">(),
    externalId: text("external_id").notNull(),
    kind: text("kind").notNull().$type<"email" | "file">(),
    status: text("status")
      .notNull()
      .$type<"new" | "reviewed" | "converted" | "ignored">()
      .default("new"),
    title: text("title").notNull(),
    summary: text("summary"),
    fromName: text("from_name"),
    fromEmail: text("from_email"),
    occurredAt: timestamp("occurred_at"),
    url: text("url"),
    raw: jsonb("raw").default({}).$type<Record<string, unknown>>(),
    contactId: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    companySourceExternalIdx: uniqueIndex(
      "external_integration_items_company_source_external_idx",
    ).on(table.companyId, table.source, table.externalId),
    companyStatusIdx: index("external_integration_items_company_status_idx").on(
      table.companyId,
      table.status,
    ),
    contactIdx: index("external_integration_items_contact_id_idx").on(table.contactId),
  }),
);

// ============================================================================
// API TOKENS
// ============================================================================

export const apiTokens = pgTable(
  "api_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    tokenPrefix: text("token_prefix").notNull(), // First 8 chars for display: "kv_abc1..."
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tokenHashIdx: index("api_tokens_token_hash_idx").on(table.tokenHash),
    companyIdIdx: index("api_tokens_company_id_idx").on(table.companyId),
  }),
);

// ============================================================================
// CONTACTS (CUSTOMERS & VENDORS)
// ============================================================================

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    type: contactTypeEnum("type").notNull(),
    contactNumber: text("contact_number"), // Auto-generated, e.g. K-00001
    // Name fields
    name: text("name").notNull(), // Company/display name
    firstName: text("first_name"),
    lastName: text("last_name"),
    // Contact info
    email: text("email"),
    phone: text("phone"),
    mobile: text("mobile"),
    website: text("website"),
    // Primary address
    address: text("address"),
    city: text("city"),
    postalCode: text("postal_code"),
    country: text("country").default("CH"),
    // Financial
    vatNumber: text("vat_number"),
    iban: text("iban"),
    bic: text("bic"),
    paymentTermsDays: integer("payment_terms_days").default(30),
    creditLimit: decimal("credit_limit", { precision: 12, scale: 2 }),
    // Settings
    language: text("language").default("de"),
    notes: text("notes"),
    isActive: boolean("is_active").default(true),
    // Mahnsperre — exclude this contact from the dunning run (invoices still
    // count as overdue; they just don't generate reminders).
    dunningBlock: boolean("dunning_block").default(false),
    // Migration
    kivitendoId: integer("kivitendo_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueContactNumberPerCompany: uniqueIndex("unique_contact_number_per_company").on(
      table.companyId,
      table.contactNumber,
    ),
    companyIdIdx: index("contacts_company_id_idx").on(table.companyId),
    emailIdx: index("contacts_email_idx").on(table.email),
  }),
);

export const contactAddresses = pgTable(
  "contact_addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id")
      .references(() => contacts.id, { onDelete: "cascade" })
      .notNull(),
    type: text("type").notNull().$type<"billing" | "shipping" | "other">(),
    name: text("name"),
    address: text("address"),
    city: text("city"),
    postalCode: text("postal_code"),
    country: text("country").default("CH"),
    isDefault: boolean("is_default").default(false),
  },
  (table) => ({
    contactIdIdx: index("contact_addresses_contact_id_idx").on(table.contactId),
  }),
);

// ============================================================================
// PRODUCTS & SERVICES
// ============================================================================

export const manufacturers = pgTable(
  "manufacturers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    name: text("name").notNull(),
    website: text("website"),
  },
  (table) => ({
    companyIdIdx: index("manufacturers_company_id_idx").on(table.companyId),
  }),
);

export const productGroups = pgTable(
  "product_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    name: text("name").notNull(),
    parentId: uuid("parent_id"), // Self-referencing for hierarchy
    // Default posting group for all products in this group (revenue routing, 1.1).
    defaultPostingGroupId: uuid("default_posting_group_id").references(
      (): AnyPgColumn => postingGroups.id,
    ),
  },
  (table) => ({
    companyIdIdx: index("product_groups_company_id_idx").on(table.companyId),
  }),
);

/**
 * Posting group (Kivitendo "Buchungsgruppe") — a named bundle of GL accounts
 * assigned to an article/line that decides which Erlöskonto a sale credits (and
 * later which Aufwandskonto a purchase debits). Replaces the hardcoded
 * product/service → 3000/3200 split. See POSTING_GROUP_REVENUE_ROUTING_SPEC.md.
 */
export const postingGroups = pgTable(
  "posting_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    name: text("name").notNull(), // "Reparaturen", "Warenverkauf", "Spenden"
    revenueAccountId: uuid("revenue_account_id")
      .references(() => accounts.id)
      .notNull(), // Erlöskonto Inland (the sale credit)
    expenseAccountId: uuid("expense_account_id").references(() => accounts.id), // Aufwandskonto (purchase debit — follow-on)
    inventoryAccountId: uuid("inventory_account_id").references(() => accounts.id),
    isDefault: boolean("is_default").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    companyIdIdx: index("posting_groups_company_id_idx").on(table.companyId),
    uniqueNamePerCompany: uniqueIndex("posting_groups_company_name_idx").on(
      table.companyId,
      table.name,
    ),
  }),
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    articleNumber: text("article_number"), // Auto-generated, e.g. ART-00001
    sku: text("sku"),
    ean: text("ean"), // Barcode
    name: text("name").notNull(),
    description: text("description"),
    type: text("type").notNull().$type<"product" | "service">(),
    // Categorization
    manufacturerId: uuid("manufacturer_id").references(() => manufacturers.id),
    productGroupId: uuid("product_group_id").references(() => productGroups.id),
    // Revenue routing (1.1): overrides productGroup default; else company default.
    postingGroupId: uuid("posting_group_id").references((): AnyPgColumn => postingGroups.id),
    // Pricing
    unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
    purchasePrice: decimal("purchase_price", { precision: 12, scale: 2 }),
    currency: text("currency").default("CHF"),
    // Default VAT rate (matches DEFAULT_VAT_RATE from @kivvi/core/src/config/vat-rates.ts)
    vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default("8.1"),
    unit: text("unit").default("piece"),
    // Dimensions & weight
    weight: decimal("weight", { precision: 10, scale: 3 }), // kg
    width: decimal("width", { precision: 10, scale: 2 }), // cm
    height: decimal("height", { precision: 10, scale: 2 }), // cm
    depth: decimal("depth", { precision: 10, scale: 2 }), // cm
    // Stock
    minStock: integer("min_stock"), // Reorder point
    stockQuantity: decimal("stock_quantity", {
      precision: 12,
      scale: 4,
    }).default("0"), // Cached total
    serialNumberTracking: boolean("serial_number_tracking").default(false),
    // Flexible pricing (Richtpreis model for secondhand)
    isPriceFlexible: boolean("is_price_flexible").default(false),
    minPrice: decimal("min_price", { precision: 12, scale: 2 }),
    maxPrice: decimal("max_price", { precision: 12, scale: 2 }),
    // Flags
    isActive: boolean("is_active").default(true),
    shopVisible: boolean("shop_visible").default(false),
    // Migration
    kivitendoId: integer("kivitendo_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueArticleNumberPerCompany: uniqueIndex("products_company_id_article_number_idx").on(
      table.companyId,
      table.articleNumber,
    ),
    companyActiveIdx: index("products_company_active_idx").on(table.companyId, table.isActive),
    manufacturerIdIdx: index("products_manufacturer_id_idx").on(table.manufacturerId),
    productGroupIdIdx: index("products_product_group_id_idx").on(table.productGroupId),
  }),
);

// ============================================================================
// UNIFIED DOCUMENTS (quotes, orders, invoices, credit notes, etc.)
// ============================================================================

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    contactId: uuid("contact_id").references(() => contacts.id),
    projectId: uuid("project_id").references(() => projects.id),
    // Analytical dimension — the activity/fund this document's postings belong to;
    // auto-propagated to its journal lines when accounting entries are created.
    costCenterId: uuid("cost_center_id").references(() => costCenters.id),
    // Type & status
    type: documentTypeEnum("type").notNull(),
    status: documentStatusEnum("status").default("draft").notNull(),
    number: text("number").notNull(),
    // Dates
    issueDate: timestamp("issue_date").defaultNow().notNull(),
    dueDate: timestamp("due_date"),
    deliveryDate: timestamp("delivery_date"),
    paidDate: timestamp("paid_date"),
    // Financial
    currency: text("currency").default("CHF").notNull(),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
    vatAmount: decimal("vat_amount", { precision: 12, scale: 2 }).default("0").notNull(),
    total: decimal("total", { precision: 12, scale: 2 }).default("0").notNull(),
    // Content
    notes: text("notes"),
    internalNotes: text("internal_notes"),
    // Swiss QR-bill
    qrReference: text("qr_reference"),
    // Document conversion chain
    convertedFromId: uuid("converted_from_id"),
    // Intake-specific fields (for type='intake')
    intakeSource: intakeSourceEnum("intake_source"),
    donorId: uuid("donor_id").references(() => contacts.id),
    consignmentRate: decimal("consignment_rate", { precision: 5, scale: 2 }),
    // Repair-specific fields (for type='repair_order'). The device is the
    // customer's property held in bailment — never inventory (spec §5.1), so
    // these are descriptive snapshots + the advance liability, not stock.
    deviceInfo: text("device_info"), // brand/model snapshot shown on the invoice
    faultDescription: text("fault_description"), // customer's reported fault
    advanceAmount: decimal("advance_amount", { precision: 12, scale: 2 }), // deposit booked to 2030
    externalJobRef: text("external_job_ref"), // revamp-it appointment id (also in source key)
    // Email tracking
    lastEmailedAt: timestamp("last_emailed_at"),
    lastEmailedTo: text("last_emailed_to"),
    // Cutover: an open item carried forward from a prior system as a balance.
    // Its AR/AP is already in the opening-balance entry, so it must NOT generate
    // its own journal entry (avoids double-counting 1100/2000).
    isCarriedForward: boolean("is_carried_forward").default(false),
    // Tracking
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    numberPerCompanyType: index("documents_company_id_type_number_idx").on(
      table.companyId,
      table.type,
      table.number,
    ),
    companyIdIdx: index("documents_company_id_idx").on(table.companyId),
    companyStatusIdx: index("documents_company_id_status_idx").on(table.companyId, table.status),
    companyTypeIdx: index("documents_company_id_type_idx").on(table.companyId, table.type),
    contactIdIdx: index("documents_contact_id_idx").on(table.contactId),
    issueDateIdx: index("documents_issue_date_idx").on(table.issueDate),
    projectIdIdx: index("documents_project_id_idx").on(table.projectId),
    convertedFromIdIdx: index("documents_converted_from_id_idx").on(table.convertedFromId),
    createdByIdx: index("documents_created_by_idx").on(table.createdBy),
  }),
);

export const documentItems = pgTable(
  "document_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .references(() => documents.id, { onDelete: "cascade" })
      .notNull(),
    productId: uuid("product_id").references(() => products.id),
    inventoryItemId: uuid("inventory_item_id").references(() => inventoryItems.id),
    // Revenue-routing override for this line (e.g. a freeform line with no
    // product, or a per-line override); resolved before product/group defaults.
    postingGroupId: uuid("posting_group_id").references((): AnyPgColumn => postingGroups.id),
    position: integer("position").default(0),
    description: text("description").notNull(),
    quantity: decimal("quantity", { precision: 12, scale: 4 }).notNull(),
    unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
    discount: decimal("discount", { precision: 5, scale: 2 }).default("0"), // Percentage
    // Default VAT rate (matches DEFAULT_VAT_RATE from @kivvi/core/src/config/vat-rates.ts)
    vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default("8.1"),
    total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  },
  (table) => ({
    documentIdIdx: index("document_items_document_id_idx").on(table.documentId),
  }),
);

export const documentPayments = pgTable(
  "document_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .references(() => documents.id, { onDelete: "cascade" })
      .notNull(),
    bankTransactionId: uuid("bank_transaction_id").references(() => bankTransactions.id),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    date: timestamp("date").notNull(),
    method: text("method").$type<"bank_transfer" | "cash" | "card" | "other">(),
    reference: text("reference"),
  },
  (table) => ({
    documentIdIdx: index("document_payments_document_id_idx").on(table.documentId),
  }),
);

export const talerOrders = pgTable(
  "taler_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    documentId: uuid("document_id")
      .references(() => documents.id, { onDelete: "cascade" })
      .notNull(),
    orderId: text("order_id").notNull(),
    status: text("status")
      .$type<"unpaid" | "claimed" | "paid" | "refunded" | "failed">()
      .default("unpaid")
      .notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").default("CHF").notNull(),
    talerPayUri: text("taler_pay_uri"),
    orderStatusUrl: text("order_status_url"),
    payDeadline: timestamp("pay_deadline"),
    paidAt: timestamp("paid_at"),
    lastCheckedAt: timestamp("last_checked_at"),
    lastError: text("last_error"),
    raw: jsonb("raw").default({}).$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    documentIdIdx: index("taler_orders_document_id_idx").on(table.documentId),
    companyStatusIdx: index("taler_orders_company_status_idx").on(table.companyId, table.status),
    companyOrderUnique: uniqueIndex("taler_orders_company_order_id_idx").on(
      table.companyId,
      table.orderId,
    ),
    oneActivePerDocument: uniqueIndex("taler_orders_document_unpaid_claimed_idx")
      .on(table.documentId)
      .where(sql`${table.status} IN ('unpaid', 'claimed')`),
  }),
);

// ============================================================================
// NUMBER SEQUENCES
// ============================================================================

export const numberSequences = pgTable(
  "number_sequences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    type: text("type").notNull(), // 'invoice', 'quote', 'contact', 'product', etc.
    prefix: text("prefix").notNull(), // 'RE', 'AN', 'K', 'ART'
    nextNumber: integer("next_number").default(1).notNull(),
    format: text("format").default("{prefix}-{year}-{number:5}").notNull(), // Pattern
  },
  (table) => ({
    uniqueTypePerCompany: uniqueIndex("unique_type_per_company").on(table.companyId, table.type),
  }),
);

// ============================================================================
// ACCOUNTING
// ============================================================================

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    code: text("code").notNull(), // e.g., "1000", "3000"
    name: text("name").notNull(),
    type: accountTypeEnum("type").notNull(),
    parentId: uuid("parent_id"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueCodePerCompany: uniqueIndex("accounts_company_id_code_idx").on(
      table.companyId,
      table.code,
    ),
    companyIdIdx: index("accounts_company_id_idx").on(table.companyId),
  }),
);

// Analytical dimension: tag bookings by operating activity or restricted fund.
// The SSOT that per-activity P&L and fund reporting derive from. Adding one = one row.
export const costCenters = pgTable(
  "cost_centers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    code: text("code").notNull(), // short slug, e.g. "REFURB", "GRANT-KANTON-2026"
    name: text("name").notNull(),
    kind: costCenterKindEnum("kind").default("activity").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueCodePerCompany: uniqueIndex("cost_centers_company_id_code_idx").on(
      table.companyId,
      table.code,
    ),
    companyIdIdx: index("cost_centers_company_id_idx").on(table.companyId),
  }),
);

/**
 * FER-21 fund — a restricted capital pot, ORTHOGONAL to cost centers (a grant
 * fund can finance a repair activity). The restrictionType decides the
 * balance-sheet block: extern → Fondskapital, else → Organisationskapital.
 * See FER21_FUND_ACCOUNTING_SPEC.md.
 */
export const funds = pgTable(
  "funds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    code: text("code").notNull(), // "GRANT-ZH-REPAIR-2026"
    name: text("name").notNull(),
    restrictionType: fundRestrictionEnum("restriction_type")
      .default("extern_zweckgebunden")
      .notNull(),
    purpose: text("purpose"), // donor's stipulated purpose (audit + Anhang)
    restrictedBy: text("restricted_by"), // third party (extern) / 'Vorstand' (intern)
    capitalAccountId: uuid("capital_account_id").references(() => accounts.id),
    openingBalance: decimal("opening_balance", { precision: 12, scale: 2 }).default("0").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueCodePerCompany: uniqueIndex("funds_company_id_code_idx").on(table.companyId, table.code),
    companyIdIdx: index("funds_company_id_idx").on(table.companyId),
  }),
);

/**
 * Third-party subsidy claims (e.g. Reparaturbonus Stadt Zürich). An extension
 * detail of `documents` keyed by documentId — the same relationship
 * documentItems/documentPayments already have (unified document model: no
 * per-type document table). A subsidy splits WHO pays a repair: the customer's
 * reduced share stays on the invoice; the `appliedAmount` becomes a receivable
 * from the settling party (ERZ), cleared out-of-band at the monthly Abrechnung.
 * Whether it is taxable turnover or a non-taxable Subvention is a per-program
 * config policy (subsidy-programs.ts) — the row structure is identical either
 * way (spec §5.3).
 */
export const subsidyClaims = pgTable(
  "subsidy_claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    documentId: uuid("document_id")
      .references(() => documents.id)
      .notNull(),
    programKey: text("program_key").notNull(), // FK to SUBSIDY_PROGRAMS config
    code: text("code"), // the bonus code presented by the customer
    faceAmount: decimal("face_amount", { precision: 12, scale: 2 }).notNull(),
    appliedAmount: decimal("applied_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    status: subsidyClaimStatusEnum("status").default("applied").notNull(),
    settlementParty: text("settlement_party"), // 'ERZ Stadt Zürich'
    receivableAccountId: uuid("receivable_account_id").references(() => accounts.id),
    settledAt: timestamp("settled_at"),
    externalRef: text("external_ref"), // ERZ settlement batch ref
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    companyIdIdx: index("subsidy_claims_company_id_idx").on(table.companyId),
    documentIdIdx: index("subsidy_claims_document_id_idx").on(table.documentId),
    companyStatusIdx: index("subsidy_claims_company_status_idx").on(table.companyId, table.status),
  }),
);

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    date: timestamp("date").notNull(),
    reference: text("reference"),
    description: text("description"),
    sourceType: text("source_type"), // 'invoice', 'payment', 'manual', 'opening_balance', 'reversal'
    sourceId: uuid("source_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    // --- GeBüV immutability (A1) ---
    // postedAt NULL = draft (editable/deletable); set once = posted (immutable,
    // Storno-only). sequenceNo is the per-company gap-free posting order;
    // entryHash chains to prevHash for tamper-evidence (see verifyLedgerIntegrity).
    postedAt: timestamp("posted_at"),
    sequenceNo: bigint("sequence_no", { mode: "number" }),
    entryHash: text("entry_hash"),
    prevHash: text("prev_hash"),
    // Reversal (Storno) links — a posted entry is undone only by a counter-entry.
    reversesEntryId: uuid("reverses_entry_id").references((): AnyPgColumn => journalEntries.id),
    reversedByEntryId: uuid("reversed_by_entry_id").references(
      (): AnyPgColumn => journalEntries.id,
    ),
  },
  (table) => ({
    companyIdIdx: index("journal_entries_company_id_idx").on(table.companyId),
    dateIdx: index("journal_entries_date_idx").on(table.date),
    companySeqIdx: uniqueIndex("journal_entries_company_seq_idx").on(
      table.companyId,
      table.sequenceNo,
    ),
  }),
);

/**
 * Per-company ledger head pointer — the serialization point + O(1) chain head
 * for the immutable ledger (A1). Posting a journal entry locks this row
 * (SELECT … FOR UPDATE), so concurrent posts get sequential sequenceNo and a
 * correct prevHash. One row per company.
 */
export const ledgerHeads = pgTable("ledger_heads", {
  companyId: uuid("company_id")
    .primaryKey()
    .references(() => companies.id, { onDelete: "cascade" }),
  lastSequenceNo: bigint("last_sequence_no", { mode: "number" }).default(0).notNull(),
  lastHash: text("last_hash"), // NULL = genesis (no posted entry yet)
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Append-only audit trail (A1). Records every ledger-affecting action
 * (post/reverse/status change/period close). No code path updates or deletes it.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id), // NULL = system/cron
    action: text("action").notNull(), // 'journal.posted' | 'journal.reversed' | 'period.closed' | …
    entityType: text("entity_type").notNull(), // 'journal_entry' | 'document' | 'fiscal_period'
    entityId: uuid("entity_id"),
    at: timestamp("at").defaultNow().notNull(),
    detail: jsonb("detail"),
  },
  (table) => ({
    companyAtIdx: index("audit_log_company_at_idx").on(table.companyId, table.at),
    entityIdx: index("audit_log_entity_idx").on(table.entityType, table.entityId),
  }),
);

export const journalLines = pgTable(
  "journal_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    journalEntryId: uuid("journal_entry_id")
      .references(() => journalEntries.id, { onDelete: "cascade" })
      .notNull(),
    accountId: uuid("account_id")
      .references(() => accounts.id)
      .notNull(),
    // Analytical dimension — which activity/fund this posting belongs to.
    costCenterId: uuid("cost_center_id").references(() => costCenters.id),
    // FER-21 fund dimension (orthogonal to costCenterId) — which restricted fund
    // this posting moves. NULL for non-fund postings.
    fundId: uuid("fund_id").references(() => funds.id),
    debit: decimal("debit", { precision: 12, scale: 2 }),
    credit: decimal("credit", { precision: 12, scale: 2 }),
    description: text("description"),
  },
  (table) => ({
    journalEntryIdIdx: index("journal_lines_journal_entry_id_idx").on(table.journalEntryId),
    accountIdIdx: index("journal_lines_account_id_idx").on(table.accountId),
    costCenterIdIdx: index("journal_lines_cost_center_id_idx").on(table.costCenterId),
  }),
);

// ============================================================================
// FISCAL YEARS & PERIODS
// ============================================================================

export const fiscalYears = pgTable(
  "fiscal_years",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    name: text("name").notNull(), // e.g., "2026"
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    isClosed: boolean("is_closed").default(false),
  },
  (table) => ({
    companyIdIdx: index("fiscal_years_company_id_idx").on(table.companyId),
  }),
);

export const fiscalPeriods = pgTable(
  "fiscal_periods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fiscalYearId: uuid("fiscal_year_id")
      .references(() => fiscalYears.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(), // e.g., "January 2026"
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    isClosed: boolean("is_closed").default(false),
  },
  (table) => ({
    fiscalYearIdIdx: index("fiscal_periods_fiscal_year_id_idx").on(table.fiscalYearId),
  }),
);

// ============================================================================
// BANKING
// ============================================================================

export const bankAccounts = pgTable(
  "bank_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    accountId: uuid("account_id").references(() => accounts.id),
    name: text("name").notNull(),
    iban: text("iban"),
    bankName: text("bank_name"),
    currency: text("currency").default("CHF"),
    balance: decimal("balance", { precision: 12, scale: 2 }).default("0"),
    lastSyncAt: timestamp("last_sync_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    companyIdIdx: index("bank_accounts_company_id_idx").on(table.companyId),
    accountIdIdx: index("bank_accounts_account_id_idx").on(table.accountId),
  }),
);

export const bankTransactions = pgTable(
  "bank_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bankAccountId: uuid("bank_account_id")
      .references(() => bankAccounts.id)
      .notNull(),
    date: timestamp("date").notNull(),
    description: text("description"),
    reference: text("reference"),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    balance: decimal("balance", { precision: 12, scale: 2 }),
    isReconciled: boolean("is_reconciled").default(false),
    reconciledDocumentId: uuid("reconciled_document_id").references(() => documents.id),
    reconciledAt: timestamp("reconciled_at"),
    // CAMT.053/054 fields
    entryReference: text("entry_reference"),
    valueDate: timestamp("value_date"),
    debtorName: text("debtor_name"),
    creditorName: text("creditor_name"),
    remittanceInfo: text("remittance_info"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    bankAccountIdIdx: index("bank_transactions_bank_account_id_idx").on(table.bankAccountId),
    bankAccountReconciledIdx: index("bank_transactions_bank_account_id_is_reconciled_idx").on(
      table.bankAccountId,
      table.isReconciled,
    ),
    dateIdx: index("bank_transactions_date_idx").on(table.date),
    entryRefUniqueIdx: uniqueIndex("bank_transactions_entry_ref_unique")
      .on(table.bankAccountId, table.entryReference)
      .where(sql`entry_reference IS NOT NULL`),
  }),
);

// ============================================================================
// INVENTORY
// ============================================================================

export const warehouses = pgTable(
  "warehouses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    name: text("name").notNull(),
    address: text("address"),
    isDefault: boolean("is_default").default(false),
  },
  (table) => ({
    companyIdIdx: index("warehouses_company_id_idx").on(table.companyId),
  }),
);

export const stockLevels = pgTable(
  "stock_levels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .references(() => products.id, { onDelete: "cascade" })
      .notNull(),
    warehouseId: uuid("warehouse_id")
      .references(() => warehouses.id, { onDelete: "cascade" })
      .notNull(),
    quantity: decimal("quantity", { precision: 12, scale: 4 }).default("0").notNull(),
    reservedQuantity: decimal("reserved_quantity", { precision: 12, scale: 4 })
      .default("0")
      .notNull(),
  },
  (table) => ({
    uniqueProductWarehouse: uniqueIndex("unique_product_warehouse").on(
      table.productId,
      table.warehouseId,
    ),
  }),
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),
    warehouseId: uuid("warehouse_id")
      .references(() => warehouses.id)
      .notNull(),
    type: stockMovementTypeEnum("type").notNull(),
    quantity: decimal("quantity", { precision: 12, scale: 4 }).notNull(), // Positive for in, negative for out
    reference: text("reference"),
    documentId: uuid("document_id").references(() => documents.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    warehouseProductIdx: index("stock_movements_warehouse_product_idx").on(
      table.warehouseId,
      table.productId,
    ),
  }),
);

export const serialNumbers = pgTable(
  "serial_numbers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .references(() => products.id)
      .notNull(),
    serialNumber: text("serial_number").notNull(),
    status: text("status")
      .default("available")
      .$type<"available" | "sold" | "reserved" | "defective">(),
    warehouseId: uuid("warehouse_id").references(() => warehouses.id),
    soldToContactId: uuid("sold_to_contact_id").references(() => contacts.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueSerialPerProduct: uniqueIndex("serial_numbers_product_id_serial_number_idx").on(
      table.productId,
      table.serialNumber,
    ),
    productIdIdx: index("serial_numbers_product_id_idx").on(table.productId),
    warehouseIdIdx: index("serial_numbers_warehouse_id_idx").on(table.warehouseId),
    soldToContactIdIdx: index("serial_numbers_sold_to_contact_id_idx").on(table.soldToContactId),
  }),
);

// ============================================================================
// INVENTORY ITEMS (individually tracked secondhand items)
// ============================================================================

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    // Link to product catalog (optional — unique items may not have a catalog entry)
    productId: uuid("product_id").references(() => products.id),
    warehouseId: uuid("warehouse_id").references(() => warehouses.id),
    // Item identity
    itemNumber: text("item_number").notNull(), // Auto-generated: IT-00001
    description: text("description").notNull(),
    // Condition & lifecycle
    condition: itemConditionEnum("condition").default("untested").notNull(),
    status: itemStatusEnum("status").default("intake").notNull(),
    // Provenance
    intakeDocumentId: uuid("intake_document_id").references(() => documents.id),
    saleDocumentId: uuid("sale_document_id").references(() => documents.id),
    donorContactId: uuid("donor_contact_id").references(() => contacts.id),
    // Pricing
    estimatedValue: decimal("estimated_value", { precision: 12, scale: 2 }),
    askingPrice: decimal("asking_price", { precision: 12, scale: 2 }),
    minPrice: decimal("min_price", { precision: 12, scale: 2 }),
    soldPrice: decimal("sold_price", { precision: 12, scale: 2 }),
    // Consignment: percentage of sale price owed to the owner (e.g. 60.00 for 60%)
    consignmentRate: decimal("consignment_rate", { precision: 5, scale: 2 }),
    // Category — drives checklist template (e.g. "laptop", "bike", "clothing")
    category: text("category"),
    // Assignment (for repair queue)
    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id),
    // Repair tracking (accumulates across multiple repairs)
    repairCost: decimal("repair_cost", { precision: 12, scale: 2 }),
    repairHours: decimal("repair_hours", { precision: 5, scale: 2 }),
    repairLog: text("repair_log"),
    // Checklist completions (JSONB — ChecklistData type, see checklist-templates.ts)
    checklistData: jsonb("checklist_data"),
    // Data erasure record (separate fields for certificate generation)
    dataErasureMethod: text("data_erasure_method"), // "secure_erase" | "dban" | "manual" | "certified" | null
    dataErasuredAt: timestamp("data_erased_at"),
    dataErasuredByUserId: uuid("data_erased_by_user_id").references(() => users.id),
    // Photo (base64 data URI, follows company logo pattern)
    photoBase64: text("photo_base64"),
    photoMimeType: text("photo_mime_type"),
    // Details
    notes: text("notes"),
    specs: jsonb("specs"), // Key-value technical specs (e.g., { "RAM": "8GB", "Storage": "256GB SSD" })
    // Tracking
    serialNumber: text("serial_number"),
    location: text("location"), // Shelf/bin within warehouse
    // External marketplace listing (Ricardo.ch etc.)
    externalListingUrl: text("external_listing_url"),
    externalListingId: text("external_listing_id"),
    externalListingStatus: text("external_listing_status"), // "active" | "sold" | "expired" | "removed"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    statusUpdatedAt: timestamp("status_updated_at").defaultNow().notNull(),
  },
  (table) => ({
    companyIdIdx: index("inventory_items_company_id_idx").on(table.companyId),
    companyStatusIdx: index("inventory_items_company_status_idx").on(table.companyId, table.status),
    companyConditionIdx: index("inventory_items_company_condition_idx").on(
      table.companyId,
      table.condition,
    ),
    intakeDocIdx: index("inventory_items_intake_doc_idx").on(table.intakeDocumentId),
    itemNumberIdx: index("inventory_items_item_number_idx").on(table.companyId, table.itemNumber),
  }),
);

// ============================================================================
// REPAIR PARTS
// ============================================================================

/**
 * Individual parts consumed during an inventory item repair.
 * Provides cost breakdown (labour vs. parts) and optional inventory deduction.
 */
export const repairParts = pgTable(
  "repair_parts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    inventoryItemId: uuid("inventory_item_id")
      .references(() => inventoryItems.id, { onDelete: "cascade" })
      .notNull(),
    // Link to product catalog (optional — may be an external/ad-hoc part)
    productId: uuid("product_id").references(() => products.id),
    description: text("description").notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 4 }).notNull().default("1"),
    unitCost: decimal("unit_cost", { precision: 12, scale: 2 }).notNull(),
    notes: text("notes"),
    recordedByUserId: uuid("recorded_by_user_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    companyIdIdx: index("repair_parts_company_id_idx").on(table.companyId),
    inventoryItemIdx: index("repair_parts_inventory_item_idx").on(table.inventoryItemId),
  }),
);

// ============================================================================
// PROJECTS
// ============================================================================

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    name: text("name").notNull(),
    description: text("description"),
    contactId: uuid("contact_id").references(() => contacts.id),
    status: text("status")
      .default("active")
      .$type<"active" | "completed" | "on_hold" | "cancelled">(),
    budget: decimal("budget", { precision: 12, scale: 2 }),
    startDate: date("start_date"),
    endDate: date("end_date"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    companyIdIdx: index("projects_company_id_idx").on(table.companyId),
  }),
);

// ============================================================================
// PRICING
// ============================================================================

export const priceLists = pgTable(
  "price_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    name: text("name").notNull(),
    currency: text("currency").default("CHF"),
    isDefault: boolean("is_default").default(false),
  },
  (table) => ({
    companyIdIdx: index("price_lists_company_id_idx").on(table.companyId),
  }),
);

export const priceRules = pgTable(
  "price_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    priceListId: uuid("price_list_id")
      .references(() => priceLists.id, { onDelete: "cascade" })
      .notNull(),
    productId: uuid("product_id").references(() => products.id),
    productGroupId: uuid("product_group_id").references(() => productGroups.id),
    type: priceRuleTypeEnum("type").notNull(),
    value: decimal("value", { precision: 12, scale: 2 }).notNull(),
    minQuantity: decimal("min_quantity", { precision: 12, scale: 4 }),
    validFrom: date("valid_from"),
    validTo: date("valid_to"),
  },
  (table) => ({
    priceListIdIdx: index("price_rules_price_list_id_idx").on(table.priceListId),
  }),
);

// ============================================================================
// RECURRING INVOICES
// ============================================================================

export const recurringInvoiceConfigs = pgTable(
  "recurring_invoice_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    orderId: uuid("order_id")
      .references(() => documents.id)
      .notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    periodicity: recurringPeriodicityEnum("periodicity").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    autoExtensionMonths: integer("auto_extension_months"),
    lastGeneratedDate: date("last_generated_date"),
    nextGenerationDate: date("next_generation_date").notNull(),
    emailRecipients: text("email_recipients").array(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    companyIdIdx: index("recurring_invoice_configs_company_id_idx").on(table.companyId),
    nextGenerationIdx: index("recurring_invoice_configs_next_generation_idx").on(
      table.nextGenerationDate,
      table.isActive,
    ),
  }),
);

// ============================================================================
// AI CONVERSATIONS
// ============================================================================

export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    title: text("title"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    companyUserIdx: index("ai_conversations_company_id_user_id_idx").on(
      table.companyId,
      table.userId,
    ),
  }),
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .references(() => aiConversations.id, { onDelete: "cascade" })
      .notNull(),
    role: text("role").notNull().$type<"user" | "assistant" | "system" | "tool">(),
    content: text("content"),
    toolCalls: jsonb("tool_calls"),
    toolCallId: text("tool_call_id"),
    model: text("model"),
    tokenCount: integer("token_count"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    conversationIdIdx: index("ai_messages_conversation_id_idx").on(table.conversationId),
  }),
);

export const aiActionAudit = pgTable("ai_action_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => aiConversations.id),
  userId: uuid("user_id").references(() => users.id),
  toolName: text("tool_name").notNull(),
  actionType: text("action_type").notNull(), // 'create', 'update', 'delete'
  entityType: text("entity_type").notNull(), // 'document', 'contact', etc.
  entityId: uuid("entity_id"),
  beforeState: jsonb("before_state"),
  afterState: jsonb("after_state"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================================
// CONTACT SUBMISSIONS (public — no companyId, from landing page forms)
// ============================================================================

export const CONTACT_SUBMISSION_TYPE_VALUES = ["demo_request", "waitlist", "general"] as const;
export type ContactSubmissionType = (typeof CONTACT_SUBMISSION_TYPE_VALUES)[number];

export const BETRIEBSTYP_VALUES = [
  "it_refurbisher",
  "brockenshaus",
  "repair_cafe",
  "vintage_shop",
  "other",
] as const;
export type BetriebstypValue = (typeof BETRIEBSTYP_VALUES)[number];

export const contactSubmissions = pgTable(
  "contact_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull().$type<ContactSubmissionType>().default("general"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    organisation: text("organisation"),
    betriebstyp: text("betriebstyp").$type<BetriebstypValue>(),
    message: text("message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("contact_submissions_email_idx").on(table.email),
    createdAtIdx: index("contact_submissions_created_at_idx").on(table.createdAt),
  }),
);

// ============================================================================
// WEBHOOKS
// Used by Kivvi to notify external systems (RevampIT, WooCommerce, etc.)
// when events occur. Each company configures its own endpoints.
// ============================================================================

/** Webhook events Kivvi can fire */
/** A configured endpoint per company — where to POST events */
export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    /** HMAC-SHA256 secret for signing payloads */
    secret: text("secret").notNull(),
    /** JSON array of WebhookEvent strings to subscribe to */
    events: jsonb("events").$type<WebhookEvent[]>().notNull().default([]),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    companyIdIdx: index("webhook_endpoints_company_id_idx").on(table.companyId),
  }),
);

/** Log of every outbound webhook attempt — supports retry and debugging */
export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    endpointId: uuid("endpoint_id")
      .references(() => webhookEndpoints.id, { onDelete: "cascade" })
      .notNull(),
    event: text("event").$type<WebhookEvent>().notNull(),
    payload: jsonb("payload").notNull(),
    statusCode: integer("status_code"),
    responseBody: text("response_body"),
    attemptCount: integer("attempt_count").default(0).notNull(),
    /** Null = delivered or permanently failed */
    nextRetryAt: timestamp("next_retry_at"),
    deliveredAt: timestamp("delivered_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    endpointIdIdx: index("webhook_deliveries_endpoint_id_idx").on(table.endpointId),
    nextRetryIdx: index("webhook_deliveries_next_retry_at_idx").on(table.nextRetryAt),
  }),
);

/**
 * Idempotency keys for external `/api/v1` writes. A client (e.g. revamp-it's
 * Payrexx webhook handler) sends an `Idempotency-Key` header; a retried request
 * with the same key + company returns the stored response instead of creating a
 * duplicate document / payment / GL entry (Ground Truth #1: a transaction either
 * happened or it didn't). Rows are claimed 'pending' before processing to close
 * the concurrent-retry race, then updated to 'completed' with the response.
 */
export const apiIdempotencyKeys = pgTable(
  "api_idempotency_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id, { onDelete: "cascade" })
      .notNull(),
    /** Client-supplied idempotency key (unique per company) */
    key: text("key").notNull(),
    method: text("method").notNull(),
    path: text("path").notNull(),
    /** 'pending' while the first request is in flight, 'completed' once stored */
    status: text("status").$type<"pending" | "completed">().notNull(),
    /** HTTP status + JSON body of the first response (null until completed) */
    responseStatus: integer("response_status"),
    responseBody: jsonb("response_body"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    /** TTL horizon for cleanup of old keys */
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => ({
    companyKeyIdx: uniqueIndex("api_idempotency_keys_company_key_idx").on(
      table.companyId,
      table.key,
    ),
    expiresAtIdx: index("api_idempotency_keys_expires_at_idx").on(table.expiresAt),
  }),
);

// ============================================================================
// RELATIONS
// ============================================================================

export const companiesRelations = relations(companies, ({ one, many }) => ({
  users: many(users),
  memberships: many(memberships),
  invitations: many(invitations),
  organizationProfile: one(organizationProfiles, {
    fields: [companies.id],
    references: [organizationProfiles.companyId],
  }),
  vacancies: many(vacancies),
  joinRequests: many(joinRequests),
  contacts: many(contacts),
  documents: many(documents),
  products: many(products),
  accounts: many(accounts),
  projects: many(projects),
  warehouses: many(warehouses),
  manufacturers: many(manufacturers),
  productGroups: many(productGroups),
  numberSequences: many(numberSequences),
  priceLists: many(priceLists),
  fiscalYears: many(fiscalYears),
  recurringInvoiceConfigs: many(recurringInvoiceConfigs),
  webhookEndpoints: many(webhookEndpoints),
}));

export const webhookEndpointsRelations = relations(webhookEndpoints, ({ one, many }) => ({
  company: one(companies, {
    fields: [webhookEndpoints.companyId],
    references: [companies.id],
  }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  endpoint: one(webhookEndpoints, {
    fields: [webhookDeliveries.endpointId],
    references: [webhookEndpoints.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  memberships: many(memberships),
  joinRequests: many(joinRequests),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [memberships.companyId],
    references: [companies.id],
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  company: one(companies, {
    fields: [invitations.companyId],
    references: [companies.id],
  }),
  inviter: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const organizationProfilesRelations = relations(organizationProfiles, ({ one }) => ({
  company: one(companies, {
    fields: [organizationProfiles.companyId],
    references: [companies.id],
  }),
}));

export const vacanciesRelations = relations(vacancies, ({ one, many }) => ({
  company: one(companies, {
    fields: [vacancies.companyId],
    references: [companies.id],
  }),
  joinRequests: many(joinRequests),
}));

export const joinRequestsRelations = relations(joinRequests, ({ one }) => ({
  user: one(users, {
    fields: [joinRequests.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [joinRequests.companyId],
    references: [companies.id],
  }),
  vacancy: one(vacancies, {
    fields: [joinRequests.vacancyId],
    references: [vacancies.id],
  }),
}));

export const externalIntegrationItemsRelations = relations(externalIntegrationItems, ({ one }) => ({
  company: one(companies, {
    fields: [externalIntegrationItems.companyId],
    references: [companies.id],
  }),
  contact: one(contacts, {
    fields: [externalIntegrationItems.contactId],
    references: [contacts.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  company: one(companies, {
    fields: [contacts.companyId],
    references: [companies.id],
  }),
  documents: many(documents),
  addresses: many(contactAddresses),
  projects: many(projects),
}));

export const contactAddressesRelations = relations(contactAddresses, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactAddresses.contactId],
    references: [contacts.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  company: one(companies, {
    fields: [documents.companyId],
    references: [companies.id],
  }),
  contact: one(contacts, {
    fields: [documents.contactId],
    references: [contacts.id],
  }),
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  convertedFrom: one(documents, {
    fields: [documents.convertedFromId],
    references: [documents.id],
    relationName: "documentConversion",
  }),
  convertedTo: many(documents, { relationName: "documentConversion" }),
  createdByUser: one(users, {
    fields: [documents.createdBy],
    references: [users.id],
  }),
  items: many(documentItems),
  payments: many(documentPayments),
  talerOrders: many(talerOrders),
}));

export const documentItemsRelations = relations(documentItems, ({ one }) => ({
  document: one(documents, {
    fields: [documentItems.documentId],
    references: [documents.id],
  }),
  product: one(products, {
    fields: [documentItems.productId],
    references: [products.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [documentItems.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

export const documentPaymentsRelations = relations(documentPayments, ({ one }) => ({
  document: one(documents, {
    fields: [documentPayments.documentId],
    references: [documents.id],
  }),
  bankTransaction: one(bankTransactions, {
    fields: [documentPayments.bankTransactionId],
    references: [bankTransactions.id],
  }),
}));

export const talerOrdersRelations = relations(talerOrders, ({ one }) => ({
  company: one(companies, {
    fields: [talerOrders.companyId],
    references: [companies.id],
  }),
  document: one(documents, {
    fields: [talerOrders.documentId],
    references: [documents.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  company: one(companies, {
    fields: [products.companyId],
    references: [companies.id],
  }),
  manufacturer: one(manufacturers, {
    fields: [products.manufacturerId],
    references: [manufacturers.id],
  }),
  productGroup: one(productGroups, {
    fields: [products.productGroupId],
    references: [productGroups.id],
  }),
  stockLevels: many(stockLevels),
  stockMovements: many(stockMovements),
  serialNumbers: many(serialNumbers),
}));

export const manufacturersRelations = relations(manufacturers, ({ one, many }) => ({
  company: one(companies, {
    fields: [manufacturers.companyId],
    references: [companies.id],
  }),
  products: many(products),
}));

export const productGroupsRelations = relations(productGroups, ({ one, many }) => ({
  company: one(companies, {
    fields: [productGroups.companyId],
    references: [companies.id],
  }),
  products: many(products),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  company: one(companies, {
    fields: [projects.companyId],
    references: [companies.id],
  }),
  contact: one(contacts, {
    fields: [projects.contactId],
    references: [contacts.id],
  }),
  documents: many(documents),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  company: one(companies, {
    fields: [accounts.companyId],
    references: [companies.id],
  }),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  company: one(companies, {
    fields: [journalEntries.companyId],
    references: [companies.id],
  }),
  createdByUser: one(users, {
    fields: [journalEntries.createdBy],
    references: [users.id],
  }),
  lines: many(journalLines),
}));

export const journalLinesRelations = relations(journalLines, ({ one }) => ({
  journalEntry: one(journalEntries, {
    fields: [journalLines.journalEntryId],
    references: [journalEntries.id],
  }),
  account: one(accounts, {
    fields: [journalLines.accountId],
    references: [accounts.id],
  }),
}));

export const bankAccountsRelations = relations(bankAccounts, ({ one, many }) => ({
  company: one(companies, {
    fields: [bankAccounts.companyId],
    references: [companies.id],
  }),
  account: one(accounts, {
    fields: [bankAccounts.accountId],
    references: [accounts.id],
  }),
  transactions: many(bankTransactions),
}));

export const bankTransactionsRelations = relations(bankTransactions, ({ one }) => ({
  bankAccount: one(bankAccounts, {
    fields: [bankTransactions.bankAccountId],
    references: [bankAccounts.id],
  }),
  reconciledDocument: one(documents, {
    fields: [bankTransactions.reconciledDocumentId],
    references: [documents.id],
  }),
}));

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
  company: one(companies, {
    fields: [warehouses.companyId],
    references: [companies.id],
  }),
  stockLevels: many(stockLevels),
  stockMovements: many(stockMovements),
}));

export const stockLevelsRelations = relations(stockLevels, ({ one }) => ({
  product: one(products, {
    fields: [stockLevels.productId],
    references: [products.id],
  }),
  warehouse: one(warehouses, {
    fields: [stockLevels.warehouseId],
    references: [warehouses.id],
  }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  product: one(products, {
    fields: [stockMovements.productId],
    references: [products.id],
  }),
  warehouse: one(warehouses, {
    fields: [stockMovements.warehouseId],
    references: [warehouses.id],
  }),
  document: one(documents, {
    fields: [stockMovements.documentId],
    references: [documents.id],
  }),
}));

export const serialNumbersRelations = relations(serialNumbers, ({ one }) => ({
  product: one(products, {
    fields: [serialNumbers.productId],
    references: [products.id],
  }),
  warehouse: one(warehouses, {
    fields: [serialNumbers.warehouseId],
    references: [warehouses.id],
  }),
  soldToContact: one(contacts, {
    fields: [serialNumbers.soldToContactId],
    references: [contacts.id],
  }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  company: one(companies, {
    fields: [inventoryItems.companyId],
    references: [companies.id],
  }),
  product: one(products, {
    fields: [inventoryItems.productId],
    references: [products.id],
  }),
  warehouse: one(warehouses, {
    fields: [inventoryItems.warehouseId],
    references: [warehouses.id],
  }),
  intakeDocument: one(documents, {
    fields: [inventoryItems.intakeDocumentId],
    references: [documents.id],
    relationName: "intakeItems",
  }),
  saleDocument: one(documents, {
    fields: [inventoryItems.saleDocumentId],
    references: [documents.id],
    relationName: "saleItems",
  }),
  donorContact: one(contacts, {
    fields: [inventoryItems.donorContactId],
    references: [contacts.id],
  }),
  repairParts: many(repairParts),
}));

export const repairPartsRelations = relations(repairParts, ({ one }) => ({
  company: one(companies, {
    fields: [repairParts.companyId],
    references: [companies.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [repairParts.inventoryItemId],
    references: [inventoryItems.id],
  }),
  product: one(products, {
    fields: [repairParts.productId],
    references: [products.id],
  }),
  recordedBy: one(users, {
    fields: [repairParts.recordedByUserId],
    references: [users.id],
  }),
}));

export const fiscalYearsRelations = relations(fiscalYears, ({ one, many }) => ({
  company: one(companies, {
    fields: [fiscalYears.companyId],
    references: [companies.id],
  }),
  periods: many(fiscalPeriods),
}));

export const fiscalPeriodsRelations = relations(fiscalPeriods, ({ one }) => ({
  fiscalYear: one(fiscalYears, {
    fields: [fiscalPeriods.fiscalYearId],
    references: [fiscalYears.id],
  }),
}));

export const numberSequencesRelations = relations(numberSequences, ({ one }) => ({
  company: one(companies, {
    fields: [numberSequences.companyId],
    references: [companies.id],
  }),
}));

export const priceListsRelations = relations(priceLists, ({ one, many }) => ({
  company: one(companies, {
    fields: [priceLists.companyId],
    references: [companies.id],
  }),
  rules: many(priceRules),
}));

export const priceRulesRelations = relations(priceRules, ({ one }) => ({
  priceList: one(priceLists, {
    fields: [priceRules.priceListId],
    references: [priceLists.id],
  }),
  product: one(products, {
    fields: [priceRules.productId],
    references: [products.id],
  }),
  productGroup: one(productGroups, {
    fields: [priceRules.productGroupId],
    references: [productGroups.id],
  }),
}));

export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
  company: one(companies, {
    fields: [aiConversations.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [aiConversations.userId],
    references: [users.id],
  }),
  messages: many(aiMessages),
}));

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiMessages.conversationId],
    references: [aiConversations.id],
  }),
}));

export const recurringInvoiceConfigsRelations = relations(recurringInvoiceConfigs, ({ one }) => ({
  company: one(companies, {
    fields: [recurringInvoiceConfigs.companyId],
    references: [companies.id],
  }),
  order: one(documents, {
    fields: [recurringInvoiceConfigs.orderId],
    references: [documents.id],
  }),
}));

// ============================================================================
// TYPES (derived from schema)
// ============================================================================

export interface OrgProfile {
  identity?: {
    mission?: string;
    legalForm?: string;
    founded?: string;
    location?: string;
    website?: string;
    description?: string;
  };
  services?: Array<{
    name: string;
    description?: string;
    pricing?: string;
  }>;
  team?: Array<{
    name: string;
    role: string;
    responsibilities?: string;
  }>;
  financialContext?: {
    fundingSources?: string[];
    revenueModel?: string;
    fiscalYearEnd?: string;
    notes?: string;
  };
  impactMetrics?: Array<{
    label: string;
    value: string;
  }>;
  strategy?: {
    vision?: string;
    goals?: string[];
    timeline?: string;
  };
  fundraising?: {
    status?: string;
    goal?: string;
    campaigns?: string[];
    notes?: string;
  };
  communicationStyle?: {
    tone?: string;
    language?: string;
    guidelines?: string;
  };
  customerSegments?: Array<{
    segment: string;
    description?: string;
  }>;
  customContext?: string;
}

export interface CompanySettings {
  defaultVatRate?: number;
  invoicePrefix?: string;
  invoiceNextNumber?: number;
  defaultPaymentTermsDays?: number;
  /** Default hourly rate (CHF, decimal string) used when billing repair labor */
  defaultRepairHourlyRate?: string;
  bankAccount?: {
    iban?: string;
    bankName?: string;
  };
  logoBase64?: string; // data:image/<type>;base64,...
  logoMimeType?: string; // image/png, image/jpeg, image/svg+xml
  aiProvider?: AiProviderValue;
  aiModel?: string;
  aiApiKey?: string; // encrypted
  onboardingCompletedAt?: string; // ISO date, null = not done
  onboardingStep?: number; // 1-4, for resume
  /**
   * Per-tenant module configuration. Keys are toggleable module ids (see
   * packages/core/src/config/modules.ts). `undefined` = ALL modules enabled
   * (legacy/default behaviour); an array = only the listed modules are on.
   * Stored in JSONB — no migration required.
   */
  enabledModules?: string[];
  dashboardPreferences?: {
    layout?: "default" | "compact" | "detailed";
    visibleSections?: string[];
    statsOrder?: string[];
    chartTypes?: Record<string, "bar" | "line" | "pie">;
    maxQuickActions?: number;
    maxWorkflowSuggestions?: number;
  };
  plan?: "free" | "premium";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: "trialing" | "active" | "past_due" | "cancelled";
  trialEndsAt?: string; // ISO date
  vertical?:
    | "general"
    | "financial-advisory"
    | "legal"
    | "medical"
    | "nonprofit"
    | "retail"
    | "manufacturing";
  orgProfile?: OrgProfile;
  defaultDocumentFooter?: string;
  /** CO2 savings factors (kg) per item category — overrides the app defaults */
  co2FactorsKg?: Record<string, number>;
  /** Ricardo.ch seller API key for publishing items to the marketplace */
  ricardoApiKey?: string;
  /** Nextcloud/WebDAV document connection for shared customer files */
  nextcloud?: {
    baseUrl?: string;
    username?: string;
    appPassword?: string;
    folderPath?: string;
    enabled?: boolean;
    lastTestedAt?: string;
    lastStatus?: "ok" | "error";
    lastError?: string;
  };
  /** IMAP mailbox connection for customer-request intake. Thunderbird can use the same mailbox settings. */
  mailIntake?: {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    mailbox?: string;
    useTls?: boolean;
    enabled?: boolean;
    lastTestedAt?: string;
    lastStatus?: "ok" | "error";
    lastError?: string;
  };
  /** GNU Taler merchant backend connection for invoice payment links */
  taler?: {
    merchantBackendUrl?: string;
    instance?: string;
    accessToken?: string;
    enabled?: boolean;
    lastTestedAt?: string;
    lastStatus?: "ok" | "error";
    lastError?: string;
  };
  /** True if company was seeded with sample data during onboarding */
  isSampleData?: boolean;
  /** Post-onboarding guided checklist — keys are step IDs, value is ISO date completed */
  onboardingChecklist?: Record<string, string>;
}

// Inferred types from schema — use these throughout the app
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type User = typeof users.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type ContactAddress = typeof contactAddresses.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Manufacturer = typeof manufacturers.$inferSelect;
export type ProductGroup = typeof productGroups.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentItem = typeof documentItems.$inferSelect;
export type NewDocumentItem = typeof documentItems.$inferInsert;
export type DocumentPayment = typeof documentPayments.$inferSelect;
export type NumberSequence = typeof numberSequences.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type CostCenter = typeof costCenters.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type JournalLine = typeof journalLines.$inferSelect;
export type LedgerHead = typeof ledgerHeads.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type PostingGroup = typeof postingGroups.$inferSelect;
export type Fund = typeof funds.$inferSelect;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type BankTransaction = typeof bankTransactions.$inferSelect;
export type Warehouse = typeof warehouses.$inferSelect;
export type StockLevel = typeof stockLevels.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
export type SerialNumber = typeof serialNumbers.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type FiscalYear = typeof fiscalYears.$inferSelect;
export type FiscalPeriod = typeof fiscalPeriods.$inferSelect;
export type PriceList = typeof priceLists.$inferSelect;
export type PriceRule = typeof priceRules.$inferSelect;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
export type RepairPart = typeof repairParts.$inferSelect;
export type NewRepairPart = typeof repairParts.$inferInsert;
export type RecurringInvoiceConfig = typeof recurringInvoiceConfigs.$inferSelect;
export type NewRecurringInvoiceConfig = typeof recurringInvoiceConfigs.$inferInsert;

export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;
export type NewWebhookEndpoint = typeof webhookEndpoints.$inferInsert;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;

export type ApiIdempotencyKey = typeof apiIdempotencyKeys.$inferSelect;
export type NewApiIdempotencyKey = typeof apiIdempotencyKeys.$inferInsert;

export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type OrganizationProfile = typeof organizationProfiles.$inferSelect;
export type NewOrganizationProfile = typeof organizationProfiles.$inferInsert;
export type Vacancy = typeof vacancies.$inferSelect;
export type NewVacancy = typeof vacancies.$inferInsert;
export type JoinRequest = typeof joinRequests.$inferSelect;
export type NewJoinRequest = typeof joinRequests.$inferInsert;
export type ExternalIntegrationItem = typeof externalIntegrationItems.$inferSelect;
export type NewExternalIntegrationItem = typeof externalIntegrationItems.$inferInsert;

// Document type literals for type narrowing
export type DocumentType = (typeof documentTypeEnum.enumValues)[number];
export type DocumentStatus = (typeof documentStatusEnum.enumValues)[number];
export type AccountType = (typeof accountTypeEnum.enumValues)[number];
export type ContactType = (typeof contactTypeEnum.enumValues)[number];
export type MembershipRole = (typeof membershipRoleEnum.enumValues)[number];
/** All membership roles — re-exported from enums for convenience */
export const MEMBERSHIP_ROLES = membershipRoleEnum.enumValues;
export type InvitationStatus = (typeof invitationStatusEnum.enumValues)[number];
export type AvailabilityType = (typeof availabilityTypeEnum.enumValues)[number];
export type VacancyType = (typeof vacancyTypeEnum.enumValues)[number];
export type LocationMode = (typeof locationModeEnum.enumValues)[number];
export type VacancyStatus = (typeof vacancyStatusEnum.enumValues)[number];
export type JoinRequestStatus = (typeof joinRequestStatusEnum.enumValues)[number];
export type RecurringPeriodicity = (typeof recurringPeriodicityEnum.enumValues)[number];
