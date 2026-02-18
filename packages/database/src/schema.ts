import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  decimal,
  boolean,
  jsonb,
  pgEnum,
  date,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const contactTypeEnum = pgEnum('contact_type', [
  'customer',
  'vendor',
  'both',
]);

export const documentTypeEnum = pgEnum('document_type', [
  'quote',
  'order',
  'order_confirmation',
  'delivery_note',
  'invoice',
  'credit_note',
  'purchase_order',
  'purchase_invoice',
  'dunning',
]);

export const documentStatusEnum = pgEnum('document_status', [
  'draft',
  'sent',
  'confirmed',
  'delivered',
  'paid',
  'partially_paid',
  'overdue',
  'cancelled',
  'dunning_1',
  'dunning_2',
  'dunning_3',
]);

export const accountTypeEnum = pgEnum('account_type', [
  'asset',
  'liability',
  'equity',
  'revenue',
  'expense',
]);

export const stockMovementTypeEnum = pgEnum('stock_movement_type', [
  'purchase',
  'sale',
  'adjustment',
  'transfer',
  'return',
]);

export const priceRuleTypeEnum = pgEnum('price_rule_type', [
  'fixed',
  'percentage',
  'tiered',
]);

export const recurringPeriodicityEnum = pgEnum('recurring_periodicity', [
  'monthly',
  'quarterly',
  'annual',
]);

// ============================================================================
// AUTH & COMPANIES
// ============================================================================

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  legalName: text('legal_name'),
  vatNumber: text('vat_number'),
  address: text('address'),
  city: text('city'),
  postalCode: text('postal_code'),
  country: text('country').default('CH'),
  currency: text('currency').default('CHF'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  settings: jsonb('settings').default({}).$type<CompanySettings>(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  passwordHash: text('password_hash'),
  companyId: uuid('company_id').references(() => companies.id),
  role: text('role').default('member'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index('password_reset_tokens_token_idx').on(table.token),
  userIdIdx: index('password_reset_tokens_user_id_idx').on(table.userId),
}));

// ============================================================================
// CONTACTS (CUSTOMERS & VENDORS)
// ============================================================================

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  type: contactTypeEnum('type').notNull(),
  contactNumber: text('contact_number'), // Auto-generated, e.g. K-00001
  // Name fields
  name: text('name').notNull(), // Company/display name
  firstName: text('first_name'),
  lastName: text('last_name'),
  // Contact info
  email: text('email'),
  phone: text('phone'),
  mobile: text('mobile'),
  website: text('website'),
  // Primary address
  address: text('address'),
  city: text('city'),
  postalCode: text('postal_code'),
  country: text('country').default('CH'),
  // Financial
  vatNumber: text('vat_number'),
  iban: text('iban'),
  bic: text('bic'),
  paymentTermsDays: integer('payment_terms_days').default(30),
  creditLimit: decimal('credit_limit', { precision: 12, scale: 2 }),
  // Settings
  language: text('language').default('de'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true),
  // Migration
  kivitendoId: integer('kivitendo_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueContactNumberPerCompany: uniqueIndex('unique_contact_number_per_company').on(table.companyId, table.contactNumber),
  companyIdIdx: index('contacts_company_id_idx').on(table.companyId),
  emailIdx: index('contacts_email_idx').on(table.email),
}));

export const contactAddresses = pgTable('contact_addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull().$type<'billing' | 'shipping' | 'other'>(),
  name: text('name'),
  address: text('address'),
  city: text('city'),
  postalCode: text('postal_code'),
  country: text('country').default('CH'),
  isDefault: boolean('is_default').default(false),
}, (table) => ({
  contactIdIdx: index('contact_addresses_contact_id_idx').on(table.contactId),
}));

// ============================================================================
// PRODUCTS & SERVICES
// ============================================================================

export const manufacturers = pgTable('manufacturers', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  name: text('name').notNull(),
  website: text('website'),
}, (table) => ({
  companyIdIdx: index('manufacturers_company_id_idx').on(table.companyId),
}));

