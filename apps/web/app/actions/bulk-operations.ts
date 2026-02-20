'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  convertDocument,
  updateDocumentStatus,
  deleteDocument,
  createDunning,
  extendQuoteValidity,
} from '@kivvi/core';
import { deleteContact } from '@kivvi/core/src/domain/contacts';
import { deleteProduct } from '@kivvi/core/src/domain/products';
import { reconcileTransaction, matchTransactionToDocument } from '@kivvi/core/src/domain/banking';
import type { DocumentType, DocumentStatus } from '@kivvi/database';
import { type ActionResult, getSession, safeErrorMessage } from './utils';

// ============================================================================
// TYPES
// ============================================================================

export interface BulkOperationResult<T = unknown> {
  successCount: number;
  failureCount: number;
  results: Array<{ id: string; success: boolean; data?: T; error?: string }>;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const documentTypeValues = [
  'quote', 'order', 'order_confirmation', 'delivery_note',
  'invoice', 'credit_note', 'purchase_order', 'purchase_invoice', 'dunning',
] as const;

const documentStatusValues = [
  'draft', 'sent', 'confirmed', 'delivered', 'paid', 'partially_paid',
  'overdue', 'cancelled', 'dunning_1', 'dunning_2', 'dunning_3',
] as const;

const bulkConvertSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1, 'At least one document ID is required'),
  targetType: z.enum(documentTypeValues),
});

const bulkSendDunningSchema = z.object({
  invoiceIds: z.array(z.string().uuid()).min(1, 'At least one invoice ID is required'),
});

const bulkExtendQuoteValiditySchema = z.object({
  quoteIds: z.array(z.string().uuid()).min(1, 'At least one quote ID is required'),
  extensionDays: z.number().int().min(1).max(365),
});

const bulkMatchTransactionsSchema = z.object({
  transactionIds: z.array(z.string().uuid()).min(1, 'At least one transaction ID is required'),
});

const bulkDocumentIdsSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1, 'At least one document ID is required'),
});

const bulkContactIdsSchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1, 'At least one contact ID is required'),
});

const bulkProductIdsSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1, 'At least one product ID is required'),
});

// ============================================================================
// HELPERS
// ============================================================================

function revalidateDocumentPaths(type: string, id?: string) {
  const typeToPath: Record<string, string> = {
    invoice: '/sales/invoices',
    quote: '/sales/quotes',
    order: '/sales/orders',
    credit_note: '/sales/credit-notes',
    delivery_note: '/sales/delivery-notes',
    dunning: '/sales/dunning',
    purchase_order: '/purchasing/purchase-orders',
    purchase_invoice: '/purchasing/purchase-invoices',
    order_confirmation: '/sales/orders',
  };
  const basePath = typeToPath[type] || '/sales/invoices';
  revalidatePath(basePath);
  if (id) revalidatePath(`${basePath}/${id}`);
  revalidatePath('/dashboard');
}

/**
 * Generic bulk operation runner.
 * Loops over IDs, calls the operation for each, aggregates results,
 * and revalidates paths on success.
 */
async function runBulkOperation<T = unknown>(
  ids: string[],
  operation: (id: string) => Promise<T | undefined>,
  revalidate: () => void,
  errorLabel: string,
): Promise<ActionResult<BulkOperationResult<T>>> {
  const results: BulkOperationResult<T>['results'] = [];

  for (const id of ids) {
    try {
      const data = await operation(id);
      results.push({ id, success: true, ...(data !== undefined && { data }) });
    } catch (error) {
      results.push({ id, success: false, error: safeErrorMessage(error, errorLabel) });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  if (successCount > 0) {
    revalidate();
  }

  return { success: true, data: { successCount, failureCount, results } };
}

function parseInput<T>(schema: z.ZodType<T>, input: unknown): ActionResult<T> | T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return { success: false, error: `${firstError.path.join('.')}: ${firstError.message}` };
  }
  return parsed.data;
}

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/** Bulk convert documents to a different type (e.g. quotes → invoices). */
export async function bulkConvertDocumentsAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult<{ id: string; number: string }>>> {
  try {
    const { companyId, userId } = await getSession();
    const data = parseInput(bulkConvertSchema, input);
    if ('success' in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.documentIds,
      async (docId) => {
        const newDoc = await convertDocument(db, companyId, userId, docId, data.targetType as DocumentType);
        return { id: newDoc.id, number: newDoc.number };
      },
      () => revalidateDocumentPaths(data.targetType),
      'Failed to convert document',
    );
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk convert documents') };
  }
}

