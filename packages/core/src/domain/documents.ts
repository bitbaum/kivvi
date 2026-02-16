import { z } from 'zod';
import Decimal from 'decimal.js';
import { eq, and, or, ilike, gte, lte, desc, asc, sql, count } from 'drizzle-orm';
import {
  documents,
  documentItems,
  documentPayments,
} from '@kivvi/database';
import type { Database, DocumentType, DocumentStatus } from '@kivvi/database';
import type { PaginatedResult } from './contacts';
import { rappenRound } from '../utils/swiss-currency';
import { getNextNumber } from './number-sequences';
import {
  createInvoiceSentJournalEntry,
  createPurchaseInvoiceJournalEntry,
  createPaymentReceivedJournalEntry,
} from './accounting-integration';
import { DEFAULT_VAT_RATE } from '../config/vat-rates';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const documentItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  position: z.number().int().min(0),
  description: z.string().min(1, 'Description is required'),
  quantity: z.string().regex(/^\d+(\.\d{1,4})?$/, 'Invalid quantity'),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid unit price'),
  discount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid discount').default('0'),
  vatRate: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid VAT rate').default(DEFAULT_VAT_RATE),
});

export const createDocumentSchema = z.object({
  type: z.enum([
    'quote', 'order', 'order_confirmation', 'delivery_note',
    'invoice', 'credit_note', 'purchase_order', 'purchase_invoice', 'dunning',
  ]),
  contactId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  issueDate: z.string().optional(), // ISO date string
  dueDate: z.string().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  currency: z.string().default('CHF'),
  notes: z.string().max(5000).optional().nullable(),
  internalNotes: z.string().max(5000).optional().nullable(),
  items: z.array(documentItemSchema).min(1, 'At least one line item is required'),
});