export const productGroups = pgTable('product_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  name: text('name').notNull(),
  parentId: uuid('parent_id'), // Self-referencing for hierarchy
}, (table) => ({
  companyIdIdx: index('product_groups_company_id_idx').on(table.companyId),
}));

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  articleNumber: text('article_number'), // Auto-generated, e.g. ART-00001
  sku: text('sku'),
  ean: text('ean'), // Barcode
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull().$type<'product' | 'service'>(),
  // Categorization
  manufacturerId: uuid('manufacturer_id').references(() => manufacturers.id),
  productGroupId: uuid('product_group_id').references(() => productGroups.id),
  // Pricing
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  purchasePrice: decimal('purchase_price', { precision: 12, scale: 2 }),
  currency: text('currency').default('CHF'),
  // Default VAT rate (matches DEFAULT_VAT_RATE from @kivvi/core/src/config/vat-rates.ts)
  vatRate: decimal('vat_rate', { precision: 5, scale: 2 }).default('8.1'),
  unit: text('unit').default('piece'),
  // Dimensions & weight
  weight: decimal('weight', { precision: 10, scale: 3 }), // kg
  width: decimal('width', { precision: 10, scale: 2 }),    // cm
  height: decimal('height', { precision: 10, scale: 2 }),  // cm
  depth: decimal('depth', { precision: 10, scale: 2 }),    // cm
  // Stock
  minStock: integer('min_stock'), // Reorder point
  stockQuantity: decimal('stock_quantity', { precision: 12, scale: 4 }).default('0'), // Cached total
  serialNumberTracking: boolean('serial_number_tracking').default(false),
  // Flags
  isActive: boolean('is_active').default(true),
  shopVisible: boolean('shop_visible').default(false),
  // Migration
  kivitendoId: integer('kivitendo_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueArticleNumberPerCompany: uniqueIndex('products_company_id_article_number_idx').on(table.companyId, table.articleNumber),
  companyActiveIdx: index('products_company_active_idx').on(table.companyId, table.isActive),
}));

// ============================================================================
// UNIFIED DOCUMENTS (quotes, orders, invoices, credit notes, etc.)
// ============================================================================

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  contactId: uuid('contact_id').references(() => contacts.id),
  projectId: uuid('project_id').references(() => projects.id),
  // Type & status
  type: documentTypeEnum('type').notNull(),
  status: documentStatusEnum('status').default('draft').notNull(),
  number: text('number').notNull(),
  // Dates
  issueDate: timestamp('issue_date').defaultNow().notNull(),
  dueDate: timestamp('due_date'),
  deliveryDate: timestamp('delivery_date'),
  paidDate: timestamp('paid_date'),
  // Financial
  currency: text('currency').default('CHF').notNull(),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).default('0').notNull(),
  vatAmount: decimal('vat_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  total: decimal('total', { precision: 12, scale: 2 }).default('0').notNull(),
  // Content
  notes: text('notes'),
  internalNotes: text('internal_notes'),
  // Swiss QR-bill
  qrReference: text('qr_reference'),
  // Document conversion chain
  convertedFromId: uuid('converted_from_id'),
  // Tracking
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueNumberPerCompanyType: uniqueIndex('documents_company_id_type_number_idx').on(table.companyId, table.type, table.number),
  companyIdIdx: index('documents_company_id_idx').on(table.companyId),
  companyStatusIdx: index('documents_company_id_status_idx').on(table.companyId, table.status),
  companyTypeIdx: index('documents_company_id_type_idx').on(table.companyId, table.type),
  contactIdIdx: index('documents_contact_id_idx').on(table.contactId),
  issueDateIdx: index('documents_issue_date_idx').on(table.issueDate),
  projectIdIdx: index('documents_project_id_idx').on(table.projectId),
  convertedFromIdIdx: index('documents_converted_from_id_idx').on(table.convertedFromId),
}));

