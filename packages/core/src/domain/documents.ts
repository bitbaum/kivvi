import { z } from "zod";
import Decimal from "decimal.js";
import {
  eq,
  and,
  or,
  ilike,
  gte,
  lte,
  desc,
  asc,
  sql,
  count,
  sum,
  inArray,
} from "drizzle-orm";
import {
  documents,
  documentItems,
  documentPayments,
  bankTransactions,
  bankAccounts,
  companies,
  contacts,
  inventoryItems,
  products,
} from "@kivvi/database";
import type {
  Database,
  DocumentType,
  DocumentStatus,
  PaymentMethodValue,
  IntakeSourceValue,
  CompanySettings,
} from "@kivvi/database";
import {
  DOCUMENT_TYPE_VALUES,
  INTAKE_SOURCE_VALUES,
} from "@kivvi/database/src/enums";
import type { PaginatedResult } from "./contacts";
import { DomainError } from "../domain-error";
import { calcItemNet, calcDocumentTotals } from "../utils/document-totals";
import { getNextNumber } from "./number-sequences";
import {
  createInvoiceSentJournalEntry,
  createPurchaseInvoiceJournalEntry,
  createCreditNoteSentJournalEntry,
  createCancellationReversalJournalEntry,
  createPaymentReceivedJournalEntry,
  createConsignmentSettlementJournalEntry,
} from "./accounting-integration";
import { DEFAULT_VAT_RATE } from "../config/vat-rates";
import { DEFAULT_CURRENCY } from "../config/locale";
import { VALID_CONVERSIONS } from "./document-conversions";
import {
  createStockMovementsForDocument,
  updateStockReservationsForDocument,
} from "./inventory-integration";
import { createInventoryItemsFromIntake } from "./intake-integration";
import { createInventoryItemsFromPurchaseInvoice } from "./purchase-invoice-integration";
import { sellInventoryItem, returnInventoryItem } from "./inventory-items";
import { SALES_DOCUMENT_TYPES } from "../config/item-transitions";
import {
  PAYABLE_DOCUMENT_TYPES,
  QR_REFERENCE_TYPES,
  OPEN_STATUSES,
  NON_TERMINAL_STATUSES,
  isValidDocumentTransition,
} from "../config/document-constants";
import { logger } from "../logger";
import { AMOUNT_REGEX, QUANTITY_REGEX } from "../utils/validation-patterns";
import { dispatchWebhookEvent } from "./webhooks";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const documentItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  inventoryItemId: z.string().uuid().optional().nullable(),
  position: z.number().int().min(0),
  description: z.string().min(1, "Description is required"),
  quantity: z.string().regex(QUANTITY_REGEX, "Invalid quantity"),
  unitPrice: z.string().regex(AMOUNT_REGEX, "Invalid unit price"),
  discount: z
    .string()
    .regex(AMOUNT_REGEX, "Invalid discount")
    .default("0")
    .refine((v) => parseFloat(v) <= 100, "Discount cannot exceed 100%"),
  vatRate: z
    .string()
    .regex(AMOUNT_REGEX, "Invalid VAT rate")
    .default(DEFAULT_VAT_RATE),
});

export const createDocumentSchema = z.object({
  type: z.enum(DOCUMENT_TYPE_VALUES),
  contactId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  costCenterId: z.string().uuid().optional().nullable(),
  issueDate: z.string().optional(), // ISO date string
  dueDate: z.string().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  currency: z.string().default(DEFAULT_CURRENCY),
  notes: z.string().max(5000).optional().nullable(),
  internalNotes: z.string().max(5000).optional().nullable(),
  // Intake-specific fields
  intakeSource: z.enum(INTAKE_SOURCE_VALUES).optional().nullable(),
  donorId: z.string().uuid().optional().nullable(),
  consignmentRate: z
    .string()
    .regex(AMOUNT_REGEX, "Invalid consignment rate")
    .optional()
    .nullable(),
  items: z
    .array(documentItemSchema)
    .min(1, "At least one line item is required"),
});