export const updateDocumentSchema = z.object({
  contactId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  currency: z.string().optional(),
  notes: z.string().max(5000).optional().nullable(),
  internalNotes: z.string().max(5000).optional().nullable(),
  items: z.array(documentItemSchema).min(1, 'At least one line item is required').optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type DocumentItemInput = z.infer<typeof documentItemSchema>;

// ============================================================================
// DOCUMENT STATUS TRANSITIONS
// ============================================================================

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['confirmed', 'paid', 'partially_paid', 'overdue', 'cancelled'],
  confirmed: ['delivered', 'paid', 'partially_paid', 'overdue', 'cancelled'],
  delivered: ['paid', 'partially_paid', 'overdue', 'cancelled'],
  partially_paid: ['paid', 'overdue', 'cancelled'],
  overdue: ['paid', 'partially_paid', 'dunning_1', 'cancelled'],
  dunning_1: ['paid', 'partially_paid', 'dunning_2', 'cancelled'],
  dunning_2: ['paid', 'partially_paid', 'dunning_3', 'cancelled'],
  dunning_3: ['paid', 'partially_paid', 'cancelled'],
  paid: [],
  cancelled: [],
};

export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
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
 * Uses decimal.js for exact arithmetic. Rounds per line item (Swiss standard).
 */
export function calculateTotals(items: DocumentItemInput[]): CalculatedTotals {
  let subtotal = new Decimal(0);
  let vatAmount = new Decimal(0);
  const itemTotals: string[] = [];

  for (const item of items) {
    const qty = new Decimal(item.quantity || '0');
    const price = new Decimal(item.unitPrice || '0');
    const discountPct = new Decimal(item.discount || '0');
    const vatPct = new Decimal(item.vatRate || DEFAULT_VAT_RATE);

    const lineGross = qty.times(price);
    const discountAmount = lineGross.times(discountPct).div(100);
    // Round line net to 2dp
    const lineNet = lineGross.minus(discountAmount).toDecimalPlaces(2);
    // Round VAT per line to 2dp (Swiss standard)
    const lineVat = lineNet.times(vatPct).div(100).toDecimalPlaces(2);

    subtotal = subtotal.plus(lineNet);
    vatAmount = vatAmount.plus(lineVat);
    itemTotals.push(lineNet.toFixed(2));
  }

  // Rappen-round the final total for CHF
  const rawTotal = subtotal.plus(vatAmount);
  const total = rappenRound(rawTotal);

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
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to positive and pad to desired length
  const digits = Math.abs(hash).toString().padStart(length, '0');
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
export function generateQRReference(companyId: string, documentNumber: string): string {
  // Generate 10-digit company identifier from company ID hash
  const companyHash = hashToDigits(companyId, 10);

  // Extract numeric part from document number and pad to 16 digits
  // Example: "RE-2026-00123" -> "202600123"
  const numericPart = documentNumber.replace(/\D/g, '');
  const docNum = numericPart.padStart(16, '0').slice(-16);

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
export type DocumentWithRelations = NonNullable<Awaited<ReturnType<typeof getDocument>>>;

/** Single document row as returned in list queries */
export type DocumentListItem = typeof documents.$inferSelect & { contact?: { id: string; name: string } | null };

/**
 * Calculate overdue status for a document.
 * Business logic extracted from components to avoid duplication.
 */
export function getOverdueInfo(doc: { status: string; dueDate: Date | string | null }): {
  isOverdue: boolean;
  daysOverdue: number;
} {
  const isOverdue =
    doc.status !== 'paid' &&
    doc.status !== 'cancelled' &&
    doc.status !== 'draft' &&
    !!doc.dueDate &&
    new Date(doc.dueDate) < new Date();

  const daysOverdue =
    isOverdue && doc.dueDate
      ? Math.floor((Date.now() - new Date(doc.dueDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  return { isOverdue, daysOverdue };
}

// ============================================================================
// FILTERS
// ============================================================================

export interface DocumentFilters {
  type?: DocumentType;
  status?: DocumentStatus;
  contactId?: string;
  projectId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'number' | 'issueDate' | 'dueDate' | 'total' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
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
  filters: DocumentFilters = {}
): Promise<PaginatedResult<typeof documents.$inferSelect & { contact?: { id: string; name: string } | null }>> {
  const {
    type,
    status,
    contactId,
    projectId,
    search,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 25,
    sortBy = 'issueDate',
    sortOrder = 'desc',
  } = filters;

  const conditions = [eq(documents.companyId, companyId)];

  if (type) conditions.push(eq(documents.type, type));
  if (status) conditions.push(eq(documents.status, status));
  if (contactId) conditions.push(eq(documents.contactId, contactId));
  if (projectId) conditions.push(eq(documents.projectId, projectId));

  if (dateFrom) conditions.push(gte(documents.issueDate, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(documents.issueDate, new Date(dateTo)));

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(documents.number, term),
        ilike(documents.notes, term),
      )!
    );
  }

  const whereClause = and(...conditions);

  // Count
  const [{ total: totalCount }] = await db
    .select({ total: count() })
    .from(documents)
    .where(whereClause);

  // Sort
  const sortColumn = {
    number: documents.number,
    issueDate: documents.issueDate,
    dueDate: documents.dueDate,
    total: documents.total,
    createdAt: documents.createdAt,
  }[sortBy] ?? documents.issueDate;

  const orderFn = sortOrder === 'asc' ? asc : desc;

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
  documentId: string
) {
  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.companyId, companyId)
    ),
    with: {
      contact: true,
      project: true,
      items: {
        with: { product: true },
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
  input: CreateDocumentInput
) {
  const validated = createDocumentSchema.parse(input);

  // Wrap entire operation in transaction for atomicity
  return db.transaction(async (tx) => {
    // Generate document number
    const number = await getNextNumber(tx, companyId, validated.type);

    // Calculate totals
    const totals = calculateTotals(validated.items);

    // Generate QR reference for invoices (Swiss legal requirement)
    const qrReference = validated.type === 'invoice'
      ? generateQRReference(companyId, number)
      : null;

    // Insert document
    const [doc] = await tx
      .insert(documents)
      .values({
        companyId,
        type: validated.type,
        status: 'draft',
        number,
        contactId: validated.contactId ?? null,
        projectId: validated.projectId ?? null,
        issueDate: validated.issueDate ? new Date(validated.issueDate) : new Date(),
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
        deliveryDate: validated.deliveryDate ? new Date(validated.deliveryDate) : null,
        currency: validated.currency,
        subtotal: totals.subtotal,
        vatAmount: totals.vatAmount,
        total: totals.total,
        notes: validated.notes ?? null,
        internalNotes: validated.internalNotes ?? null,
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
          position: item.position ?? index,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || '0',
          vatRate: item.vatRate || DEFAULT_VAT_RATE,
          total: totals.itemTotals[index],
        }))
      );
    }

    return doc;
  });
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
  input: UpdateDocumentInput
) {
  const validated = updateDocumentSchema.parse(input);

  // Get existing document
  const existing = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.companyId, companyId)))
    .limit(1);

  if (existing.length === 0) {
    throw new Error('Document not found');
  }

  const doc = existing[0];

  // Only drafts can have items/contact/dates modified
  if (doc.status !== 'draft') {
    // Non-draft: only allow notes updates (no transaction needed)
    const [updated] = await db
      .update(documents)
      .set({
        notes: validated.notes !== undefined ? validated.notes : doc.notes,
        internalNotes: validated.internalNotes !== undefined ? validated.internalNotes : doc.internalNotes,
        updatedAt: new Date(),
      })
      .where(and(
        eq(documents.id, documentId),
        eq(documents.companyId, companyId)
      ))
      .returning();

    return updated;
  }

  // Draft: full update (wrap in transaction if items are being updated)
  const items = validated.items;
  if (items) {
    return db.transaction(async (tx) => {
      const updateValues: Record<string, unknown> = { updatedAt: new Date() };

      if (validated.contactId !== undefined) updateValues.contactId = validated.contactId;
      if (validated.projectId !== undefined) updateValues.projectId = validated.projectId;
      if (validated.issueDate) updateValues.issueDate = new Date(validated.issueDate);
      if (validated.dueDate !== undefined) updateValues.dueDate = validated.dueDate ? new Date(validated.dueDate) : null;
      if (validated.deliveryDate !== undefined) updateValues.deliveryDate = validated.deliveryDate ? new Date(validated.deliveryDate) : null;
      if (validated.currency) updateValues.currency = validated.currency;
      if (validated.notes !== undefined) updateValues.notes = validated.notes;
      if (validated.internalNotes !== undefined) updateValues.internalNotes = validated.internalNotes;

      // Recalculate totals
      const totals = calculateTotals(items);
      updateValues.subtotal = totals.subtotal;
      updateValues.vatAmount = totals.vatAmount;
      updateValues.total = totals.total;

      // Delete existing items and re-insert (in same transaction)
      await tx.delete(documentItems).where(eq(documentItems.documentId, documentId));
      await tx.insert(documentItems).values(
        items.map((item, index) => ({
          documentId,
          productId: item.productId ?? null,
          position: item.position ?? index,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || '0',
          vatRate: item.vatRate || DEFAULT_VAT_RATE,
          total: totals.itemTotals[index],
        }))
      );

      const [updated] = await tx
        .update(documents)
        .set(updateValues)
        .where(and(
          eq(documents.id, documentId),
          eq(documents.companyId, companyId)
        ))
        .returning();

      return updated;
    });
  }

  // No items update: simple field updates (no transaction needed)
  const updateValues: Record<string, unknown> = { updatedAt: new Date() };

  if (validated.contactId !== undefined) updateValues.contactId = validated.contactId;
  if (validated.projectId !== undefined) updateValues.projectId = validated.projectId;
  if (validated.issueDate) updateValues.issueDate = new Date(validated.issueDate);
  if (validated.dueDate !== undefined) updateValues.dueDate = validated.dueDate ? new Date(validated.dueDate) : null;
  if (validated.deliveryDate !== undefined) updateValues.deliveryDate = validated.deliveryDate ? new Date(validated.deliveryDate) : null;
  if (validated.currency) updateValues.currency = validated.currency;
  if (validated.notes !== undefined) updateValues.notes = validated.notes;
  if (validated.internalNotes !== undefined) updateValues.internalNotes = validated.internalNotes;

  const [updated] = await db
    .update(documents)
    .set(updateValues)
    .where(and(
      eq(documents.id, documentId),
      eq(documents.companyId, companyId)
    ))
    .returning();

  return updated;
}