export const documentItems = pgTable('document_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id),
  position: integer('position').default(0),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 5, scale: 2 }).default('0'), // Percentage
  // Default VAT rate (matches DEFAULT_VAT_RATE from @kivvi/core/src/config/vat-rates.ts)
  vatRate: decimal('vat_rate', { precision: 5, scale: 2 }).default('8.1'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
}, (table) => ({
  documentIdIdx: index('document_items_document_id_idx').on(table.documentId),
}));

export const documentPayments = pgTable('document_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
  bankTransactionId: uuid('bank_transaction_id').references(() => bankTransactions.id),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  date: timestamp('date').notNull(),
  method: text('method').$type<'bank_transfer' | 'cash' | 'card' | 'other'>(),
  reference: text('reference'),
}, (table) => ({
  documentIdIdx: index('document_payments_document_id_idx').on(table.documentId),
}));

// ============================================================================
// NUMBER SEQUENCES
// ============================================================================

export const numberSequences = pgTable('number_sequences', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  type: text('type').notNull(), // 'invoice', 'quote', 'contact', 'product', etc.
  prefix: text('prefix').notNull(), // 'RE', 'AN', 'K', 'ART'
  nextNumber: integer('next_number').default(1).notNull(),
  format: text('format').default('{prefix}-{year}-{number:5}').notNull(), // Pattern
}, (table) => ({
  uniqueTypePerCompany: uniqueIndex('unique_type_per_company').on(table.companyId, table.type),
}));

// ============================================================================
// ACCOUNTING
// ============================================================================

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  code: text('code').notNull(), // e.g., "1000", "3000"
  name: text('name').notNull(),
  type: accountTypeEnum('type').notNull(),
  parentId: uuid('parent_id'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueCodePerCompany: uniqueIndex('accounts_company_id_code_idx').on(table.companyId, table.code),
  companyIdIdx: index('accounts_company_id_idx').on(table.companyId),
}));

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  date: timestamp('date').notNull(),
  reference: text('reference'),
  description: text('description'),
  sourceType: text('source_type'), // 'invoice', 'payment', 'manual'
  sourceId: uuid('source_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  companyIdIdx: index('journal_entries_company_id_idx').on(table.companyId),
  dateIdx: index('journal_entries_date_idx').on(table.date),
}));

export const journalLines = pgTable('journal_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id, { onDelete: 'cascade' }).notNull(),
  accountId: uuid('account_id').references(() => accounts.id).notNull(),
  debit: decimal('debit', { precision: 12, scale: 2 }),
  credit: decimal('credit', { precision: 12, scale: 2 }),
  description: text('description'),
}, (table) => ({
  journalEntryIdIdx: index('journal_lines_journal_entry_id_idx').on(table.journalEntryId),
  accountIdIdx: index('journal_lines_account_id_idx').on(table.accountId),
}));

// ============================================================================
// FISCAL YEARS & PERIODS
// ============================================================================

export const fiscalYears = pgTable('fiscal_years', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  name: text('name').notNull(), // e.g., "2026"
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isClosed: boolean('is_closed').default(false),
}, (table) => ({
  companyIdIdx: index('fiscal_years_company_id_idx').on(table.companyId),
}));