export const updateDocumentSchema = z.object({
  contactId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  costCenterId: z.string().uuid().optional().nullable(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  currency: z.string().optional(),
  notes: z.string().max(5000).optional().nullable(),
  internalNotes: z.string().max(5000).optional().nullable(),
  consignmentRate: z
    .string()
    .regex(AMOUNT_REGEX, "Invalid consignment rate")
    .optional()
    .nullable(),
  items: z
    .array(documentItemSchema)
    .min(1, "At least one line item is required")
    .optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentItemInput = z.infer<typeof documentItemSchema>;

export const createRepairLaborInvoiceSchema = z.object({
  itemId: z.string().uuid(),
  contactId: z.string().uuid(),
  hours: z.string().regex(AMOUNT_REGEX, "Invalid hours").optional(),
  // Optional: falls back to the company's defaultRepairHourlyRate when omitted.
  hourlyRate: z.string().regex(AMOUNT_REGEX, "Invalid hourly rate").optional(),
  issueDate: z.string().optional(),
  vatRate: z
    .string()
    .regex(AMOUNT_REGEX, "Invalid VAT rate")
    .default(DEFAULT_VAT_RATE),
  description: z.string().min(1).max(500).optional(),
});

export type CreateRepairLaborInvoiceInput = z.input<
  typeof createRepairLaborInvoiceSchema
>;

export function calculateRepairLaborAmount(
  hours: string,
  hourlyRate: string,
): string {
  return new Decimal(hours).times(hourlyRate).toFixed(2);
}

// ============================================================================
// DOCUMENT STATUS TRANSITIONS (SSOT: document-constants.ts)
// ============================================================================

/** @deprecated Use isValidDocumentTransition from document-constants */
export function isValidTransition(from: string, to: string): boolean {
  return isValidDocumentTransition(from, to);
}

// ============================================================================
// TOTALS CALCULATION (decimal.js — money is not a float)
// ============================================================================

export interface CalculatedTotals {
  subtotal: string;
  vatAmount: string;
  total: string;
  itemTotals: string[];
}

/**
 * Calculate line item totals, subtotal, VAT, and grand total.
 * Delegates to the shared document-totals utility (zero DB deps, client-safe).
 * Returns strings for DB persistence.
 */
export function calculateTotals(items: DocumentItemInput[]): CalculatedTotals {
  const normalized = items.map((item) => ({
    quantity: item.quantity || "0",
    unitPrice: item.unitPrice || "0",
    discount: item.discount || "0",
    vatRate: item.vatRate || DEFAULT_VAT_RATE,
  }));

  const { subtotal, vatAmount, total } = calcDocumentTotals(normalized);
  const itemTotals = normalized.map((item) => calcItemNet(item).toFixed(2));

  return {
    subtotal: subtotal.toFixed(2),
    vatAmount: vatAmount.toFixed(2),
    total: total.toFixed(2),
    itemTotals,
  };
}

// ============================================================================
// QR REFERENCE GENERATION (Swiss QR-Bill Legal Requirement)
// ============================================================================

/**
 * Hash a string (company ID) to a fixed-length numeric string.
 * Used to generate unique QR references per company.
 */
function hashToDigits(input: string, length: number): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to positive and pad to desired length
  const digits = Math.abs(hash).toString().padStart(length, "0");
  return digits.slice(0, length);
}

/**
 * Calculate MOD-10 recursive check digit (Swiss QR-bill standard).
 * Algorithm used for QR reference validation.
 */
function calculateMod10CheckDigit(input: string): string {
  const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
  let carry = 0;

  for (let i = 0; i < input.length; i++) {
    const digit = parseInt(input[i], 10);
    carry = table[(carry + digit) % 10];
  }

  return ((10 - carry) % 10).toString();
}

/**
 * Generate Swiss QR reference number for invoices (27 digits with check digit).
 * Format: Company ID hash (10 digits) + Document number (16 digits) + Check digit (1)
 *
 * Swiss QR-bill has been legally required since June 30, 2020, with the grace period
 * ending October 1, 2022. All invoices must include a valid QR reference.
 */
export function generateQRReference(
  companyId: string,
  documentNumber: string,
): string {
  // Generate 10-digit company identifier from company ID hash
  const companyHash = hashToDigits(companyId, 10);

  // Extract numeric part from document number and pad to 16 digits
  // Example: "RE-2026-00123" -> "202600123"
  const numericPart = documentNumber.replace(/\D/g, "");
  const docNum = numericPart.padStart(16, "0").slice(-16);

  // Combine company hash + document number (26 digits)
  const baseReference = companyHash + docNum;

  // Calculate check digit
  const checkDigit = calculateMod10CheckDigit(baseReference);

  // Return 27-digit QR reference
  return baseReference + checkDigit;
}

// ============================================================================
// RESULT TYPES
// ============================================================================

/** Return type of getDocument — document with all relations loaded */
export type DocumentWithRelations = NonNullable<
  Awaited<ReturnType<typeof getDocument>>
>;

/** Single document row as returned in list queries */
export type DocumentListItem = typeof documents.$inferSelect & {
  contact?: { id: string; name: string } | null;
};

// Re-export from client-safe utility (SSOT: packages/core/src/utils/overdue.ts)
export { getOverdueInfo } from "../utils/overdue";

/**
 * Calculate outstanding amount for a document (total - sum of payments).
 * Pure domain function — no DB access, no formatting.
 */
export function calculateOutstandingAmount(doc: {
  total: string;
  payments?: Array<{ amount: string }> | null;
}): Decimal {
  const total = new Decimal(doc.total || "0");
  const paid = (doc.payments || []).reduce(
    (sum: Decimal, p: { amount: string }) =>
      sum.plus(new Decimal(p.amount || "0")),
    new Decimal(0),
  );
  return total.minus(paid);
}

// ============================================================================
// FILTERS
// ============================================================================

export interface DocumentFilters {
  type?: DocumentType;
  status?: DocumentStatus;
  intakeSource?: IntakeSourceValue;
  contactId?: string;
  projectId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "number" | "issueDate" | "dueDate" | "total" | "createdAt";
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// DOMAIN FUNCTIONS
// ============================================================================

/**
 * List documents with pagination, search, and filtering.
 */
export async function listDocuments(
  db: Database,
  companyId: string,
  filters: DocumentFilters = {},
): Promise<
  PaginatedResult<
    typeof documents.$inferSelect & {
      contact?: { id: string; name: string } | null;
    }
  >
> {
  const {
    type,
    status,
    intakeSource,
    contactId,
    projectId,
    search,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 25,
    sortBy = "issueDate",
    sortOrder = "desc",
  } = filters;

  const conditions = [eq(documents.companyId, companyId)];

  if (type) conditions.push(eq(documents.type, type));
  if (intakeSource) conditions.push(eq(documents.intakeSource, intakeSource));
  if (status === "overdue") {
    // Dynamic overdue: past due date AND not paid/cancelled/draft
    conditions.push(
      inArray(documents.status, [...NON_TERMINAL_STATUSES]),
      sql`${documents.dueDate} IS NOT NULL AND ${documents.dueDate} < NOW()`,
    );
  } else if (status) {
    conditions.push(eq(documents.status, status));
  }
  if (contactId) conditions.push(eq(documents.contactId, contactId));
  if (projectId) conditions.push(eq(documents.projectId, projectId));

  if (dateFrom) conditions.push(gte(documents.issueDate, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(documents.issueDate, new Date(dateTo)));

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(ilike(documents.number, term), ilike(documents.notes, term))!,
    );
  }

  const whereClause = and(...conditions);

  // Count
  const [{ total: totalCount }] = await db
    .select({ total: count() })
    .from(documents)
    .where(whereClause);

  // Sort
  const sortColumn =
    {
      number: documents.number,
      issueDate: documents.issueDate,
      dueDate: documents.dueDate,
      total: documents.total,
      createdAt: documents.createdAt,
    }[sortBy] ?? documents.issueDate;

  const orderFn = sortOrder === "asc" ? asc : desc;

  // Query with contact relation
  const data = await db.query.documents.findMany({
    where: whereClause,
    with: {
      contact: {
        columns: { id: true, name: true },
      },
    },
    orderBy: [orderFn(sortColumn)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    data,
    total: totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

/**
 * Get a single document with items, payments, and contact.
 */
export async function getDocument(
  db: Database,
  companyId: string,
  documentId: string,
) {
  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.companyId, companyId),
    ),
    with: {
      contact: true,
      project: true,
      items: {
        with: {
          product: true,
          inventoryItem: { columns: { id: true, category: true } },
        },
        orderBy: [asc(documentItems.position)],
      },
      payments: true,
      convertedFrom: {
        columns: { id: true, type: true, number: true },
      },
    },
  });

  return doc ?? null;
}

/**
 * Create a new document with items. Auto-generates document number and calculates totals.
 * Wraps document + items insertion in a transaction to ensure atomicity.
 */
export async function createDocument(
  db: Database,
  companyId: string,
  userId: string,
  input: CreateDocumentInput,
) {
  const validated = createDocumentSchema.parse(input);

  // Wrap entire operation in transaction for atomicity
  const doc = await db.transaction(async (tx) => {
    // Generate document number
    const number = await getNextNumber(tx, companyId, validated.type);

    // Calculate totals
    const totals = calculateTotals(validated.items);

    // Generate QR reference for invoices (Swiss legal requirement)
    const qrReference =
      validated.type === "invoice"
        ? generateQRReference(companyId, number)
        : null;

    // Auto-calculate dueDate from contact's paymentTermsDays if not provided
    let dueDate: Date | null = validated.dueDate
      ? new Date(validated.dueDate)
      : null;
    if (!dueDate && validated.contactId) {
      const [contact] = await tx
        .select({ paymentTermsDays: contacts.paymentTermsDays })
        .from(contacts)
        .where(
          and(
            eq(contacts.id, validated.contactId),
            eq(contacts.companyId, companyId),
          ),
        );
      if (contact?.paymentTermsDays) {
        const issueDate = validated.issueDate
          ? new Date(validated.issueDate)
          : new Date();
        dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + contact.paymentTermsDays);
      }
    }

    // Insert document
    const [doc] = await tx
      .insert(documents)
      .values({
        companyId,
        type: validated.type,
        status: "draft",
        number,
        contactId: validated.contactId ?? null,
        projectId: validated.projectId ?? null,
        costCenterId: validated.costCenterId ?? null,
        issueDate: validated.issueDate
          ? new Date(validated.issueDate)
          : new Date(),
        dueDate,
        deliveryDate: validated.deliveryDate
          ? new Date(validated.deliveryDate)
          : null,
        currency: validated.currency,
        subtotal: totals.subtotal,
        vatAmount: totals.vatAmount,
        total: totals.total,
        notes: validated.notes ?? null,
        internalNotes: validated.internalNotes ?? null,
        // Intake-specific fields
        intakeSource: validated.intakeSource ?? null,
        donorId: validated.donorId ?? null,
        consignmentRate: validated.consignmentRate ?? null,
        qrReference,
        createdBy: userId,
      })
      .returning();

    // Insert items (in same transaction)
    if (validated.items.length > 0) {
      await tx.insert(documentItems).values(
        validated.items.map((item, index) => ({
          documentId: doc.id,
          productId: item.productId ?? null,
          inventoryItemId: item.inventoryItemId ?? null,
          position: item.position ?? index,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || "0",
          vatRate: item.vatRate || DEFAULT_VAT_RATE,
          total: totals.itemTotals[index],
        })),
      );

      // Auto-mark linked inventory items as sold (for invoices/sales)
      if (
        (SALES_DOCUMENT_TYPES as readonly string[]).includes(validated.type)
      ) {
        for (const item of validated.items) {
          if (item.inventoryItemId) {
            try {
              await sellInventoryItem(tx, companyId, item.inventoryItemId, {
                saleDocumentId: doc.id,
                soldPrice: item.unitPrice,
              });
            } catch (err) {
              logger.warn("Failed to mark inventory item as sold", {
                inventoryItemId: item.inventoryItemId,
                documentId: doc.id,
                error: err instanceof Error ? err.message : String(err),
              });
            }
          }
        }
      }
    }

    return doc;
  });

  // Emit outbound webhook AFTER the transaction commits (post-commit,
  // best-effort, non-blocking). Lives here — not in the caller — so every
  // entry point (dashboard action, /api/v1 route, AI tool) fires identically.
  dispatchWebhookEvent(db, companyId, "document.created", {
    id: doc.id,
    number: doc.number,
    type: doc.type,
    status: doc.status,
    contactId: doc.contactId,
    total: doc.total,
  });

  return doc;
}

/**
 * Get or create a company-scoped service product, keyed by SKU. Service-type
 * products route their invoice revenue to the service revenue account (3200)
 * instead of goods revenue (3000). Used by repair-labor billing and the
 * revamp-it service-sale bridge — one shared helper, one behaviour (DRY).
 */
export async function getOrCreateServiceProduct(
  db: Database,
  companyId: string,
  opts: {
    sku: string;
    name: string;
    description?: string;
    unitPrice: string;
    vatRate: string;
    unit?: string;
  },
): Promise<string> {
  const [existing] = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.companyId, companyId),
        eq(products.sku, opts.sku),
        eq(products.type, "service"),
      ),
    )
    .limit(1);

  if (existing) return existing.id;

  const [created] = await db
    .insert(products)
    .values({
      companyId,
      sku: opts.sku,
      name: opts.name,
      description: opts.description ?? null,
      type: "service",
      unitPrice: opts.unitPrice,
      currency: DEFAULT_CURRENCY,
      vatRate: opts.vatRate,
      unit: opts.unit ?? "unit",
      isActive: true,
      shopVisible: false,
    })
    .returning({ id: products.id });

  return created.id;
}