/**
 * Update document status with transition validation.
 */
export async function updateDocumentStatus(
  db: Database,
  companyId: string,
  documentId: string,
  newStatus: DocumentStatus
) {
  const existing = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.companyId, companyId)))
    .limit(1);

  if (existing.length === 0) {
    throw new Error('Document not found');
  }

  const doc = existing[0];

  if (!isValidTransition(doc.status, newStatus)) {
    throw new Error(`Cannot transition from "${doc.status}" to "${newStatus}"`);
  }

  const updateValues: Record<string, unknown> = {
    status: newStatus,
    updatedAt: new Date(),
  };

  // Set paidDate when marking as paid
  if (newStatus === 'paid') {
    updateValues.paidDate = new Date();
  }

  const [updated] = await db
    .update(documents)
    .set(updateValues)
    .where(and(
      eq(documents.id, documentId),
      eq(documents.companyId, companyId)
    ))
    .returning();

  // Auto-create journal entries for status transitions
  try {
    if (newStatus === 'sent' && doc.type === 'invoice') {
      await createInvoiceSentJournalEntry(db, companyId, doc);
    } else if (newStatus === 'confirmed' && doc.type === 'purchase_invoice') {
      await createPurchaseInvoiceJournalEntry(db, companyId, doc);
    }
  } catch (e) {
    // Log but don't fail the status update if journal entry creation fails
    // (e.g. chart of accounts not set up yet)
    console.error('Auto journal entry failed:', e);
  }

  return updated;
}