export const fiscalPeriods = pgTable('fiscal_periods', {
  id: uuid('id').primaryKey().defaultRandom(),
  fiscalYearId: uuid('fiscal_year_id').references(() => fiscalYears.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(), // e.g., "January 2026"
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isClosed: boolean('is_closed').default(false),
}, (table) => ({
  fiscalYearIdIdx: index('fiscal_periods_fiscal_year_id_idx').on(table.fiscalYearId),
}));

// ============================================================================
// BANKING
// ============================================================================

export const bankAccounts = pgTable('bank_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  accountId: uuid('account_id').references(() => accounts.id),
  name: text('name').notNull(),
  iban: text('iban'),
  bankName: text('bank_name'),
  currency: text('currency').default('CHF'),
  balance: decimal('balance', { precision: 12, scale: 2 }).default('0'),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bankTransactions = pgTable('bank_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  bankAccountId: uuid('bank_account_id').references(() => bankAccounts.id).notNull(),
  date: timestamp('date').notNull(),
  description: text('description'),
  reference: text('reference'),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  balance: decimal('balance', { precision: 12, scale: 2 }),
  isReconciled: boolean('is_reconciled').default(false),
  reconciledDocumentId: uuid('reconciled_document_id').references(() => documents.id),
  reconciledAt: timestamp('reconciled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  bankAccountIdIdx: index('bank_transactions_bank_account_id_idx').on(table.bankAccountId),
  bankAccountReconciledIdx: index('bank_transactions_bank_account_id_is_reconciled_idx').on(table.bankAccountId, table.isReconciled),
  dateIdx: index('bank_transactions_date_idx').on(table.date),
}));

// ============================================================================
// INVENTORY
// ============================================================================

export const warehouses = pgTable('warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  name: text('name').notNull(),
  address: text('address'),
  isDefault: boolean('is_default').default(false),
}, (table) => ({
  companyIdIdx: index('warehouses_company_id_idx').on(table.companyId),
}));

export const stockLevels = pgTable('stock_levels', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id, { onDelete: 'cascade' }).notNull(),
  quantity: decimal('quantity', { precision: 12, scale: 4 }).default('0').notNull(),
  reservedQuantity: decimal('reserved_quantity', { precision: 12, scale: 4 }).default('0').notNull(),
}, (table) => ({
  uniqueProductWarehouse: uniqueIndex('unique_product_warehouse').on(table.productId, table.warehouseId),
}));

export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id).notNull(),
  type: stockMovementTypeEnum('type').notNull(),
  quantity: decimal('quantity', { precision: 12, scale: 4 }).notNull(), // Positive for in, negative for out
  reference: text('reference'),
  documentId: uuid('document_id').references(() => documents.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  warehouseProductIdx: index('stock_movements_warehouse_product_idx').on(table.warehouseId, table.productId),
}));

export const serialNumbers = pgTable('serial_numbers', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').references(() => products.id).notNull(),
  serialNumber: text('serial_number').notNull(),
  status: text('status').default('available').$type<'available' | 'sold' | 'reserved' | 'defective'>(),
  warehouseId: uuid('warehouse_id').references(() => warehouses.id),
  soldToContactId: uuid('sold_to_contact_id').references(() => contacts.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueSerialPerProduct: uniqueIndex('serial_numbers_product_id_serial_number_idx').on(table.productId, table.serialNumber),
  productIdIdx: index('serial_numbers_product_id_idx').on(table.productId),
}));

// ============================================================================
// PROJECTS
// ============================================================================

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  contactId: uuid('contact_id').references(() => contacts.id),
  status: text('status').default('active').$type<'active' | 'completed' | 'on_hold' | 'cancelled'>(),
  budget: decimal('budget', { precision: 12, scale: 2 }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyIdIdx: index('projects_company_id_idx').on(table.companyId),
}));

// ============================================================================
// PRICING
// ============================================================================

export const priceLists = pgTable('price_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  name: text('name').notNull(),
  currency: text('currency').default('CHF'),
  isDefault: boolean('is_default').default(false),
}, (table) => ({
  companyIdIdx: index('price_lists_company_id_idx').on(table.companyId),
}));

export const priceRules = pgTable('price_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  priceListId: uuid('price_list_id').references(() => priceLists.id, { onDelete: 'cascade' }).notNull(),
  productId: uuid('product_id').references(() => products.id),
  productGroupId: uuid('product_group_id').references(() => productGroups.id),
  type: priceRuleTypeEnum('type').notNull(),
  value: decimal('value', { precision: 12, scale: 2 }).notNull(),
  minQuantity: decimal('min_quantity', { precision: 12, scale: 4 }),
  validFrom: date('valid_from'),
  validTo: date('valid_to'),
}, (table) => ({
  priceListIdIdx: index('price_rules_price_list_id_idx').on(table.priceListId),
}));