function getOrCreateRepairLaborProduct(
  db: Database,
  companyId: string,
  hourlyRate: string,
  vatRate: string,
): Promise<string> {
  return getOrCreateServiceProduct(db, companyId, {
    sku: "repair-labor",
    name: "Repair labor",
    description: "Tracked repair labor billed from inventory repairs",
    unitPrice: hourlyRate,
    vatRate,
    unit: "hour",
  });
}

/**
 * Create a draft invoice for tracked repair labor on an inventory item.
 *
 * The line intentionally references a service product, not the inventory item:
 * billing labor must not mark the repaired device as sold. When the invoice is
 * sent, the accounting integration routes the service line to account 3200.
 */
export async function createRepairLaborInvoice(
  db: Database,
  companyId: string,
  userId: string,
  input: CreateRepairLaborInvoiceInput,
) {
  const validated = createRepairLaborInvoiceSchema.parse(input);
  const [item] = await db
    .select({
      id: inventoryItems.id,
      itemNumber: inventoryItems.itemNumber,
      description: inventoryItems.description,
      repairHours: inventoryItems.repairHours,
    })
    .from(inventoryItems)
    .where(
      and(
        eq(inventoryItems.id, validated.itemId),
        eq(inventoryItems.companyId, companyId),
      ),
    )
    .limit(1);

  if (!item) throw new Error("Inventory item not found");

  const hours = validated.hours ?? item.repairHours ?? "0";
  if (new Decimal(hours).lte(0)) {
    throw new Error("No repair hours to invoice");
  }

  // Resolve the rate: explicit input wins, else the company default.
  let hourlyRate = validated.hourlyRate;
  if (!hourlyRate) {
    const [company] = await db
      .select({ settings: companies.settings })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    const settings = (company?.settings as CompanySettings | undefined) ?? {};
    hourlyRate = settings.defaultRepairHourlyRate ?? undefined;
  }
  if (!hourlyRate) {
    throw new Error(
      "No hourly rate provided and no default repair rate configured",
    );
  }

  const productId = await getOrCreateRepairLaborProduct(
    db,
    companyId,
    hourlyRate,
    validated.vatRate,
  );
  const amount = calculateRepairLaborAmount(hours, hourlyRate);
  const description =
    validated.description ??
    `Repair labor ${item.itemNumber}: ${item.description}`;

  return createDocument(db, companyId, userId, {
    type: "invoice",
    contactId: validated.contactId,
    issueDate: validated.issueDate,
    currency: DEFAULT_CURRENCY,
    internalNotes: `Repair labor for inventory item ${item.itemNumber} (${item.id}); amount CHF ${amount}`,
    items: [
      {
        productId,
        position: 0,
        description,
        quantity: hours,
        unitPrice: hourlyRate,
        discount: "0",
        vatRate: validated.vatRate,
      },
    ],
  });
}