/**
 * Delete a document (only drafts can be deleted).
 */
export async function deleteDocument(
  db: Database,
  companyId: string,
  documentId: string
) {
  const existing = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.companyId, companyId)))
    .limit(1);

  if (existing.length === 0) {
    throw new Error('Document not found');
  }

  if (existing[0].status !== 'draft') {
    throw new Error('Only draft documents can be deleted');
  }

  // Items and payments cascade-delete via FK
  await db.delete(documents).where(and(
    eq(documents.id, documentId),
    eq(documents.companyId, companyId)
  ));

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
    method?: 'bank_transfer' | 'cash' | 'card' | 'other';
    reference?: string;
    bankTransactionId?: string;
  }
) {
  // Verify document (outside transaction - read-only)
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.companyId, companyId)))
    .limit(1);

  if (!doc) {
    throw new Error('Document not found');
  }

  if (doc.status === 'draft' || doc.status === 'cancelled') {
    throw new Error(`Cannot record payment for a ${doc.status} document`);
  }

  // Idempotency check: skip if payment with same bankTransactionId already exists
  if (input.bankTransactionId) {
    const [existing] = await db
      .select({ id: documentPayments.id })
      .from(documentPayments)
      .where(eq(documentPayments.bankTransactionId, input.bankTransactionId))
      .limit(1);
    if (existing) {
      return existing;
    }
  }

  // Wrap payment + status update in transaction
  return db.transaction(async (tx) => {
    // Insert payment
    const [payment] = await tx
      .insert(documentPayments)
      .values({
        documentId,
        amount: input.amount,
        date: new Date(input.date),
        method: input.method ?? 'bank_transfer',
        reference: input.reference ?? null,
        bankTransactionId: input.bankTransactionId ?? null,
      })
      .returning();

    // Calculate total paid using Decimal for exact comparison
    const paymentsResult = await tx
      .select({
        totalPaid: sql<string>`COALESCE(SUM(${documentPayments.amount}::numeric), 0)`,
      })
      .from(documentPayments)
      .where(eq(documentPayments.documentId, documentId));

    const totalPaid = new Decimal(paymentsResult[0]?.totalPaid || '0');
    const docTotal = new Decimal(doc.total);

    // Update document status (in same transaction)
    let newStatus: DocumentStatus;
    if (totalPaid.gte(docTotal)) {
      newStatus = 'paid';
    } else {
      newStatus = 'partially_paid';
    }

    await tx
      .update(documents)
      .set({
        status: newStatus,
        paidDate: newStatus === 'paid' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(documents.id, documentId),
        eq(documents.companyId, companyId)
      ));

    // Auto-create journal entry for the payment (best effort - don't fail transaction)
    try {
      await createPaymentReceivedJournalEntry(tx, companyId, doc, {
        amount: input.amount,
        date: new Date(input.date),
      });
    } catch (e) {
      console.error('Auto journal entry for payment failed:', e);
    }

    return payment;
  });
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
  targetType: DocumentType
) {
  // Get the source document with items (outside transaction - read-only)
  const source = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, sourceDocumentId),
      eq(documents.companyId, companyId)
    ),
    with: {
      items: true,
    },
  });

  if (!source) {
    throw new Error('Source document not found');
  }

  // Validate conversion path
  const validConversions: Record<string, string[]> = {
    quote: ['order', 'invoice'],
    order: ['order_confirmation', 'delivery_note', 'invoice'],
    order_confirmation: ['delivery_note', 'invoice'],
    delivery_note: ['invoice'],
    invoice: ['credit_note'],
    purchase_order: ['purchase_invoice'],
  };

  const allowed = validConversions[source.type] ?? [];
  if (!allowed.includes(targetType)) {
    throw new Error(`Cannot convert ${source.type} to ${targetType}`);
  }

  // Wrap conversion in transaction
  return db.transaction(async (tx) => {
    // Generate new number
    const number = await getNextNumber(tx, companyId, targetType);

    // Generate QR reference if converting to invoice
    const qrReference = targetType === 'invoice'
      ? generateQRReference(companyId, number)
      : null;

    // Create new document
    const [newDoc] = await tx
      .insert(documents)
      .values({
        companyId,
        type: targetType,
        status: 'draft',
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

    // Copy items (in same transaction)
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
        }))
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
  companyId: string
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
        eq(documents.type, 'invoice'),
        eq(documents.status, 'paid'),
        gte(documents.paidDate, startOfMonth)
      )
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
        eq(documents.type, 'invoice'),
        eq(documents.status, 'paid'),
        gte(documents.paidDate, startOfYear)
      )
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
        eq(documents.type, 'invoice'),
        sql`${documents.status} IN ('sent', 'confirmed', 'delivered', 'partially_paid')`
      )
    );

  // Overdue
  const [overdue] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${documents.total}::numeric), 0)`,
      count: count(),
    })
    .from(documents)
    .where(
      and(
        eq(documents.companyId, companyId),
        eq(documents.type, 'invoice'),
        eq(documents.status, 'overdue')
      )
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
        eq(documents.type, 'invoice'),
        eq(documents.status, 'draft')
      )
    );

  return {
    revenueThisMonth: Number(monthlyRevenue.total),
    revenueThisMonthCount: monthlyRevenue.count,
    revenueThisYear: Number(yearlyRevenue.total),
    outstandingTotal: Number(outstanding.total),
    outstandingCount: outstanding.count,
    overdueTotal: Number(overdue.total),
    overdueCount: overdue.count,
    draftsTotal: Number(drafts.total),
    draftsCount: drafts.count,
  };
}