/** Bulk send dunning notices for overdue invoices. */
export async function bulkSendDunningAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult<{ dunningDocId: string; dunningNumber: string }>>> {
  try {
    const { companyId, userId } = await getSession();
    const data = parseInput(bulkSendDunningSchema, input);
    if ('success' in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.invoiceIds,
      async (invoiceId) => {
        const { dunningDoc } = await createDunning(db, companyId, userId, invoiceId);
        return { dunningDocId: dunningDoc.id, dunningNumber: dunningDoc.number };
      },
      () => { revalidateDocumentPaths('invoice'); revalidateDocumentPaths('dunning'); },
      'Failed to create dunning',
    );
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk send dunning notices') };
  }
}

/** Bulk extend quote validity by adding days to dueDate. */
export async function bulkExtendQuoteValidityAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult<{ newDueDate: string }>>> {
  try {
    const { companyId } = await getSession();
    const data = parseInput(bulkExtendQuoteValiditySchema, input);
    if ('success' in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.quoteIds,
      async (quoteId) => extendQuoteValidity(db, companyId, quoteId, data.extensionDays),
      () => revalidateDocumentPaths('quote'),
      'Failed to extend quote validity',
    );
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk extend quote validity') };
  }
}

/** Bulk match bank transactions to invoices. */
export async function bulkMatchTransactionsAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult<{ documentId: string; documentNumber: string }>>> {
  try {
    const { companyId } = await getSession();
    const data = parseInput(bulkMatchTransactionsSchema, input);
    if ('success' in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.transactionIds,
      async (txnId) => {
        const match = await matchTransactionToDocument(db, companyId, txnId);
        if (!match) throw new Error('No matching invoice found');
        await reconcileTransaction(db, companyId, txnId, match.documentId);
        return match;
      },
      () => { revalidatePath('/banking'); revalidateDocumentPaths('invoice'); },
      'Failed to match transaction',
    );
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk match transactions') };
  }
}

/** Bulk change document status (e.g. mark drafts as sent). */
export async function bulkStatusChangeAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult>> {
  try {
    const { companyId } = await getSession();
    const schema = bulkDocumentIdsSchema.extend({ targetStatus: z.enum(documentStatusValues) });
    const data = parseInput(schema, input);
    if ('success' in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.documentIds,
      async (docId) => { await updateDocumentStatus(db, companyId, docId, data.targetStatus as DocumentStatus); return undefined; },
      () => revalidatePath('/'),
      'Failed to update status',
    );
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk update status') };
  }
}

/** Bulk delete documents (draft-only enforced by domain). */
export async function bulkDeleteDocumentsAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult>> {
  try {
    const { companyId } = await getSession();
    const data = parseInput(bulkDocumentIdsSchema, input);
    if ('success' in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.documentIds,
      async (docId) => { await deleteDocument(db, companyId, docId); return undefined; },
      () => revalidatePath('/'),
      'Failed to delete document',
    );
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk delete documents') };
  }
}

/** Bulk delete contacts. */
export async function bulkDeleteContactsAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult>> {
  try {
    const { companyId } = await getSession();
    const data = parseInput(bulkContactIdsSchema, input);
    if ('success' in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.contactIds,
      async (contactId) => { await deleteContact(db, companyId, contactId); return undefined; },
      () => revalidatePath('/contacts'),
      'Failed to delete contact',
    );
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk delete contacts') };
  }
}

/** Bulk deactivate contacts. */
export async function bulkDeactivateContactsAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult>> {
  try {
    const { companyId } = await getSession();
    const data = parseInput(bulkContactIdsSchema, input);
    if ('success' in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.contactIds,
      async (contactId) => { await deleteContact(db, companyId, contactId); return undefined; },
      () => revalidatePath('/contacts'),
      'Failed to deactivate contact',
    );
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk deactivate contacts') };
  }
}

/** Bulk delete products. */
export async function bulkDeleteProductsAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult>> {
  try {
    const { companyId } = await getSession();
    const data = parseInput(bulkProductIdsSchema, input);
    if ('success' in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.productIds,
      async (productId) => { await deleteProduct(db, companyId, productId); return undefined; },
      () => revalidatePath('/products'),
      'Failed to delete product',
    );
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk delete products') };
  }
}

/** Bulk deactivate products. */
export async function bulkDeactivateProductsAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult>> {
  try {
    const { companyId } = await getSession();
    const data = parseInput(bulkProductIdsSchema, input);
    if ('success' in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.productIds,
      async (productId) => { await deleteProduct(db, companyId, productId); return undefined; },
      () => revalidatePath('/products'),
      'Failed to deactivate product',
    );
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk deactivate products') };
  }
}