/**
 * Extend a quote's validity (dueDate) by a number of days.
 * If the quote has no dueDate, extends from today.
 */
export async function extendQuoteValidity(
  db: Database,
  companyId: string,
  quoteId: string,
  extensionDays: number,
): Promise<{ newDueDate: string }> {
  const [quote] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, quoteId), eq(documents.companyId, companyId)))
    .limit(1);

  if (!quote) throw new Error("Quote not found");
  if (quote.type !== "quote") throw new Error("Document is not a quote");

  const currentDueDate = quote.dueDate ? new Date(quote.dueDate) : new Date();
  const newDueDate = new Date(currentDueDate);
  newDueDate.setDate(newDueDate.getDate() + extensionDays);
  const newDueDateStr = newDueDate.toISOString().split("T")[0];

  await updateDocument(db, companyId, quoteId, { dueDate: newDueDateStr });
  return { newDueDate: newDueDateStr };
}

/**
 * Update a document (only drafts can be fully edited).
 * For non-draft documents, only notes/internalNotes can be updated.
 * Uses transaction when updating items to ensure atomicity.
 */
export async function updateDocument(
  db: Database,
  companyId: string,
  documentId: string,
  input: UpdateDocumentInput,
) {
  const validated = updateDocumentSchema.parse(input);

  // Get existing document
  const existing = await db
    .select()
    .from(documents)
    .where(
      and(eq(documents.id, documentId), eq(documents.companyId, companyId)),
    )
    .limit(1);

  if (existing.length === 0) {
    throw new Error("Document not found");
  }

  const doc = existing[0];

  // Only drafts can have items/contact/dates modified
  if (doc.status !== "draft") {
    // Non-draft: only allow notes updates (no transaction needed)
    const [updated] = await db
      .update(documents)
      .set({
        notes: validated.notes !== undefined ? validated.notes : doc.notes,
        internalNotes:
          validated.internalNotes !== undefined
            ? validated.internalNotes
            : doc.internalNotes,
        updatedAt: new Date(),
      })
      .where(
        and(eq(documents.id, documentId), eq(documents.companyId, companyId)),
      )
      .returning();

    return updated;
  }

  // Draft: full update (wrap in transaction if items are being updated)
  const items = validated.items;
  if (items) {
    return db.transaction(async (tx) => {
      const updateValues: Record<string, unknown> = { updatedAt: new Date() };

      if (validated.contactId !== undefined)
        updateValues.contactId = validated.contactId;
      if (validated.projectId !== undefined)
        updateValues.projectId = validated.projectId;
      if (validated.issueDate)
        updateValues.issueDate = new Date(validated.issueDate);
      if (validated.dueDate !== undefined)
        updateValues.dueDate = validated.dueDate
          ? new Date(validated.dueDate)
          : null;
      if (validated.deliveryDate !== undefined)
        updateValues.deliveryDate = validated.deliveryDate
          ? new Date(validated.deliveryDate)
          : null;
      if (validated.currency) updateValues.currency = validated.currency;
      if (validated.notes !== undefined) updateValues.notes = validated.notes;
      if (validated.internalNotes !== undefined)
        updateValues.internalNotes = validated.internalNotes;
      if (validated.consignmentRate !== undefined)
        updateValues.consignmentRate = validated.consignmentRate;

      // Recalculate totals
      const totals = calculateTotals(items);
      updateValues.subtotal = totals.subtotal;
      updateValues.vatAmount = totals.vatAmount;
      updateValues.total = totals.total;

      // Delete existing items and re-insert (in same transaction)
      await tx
        .delete(documentItems)
        .where(eq(documentItems.documentId, documentId));
      await tx.insert(documentItems).values(
        items.map((item, index) => ({
          documentId,
          productId: item.productId ?? null,
          inventoryItemId: item.inventoryItemId ?? null,
          position: item.position ?? index,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || "0",
          vatRate: item.vatRate || DEFAULT_VAT_RATE,
          total: totals.itemTotals[index],
        })),
      );

      const [updated] = await tx
        .update(documents)
        .set(updateValues)
        .where(
          and(eq(documents.id, documentId), eq(documents.companyId, companyId)),
        )
        .returning();

      return updated;
    });
  }

  // No items update: simple field updates (no transaction needed)
  const updateValues: Record<string, unknown> = { updatedAt: new Date() };

  if (validated.contactId !== undefined)
    updateValues.contactId = validated.contactId;
  if (validated.projectId !== undefined)
    updateValues.projectId = validated.projectId;
  if (validated.issueDate)
    updateValues.issueDate = new Date(validated.issueDate);
  if (validated.dueDate !== undefined)
    updateValues.dueDate = validated.dueDate
      ? new Date(validated.dueDate)
      : null;
  if (validated.deliveryDate !== undefined)
    updateValues.deliveryDate = validated.deliveryDate
      ? new Date(validated.deliveryDate)
      : null;
  if (validated.currency) updateValues.currency = validated.currency;
  if (validated.notes !== undefined) updateValues.notes = validated.notes;
  if (validated.internalNotes !== undefined)
    updateValues.internalNotes = validated.internalNotes;
  if (validated.consignmentRate !== undefined)
    updateValues.consignmentRate = validated.consignmentRate;

  const [updated] = await db
    .update(documents)
    .set(updateValues)
    .where(
      and(eq(documents.id, documentId), eq(documents.companyId, companyId)),
    )
    .returning();

  return updated;
}