// ============================================================================
// RECURRING INVOICES
// ============================================================================

export const recurringInvoiceConfigs = pgTable('recurring_invoice_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  orderId: uuid('order_id').references(() => documents.id).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  periodicity: recurringPeriodicityEnum('periodicity').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  autoExtensionMonths: integer('auto_extension_months'),
  lastGeneratedDate: date('last_generated_date'),
  nextGenerationDate: date('next_generation_date').notNull(),
  emailRecipients: text('email_recipients').array(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  companyIdIdx: index('recurring_invoice_configs_company_id_idx').on(table.companyId),
  nextGenerationIdx: index('recurring_invoice_configs_next_generation_idx').on(table.nextGenerationDate, table.isActive),
}));

// ============================================================================
// AI CONVERSATIONS
// ============================================================================

export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  title: text('title'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const aiMessages = pgTable('ai_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => aiConversations.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull().$type<'user' | 'assistant' | 'system' | 'tool'>(),
  content: text('content'),
  toolCalls: jsonb('tool_calls'),
  toolCallId: text('tool_call_id'),
  model: text('model'),
  tokenCount: integer('token_count'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  conversationIdIdx: index('ai_messages_conversation_id_idx').on(table.conversationId),
}));

export const aiActionAudit = pgTable('ai_action_audit', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => aiConversations.id),
  userId: uuid('user_id').references(() => users.id),
  toolName: text('tool_name').notNull(),
  actionType: text('action_type').notNull(), // 'create', 'update', 'delete'
  entityType: text('entity_type').notNull(), // 'document', 'contact', etc.
  entityId: uuid('entity_id'),
  beforeState: jsonb('before_state'),
  afterState: jsonb('after_state'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
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
}));

export const usersRelations = relations(users, ({ one }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
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
    relationName: 'documentConversion',
  }),
  convertedTo: many(documents, { relationName: 'documentConversion' }),
  createdByUser: one(users, {
    fields: [documents.createdBy],
    references: [users.id],
  }),
  items: many(documentItems),
  payments: many(documentPayments),
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

export interface CompanySettings {
  defaultVatRate?: number;
  invoicePrefix?: string;
  invoiceNextNumber?: number;
  defaultPaymentTermsDays?: number;
  bankAccount?: {
    iban?: string;
    bankName?: string;
  };
  aiProvider?: 'anthropic' | 'openai' | 'openrouter' | 'ollama';
  aiModel?: string;
  aiApiKey?: string; // encrypted
  onboardingCompletedAt?: string; // ISO date, null = not done
  onboardingStep?: number; // 1-4, for resume
  dashboardPreferences?: {
    layout?: 'default' | 'compact' | 'detailed';
    visibleSections?: string[];
    statsOrder?: string[];
    chartTypes?: Record<string, 'bar' | 'line' | 'pie'>;
    maxQuickActions?: number;
    maxWorkflowSuggestions?: number;
  };
  plan?: 'free' | 'premium';
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
export type JournalEntry = typeof journalEntries.$inferSelect;
export type JournalLine = typeof journalLines.$inferSelect;
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
export type RecurringInvoiceConfig = typeof recurringInvoiceConfigs.$inferSelect;
export type NewRecurringInvoiceConfig = typeof recurringInvoiceConfigs.$inferInsert;

// Document type literals for type narrowing
export type DocumentType = typeof documentTypeEnum.enumValues[number];
export type DocumentStatus = typeof documentStatusEnum.enumValues[number];
export type AccountType = typeof accountTypeEnum.enumValues[number];
export type ContactType = typeof contactTypeEnum.enumValues[number];
export type RecurringPeriodicity = typeof recurringPeriodicityEnum.enumValues[number];