// ============================================================================
// STATUS TRANSITION SIDE EFFECTS (extracted for readability)
// ============================================================================

/** Create journal entries triggered by status transitions */
async function handleJournalEntries(
  tx: Database,
  companyId: string,
  doc: {
    id: string;
    type: string;
    status: string;
    total: string;
    subtotal: string;
    vatAmount: string;
    issueDate: Date;
    number: string;
    currency: string;
    costCenterId?: string | null;
  },
  newStatus: DocumentStatus,
) {
  if (newStatus === "sent" && doc.type === "invoice") {
    await createInvoiceSentJournalEntry(tx, companyId, doc);
    // Consignment (principal model): additionally recognize the consignor's
    // share of any consigned items sold on this invoice. Additive to the entry
    // above — revenue and VAT are untouched. No-op for normal invoices.
    await handleConsignmentSettlement(tx, companyId, doc);
  } else if (newStatus === "sent" && doc.type === "credit_note") {
    await createCreditNoteSentJournalEntry(tx, companyId, doc);
  } else if (newStatus === "confirmed" && doc.type === "purchase_invoice") {
    await createPurchaseInvoiceJournalEntry(tx, companyId, doc);
  } else if (
    newStatus === "cancelled" &&
    (PAYABLE_DOCUMENT_TYPES as readonly string[]).includes(doc.type)
  ) {
    if ((NON_TERMINAL_STATUSES as readonly string[]).includes(doc.status)) {
      await createCancellationReversalJournalEntry(tx, companyId, doc);
    }
  }
}

/**
 * Recognize consignor payables for consigned items sold on an invoice.
 *
 * For each line linked to an inventory item with consignmentRate > 0, the
 * consignor's share = line NET amount × consignmentRate / 100 (rounded to 2dp,
 * per Swiss line-level rounding). We use the NET (pre-VAT) line amount because
 * revenue is booked net. Shares are summed across lines and, if positive, a
 * single settlement entry (Dr 4200 / Cr 2140) is created in the same tx.
 *
 * consignmentRate is stored as a percentage (e.g. 70.00 → 70%), so we divide
 * by 100.
 */
async function handleConsignmentSettlement(
  tx: Database,
  companyId: string,
  doc: { id: string; number: string; issueDate: Date },
) {
  const rows = await tx
    .select({
      lineNet: documentItems.total,
      consignmentRate: inventoryItems.consignmentRate,
      itemNumber: inventoryItems.itemNumber,
    })
    .from(documentItems)
    .innerJoin(
      inventoryItems,
      eq(documentItems.inventoryItemId, inventoryItems.id),
    )
    .where(
      and(
        eq(documentItems.documentId, doc.id),
        eq(inventoryItems.companyId, companyId),
      ),
    );

  let consignorShare = new Decimal(0);
  const itemNumbers: string[] = [];

  for (const row of rows) {
    const rate = new Decimal(row.consignmentRate || "0");
    if (rate.lte(0)) continue;

    const share = new Decimal(row.lineNet || "0")
      .times(rate)
      .div(100)
      .toDecimalPlaces(2);
    if (share.lte(0)) continue;

    consignorShare = consignorShare.plus(share);
    itemNumbers.push(row.itemNumber);
  }

  if (consignorShare.lte(0)) return;

  await createConsignmentSettlementJournalEntry(tx, companyId, {
    saleDocId: doc.id,
    reference: doc.number,
    date: doc.issueDate,
    consignorShare: consignorShare.toFixed(2),
    itemNumbers,
  });
}

/** Create inventory items when intake or purchase invoice is confirmed */
async function handleInventoryItemCreation(
  tx: Database,
  companyId: string,
  doc: {
    id: string;
    type: string;
    contactId: string | null;
    donorId: string | null;
    consignmentRate: string | null;
  },
  newStatus: DocumentStatus,
) {
  if (doc.type === "intake" && newStatus === "confirmed") {
    await createInventoryItemsFromIntake(tx, companyId, {
      id: doc.id,
      contactId: doc.contactId,
      donorId: doc.donorId ?? null,
      consignmentRate: doc.consignmentRate ?? null,
    });
  }
  if (doc.type === "purchase_invoice" && newStatus === "confirmed") {
    await createInventoryItemsFromPurchaseInvoice(tx, companyId, {
      id: doc.id,
      contactId: doc.contactId,
    });
  }
}

/** Reverse inventory item sales when a credit note is sent */
async function handleCreditNoteReversal(
  tx: Database,
  companyId: string,
  doc: { id: string; type: string },
  newStatus: DocumentStatus,
) {
  if (doc.type !== "credit_note" || newStatus !== "sent") return;

  const creditItems = await tx
    .select()
    .from(documentItems)
    .where(eq(documentItems.documentId, doc.id));

  for (const ci of creditItems) {
    if (ci.inventoryItemId) {
      try {
        await returnInventoryItem(tx, companyId, ci.inventoryItemId);
      } catch (err) {
        logger.warn("Failed to return inventory item for credit note", {
          inventoryItemId: ci.inventoryItemId,
          documentId: doc.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}

/**
 * Update document status with transition validation.
 */
export async function updateDocumentStatus(
  db: Database,
  companyId: string,
  documentId: string,
  newStatus: DocumentStatus,
) {
  const existing = await db
    .select()
    .from(documents)
    .where(
      and(eq(documents.id, documentId), eq(documents.companyId, companyId)),
    )
    .limit(1);

  if (existing.length === 0) {
    throw new Error("Document not found");
  }

  const doc = existing[0];

  if (!isValidTransition(doc.status, newStatus)) {
    throw new DomainError(
      "cannotTransition",
      { from: doc.status, to: newStatus },
      `Cannot transition from "${doc.status}" to "${newStatus}"`,
    );
  }

  const updateValues: Record<string, unknown> = {
    status: newStatus,
    updatedAt: new Date(),
  };

  // Set paidDate when marking as paid
  if (newStatus === "paid") {
    updateValues.paidDate = new Date();
  }

  // Wrap status update + journal entry in a transaction so they're atomic.
  // If journal entry creation fails, the status update is rolled back.
  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(documents)
      .set(updateValues)
      .where(
        and(eq(documents.id, documentId), eq(documents.companyId, companyId)),
      )
      .returning();

    // Side effects: journal entries, stock movements, inventory items — all atomic
    await handleJournalEntries(tx, companyId, doc, newStatus);
    await createStockMovementsForDocument(tx, companyId, doc, newStatus);
    await updateStockReservationsForDocument(tx, companyId, doc, newStatus);
    await handleInventoryItemCreation(tx, companyId, doc, newStatus);
    await handleCreditNoteReversal(tx, companyId, doc, newStatus);

    return row;
  });

  // Post-commit, best-effort webhook. Emitted here so all callers inherit it.
  dispatchWebhookEvent(db, companyId, "document.status_changed", {
    id: updated.id,
    number: updated.number,
    type: updated.type,
    status: updated.status,
    contactId: updated.contactId,
  });

  return updated;
}

/**
 * Delete a document (only drafts can be deleted).
 */
export async function deleteDocument(
  db: Database,
  companyId: string,
  documentId: string,
) {
  const existing = await db
    .select()
    .from(documents)
    .where(
      and(eq(documents.id, documentId), eq(documents.companyId, companyId)),
    )
    .limit(1);

  if (existing.length === 0) {
    throw new Error("Document not found");
  }

  if (existing[0].status !== "draft") {
    throw new DomainError(
      "onlyDraftCanBeDeleted",
      undefined,
      "Only draft documents can be deleted",
    );
  }

  // Items and payments cascade-delete via FK
  await db
    .delete(documents)
    .where(
      and(eq(documents.id, documentId), eq(documents.companyId, companyId)),
    );

  return existing[0];
}

/**
 * Record a payment against a document.
 * Auto-updates document status to paid/partially_paid.
 * Wraps payment insertion + status update in a transaction for atomicity.
 */
export async function recordPayment(
  db: Database,
  companyId: string,
  documentId: string,
  input: {
    amount: string;
    date: string;
    method?: PaymentMethodValue;
    reference?: string;
    bankTransactionId?: string;
  },
) {
  // Verify document (outside transaction - read-only)
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(eq(documents.id, documentId), eq(documents.companyId, companyId)),
    )
    .limit(1);

  if (!doc) {
    throw new Error("Document not found");
  }

  // Only invoices and purchase invoices can receive payments
  const payableTypes = PAYABLE_DOCUMENT_TYPES as readonly string[];
  if (!payableTypes.includes(doc.type)) {
    throw new DomainError(
      "cannotRecordPaymentWrongType",
      { type: doc.type },
      `Cannot record payment for a ${doc.type} document`,
    );
  }

  if (doc.status === "draft" || doc.status === "cancelled") {
    throw new DomainError(
      "cannotRecordPaymentWrongStatus",
      { status: doc.status },
      `Cannot record payment for a ${doc.status} document`,
    );
  }

  // Idempotency check: skip if payment with same bankTransactionId already
  // exists ON THIS DOCUMENT. Scoping by documentId — already verified to
  // belong to companyId above — prevents cross-tenant payment lookups.
  if (input.bankTransactionId) {
    // Verify bankTransaction belongs to this company FIRST, before any lookup,
    // so an attacker cannot probe for the existence of cross-tenant bank
    // transactions via this code path.
    const [txn] = await db
      .select({ companyId: bankAccounts.companyId })
      .from(bankTransactions)
      .innerJoin(
        bankAccounts,
        eq(bankTransactions.bankAccountId, bankAccounts.id),
      )
      .where(eq(bankTransactions.id, input.bankTransactionId))
      .limit(1);
    if (!txn || txn.companyId !== companyId) {
      throw new Error("Bank transaction not found");
    }

    const [existing] = await db
      .select({ id: documentPayments.id })
      .from(documentPayments)
      .where(
        and(
          eq(documentPayments.bankTransactionId, input.bankTransactionId),
          eq(documentPayments.documentId, documentId),
        ),
      )
      .limit(1);
    if (existing) {
      return existing;
    }
  }

  // Wrap payment + status update in transaction
  const payment = await db.transaction(async (tx) => {
    // Validate: payment must not exceed remaining balance
    const existingPayments = await tx
      .select({
        totalPaid: sql<string>`COALESCE(SUM(${documentPayments.amount}::numeric), 0)`,
      })
      .from(documentPayments)
      .where(eq(documentPayments.documentId, documentId));

    const alreadyPaid = new Decimal(existingPayments[0]?.totalPaid || "0");
    const docTotal = new Decimal(doc.total);
    const remaining = docTotal.minus(alreadyPaid);
    const paymentAmount = new Decimal(input.amount);

    if (paymentAmount.gt(remaining)) {
      throw new DomainError(
        "cannotRecordPaymentExceedsBalance",
        { amount: input.amount, remaining: remaining.toFixed(2) },
        `Cannot record payment: amount ${input.amount} exceeds remaining balance ${remaining.toFixed(2)}`,
      );
    }

    // Insert payment
    const [payment] = await tx
      .insert(documentPayments)
      .values({
        documentId,
        amount: input.amount,
        date: new Date(input.date),
        method: input.method ?? "bank_transfer",
        reference: input.reference ?? null,
        bankTransactionId: input.bankTransactionId ?? null,
      })
      .returning();

    const totalPaid = alreadyPaid.plus(paymentAmount);

    // Update document status (in same transaction)
    let newStatus: DocumentStatus;
    if (totalPaid.gte(docTotal)) {
      newStatus = "paid";
    } else {
      newStatus = "partially_paid";
    }

    await tx
      .update(documents)
      .set({
        status: newStatus,
        paidDate: newStatus === "paid" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(documents.id, documentId), eq(documents.companyId, companyId)),
      );

    // Auto-create journal entry for the payment.
    // If this fails, the entire transaction rolls back (accounting must stay consistent).
    await createPaymentReceivedJournalEntry(tx, companyId, doc, {
      amount: input.amount,
      date: new Date(input.date),
    });

    return payment;
  });

  // Post-commit, best-effort webhook. Emitted here so all callers (dashboard,
  // /api/v1 payments route, bank reconciliation, AI tool) fire identically.
  dispatchWebhookEvent(db, companyId, "payment.received", {
    paymentId: payment.id,
    documentId,
    amount: input.amount,
    method: input.method ?? "bank_transfer",
    date: input.date,
  });

  return payment;
}

/**
 * Convert a document to another type (e.g., Quote → Order → Invoice).
 * Creates a copy with new type, number, and links to the original via convertedFromId.
 * Wraps document + items creation in a transaction for atomicity.
 */
export async function convertDocument(
  db: Database,
  companyId: string,
  userId: string,
  sourceDocumentId: string,
  targetType: DocumentType,
) {
  // Get the source document with items (outside transaction - read-only)
  const source = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, sourceDocumentId),
      eq(documents.companyId, companyId),
    ),
    with: {
      items: true,
    },
  });

  if (!source) {
    throw new Error("Source document not found");
  }

  // Validate conversion path (SSOT: document-conversions.ts)
  const allowed = VALID_CONVERSIONS[source.type] ?? [];
  if (!allowed.includes(targetType)) {
    throw new DomainError(
      "cannotConvert",
      { from: source.type, to: targetType },
      `Cannot convert ${source.type} to ${targetType}`,
    );
  }

  // Wrap conversion in transaction
  return db.transaction(async (tx) => {
    // Generate new number
    const number = await getNextNumber(tx, companyId, targetType);

    // Generate QR reference if converting to invoice
    const qrReference = (QR_REFERENCE_TYPES as readonly string[]).includes(
      targetType,
    )
      ? generateQRReference(companyId, number)
      : null;

    // Create new document
    const [newDoc] = await tx
      .insert(documents)
      .values({
        companyId,
        type: targetType,
        status: "draft",
        number,
        contactId: source.contactId,
        projectId: source.projectId,
        issueDate: new Date(),
        dueDate: null, // User should set for the new document
        deliveryDate: null,
        currency: source.currency,
        subtotal: source.subtotal,
        vatAmount: source.vatAmount,
        total: source.total,
        notes: source.notes,
        internalNotes: null,
        qrReference,
        convertedFromId: source.id,
        createdBy: userId,
      })
      .returning();

    // Copy items (in same transaction). Preserve inventoryItemId so credit notes
    // can reverse inventory item sales back to "returned" status.
    if (source.items.length > 0) {
      await tx.insert(documentItems).values(
        source.items.map((item) => ({
          documentId: newDoc.id,
          productId: item.productId,
          inventoryItemId: item.inventoryItemId,
          position: item.position,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          vatRate: item.vatRate,
          total: item.total,
        })),
      );
    }

    return newDoc;
  });
}

/**
 * Duplicate a document as a new draft of the same type.
 * Copies all line items, contact, project, notes. Resets status to draft.
 */
export async function duplicateDocument(
  db: Database,
  companyId: string,
  userId: string,
  sourceDocumentId: string,
) {
  const source = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, sourceDocumentId),
      eq(documents.companyId, companyId),
    ),
    with: { items: true },
  });

  if (!source) {
    throw new Error("Source document not found");
  }

  return db.transaction(async (tx) => {
    const number = await getNextNumber(tx, companyId, source.type);

    const qrReference = (QR_REFERENCE_TYPES as readonly string[]).includes(
      source.type,
    )
      ? generateQRReference(companyId, number)
      : null;

    const [newDoc] = await tx
      .insert(documents)
      .values({
        companyId,
        type: source.type,
        status: "draft",
        number,
        contactId: source.contactId,
        projectId: source.projectId,
        issueDate: new Date(),
        dueDate: null,
        deliveryDate: null,
        currency: source.currency,
        subtotal: source.subtotal,
        vatAmount: source.vatAmount,
        total: source.total,
        notes: source.notes,
        internalNotes: source.internalNotes,
        qrReference,
        createdBy: userId,
      })
      .returning();

    if (source.items.length > 0) {
      await tx.insert(documentItems).values(
        source.items.map((item) => ({
          documentId: newDoc.id,
          productId: item.productId,
          position: item.position,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          vatRate: item.vatRate,
          total: item.total,
        })),
      );
    }

    return newDoc;
  });
}

/**
 * Get financial summary for a company — used by dashboard and AI.
 */
export async function getFinancialSummary(
  db: Database,
  companyId: string,
  sinceDate?: Date,
) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Revenue this month (paid invoices)
  const [monthlyRevenue] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
      count: count(),
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, "invoice"),
        eq(documents.status, "paid"),
        gte(documents.paidDate, startOfMonth),
      ),
    );

  // Revenue this year
  const [yearlyRevenue] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, "invoice"),
        eq(documents.status, "paid"),
        gte(documents.paidDate, startOfYear),
      ),
    );

  // Outstanding invoices (sent/confirmed/delivered/partially_paid)
  const [outstanding] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
      count: count(),
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, "invoice"),
        inArray(documents.status, [...OPEN_STATUSES]),
        sinceDate ? gte(documents.issueDate, sinceDate) : undefined,
      ),
    );

  // Overdue — dynamically calculated: past due date AND not paid/cancelled/draft
  const [overdue] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
      count: count(),
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, "invoice"),
        inArray(documents.status, [...NON_TERMINAL_STATUSES]),
        sql`${documents.dueDate} IS NOT NULL AND ${documents.dueDate} < NOW()`,
        sinceDate ? gte(documents.issueDate, sinceDate) : undefined,
      ),
    );

  // Draft invoices
  const [drafts] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
      count: count(),
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, "invoice"),
        eq(documents.status, "draft"),
      ),
    );

  return {
    revenueThisMonth: new Decimal(monthlyRevenue.total || "0").toNumber(),
    revenueThisMonthCount: monthlyRevenue.count,
    revenueThisYear: new Decimal(yearlyRevenue.total || "0").toNumber(),
    outstandingTotal: new Decimal(outstanding.total || "0").toNumber(),
    outstandingCount: outstanding.count,
    overdueTotal: new Decimal(overdue.total || "0").toNumber(),
    overdueCount: overdue.count,
    draftsTotal: new Decimal(drafts.total || "0").toNumber(),
    draftsCount: drafts.count,
  };
}

/**
 * Get document summary stats for the document hub page.
 * Calculates total count, open amount, and overdue count.
 */
export async function getDocumentSummary(
  db: Database,
  companyId: string,
  type?: DocumentType,
): Promise<{
  totalCount: number;
  openAmount: string;
  overdueCount: number;
}> {
  const baseFilters = [eq(documents.companyId, companyId)];
  if (type) baseFilters.push(eq(documents.type, type));

  const [row] = await db
    .select({
      totalCount: count(),
      openAmount: sum(
        sql`CASE WHEN ${documents.status} IN (${sql.join(
          OPEN_STATUSES.map((s) => sql`${s}`),
          sql`, `,
        )}) THEN ${documents.total} ELSE 0 END`,
      ),
      overdueCount: count(
        sql`CASE WHEN ${documents.status} IN (${sql.join(
          NON_TERMINAL_STATUSES.map((s) => sql`${s}`),
          sql`, `,
        )}) AND ${documents.dueDate} < NOW() THEN 1 END`,
      ),
    })
    .from(documents)
    .where(and(...baseFilters));

  return {
    totalCount: row?.totalCount ?? 0,
    openAmount: row?.openAmount ?? "0",
    overdueCount: row?.overdueCount ?? 0,
  };
}
