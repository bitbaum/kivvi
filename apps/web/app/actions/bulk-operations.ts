'use server';

import { z } from 'zod';
import Decimal from 'decimal.js';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  convertDocument,
  updateDocument,
  updateDocumentStatus,
  deleteDocument,
  createDunning,
} from '@kivvi/core';
import { deleteContact } from '@kivvi/core/src/domain/contacts';
import { deleteProduct } from '@kivvi/core/src/domain/products';
import { contacts, products } from '@kivvi/database/src/schema';
import { eq, and } from 'drizzle-orm';
import { reconcileTransaction } from '@kivvi/core/src/domain/banking';
import type { DocumentType, DocumentStatus } from '@kivvi/database';
import { type ActionResult, getSession, safeErrorMessage } from './utils';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const documentTypeValues = [
  'quote', 'order', 'order_confirmation', 'delivery_note',
  'invoice', 'credit_note', 'purchase_order', 'purchase_invoice', 'dunning',
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

const documentStatusValues = [
  'draft', 'sent', 'confirmed', 'delivered', 'paid', 'partially_paid',
  'overdue', 'cancelled', 'dunning_1', 'dunning_2', 'dunning_3',
] as const;

const bulkStatusChangeSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1, 'At least one document ID is required'),
  targetStatus: z.enum(documentStatusValues),
});

const bulkDeleteDocumentsSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1, 'At least one document ID is required'),
});

const bulkDeleteContactsSchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1, 'At least one contact ID is required'),
});

const bulkDeactivateContactsSchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1, 'At least one contact ID is required'),
});

const bulkDeleteProductsSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1, 'At least one product ID is required'),
});

const bulkDeactivateProductsSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1, 'At least one product ID is required'),
});

// ============================================================================
// TYPES
// ============================================================================

export interface BulkOperationResult<T = unknown> {
  successCount: number;
  failureCount: number;
  results: Array<{ id: string; success: boolean; data?: T; error?: string }>;
}

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

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Bulk convert documents to a different type.
 * Example: Convert multiple quotes to invoices.
 */
export async function bulkConvertDocumentsAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult<{ id: string; number: string }>>> {
  try {
    const { companyId, userId } = await getSession();

    const parsed = bulkConvertSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`,
      };
    }

    const { documentIds, targetType } = parsed.data;
    const results: BulkOperationResult<{ id: string; number: string }>['results'] = [];

    // Process each document
    for (const docId of documentIds) {
      try {
        const newDoc = await convertDocument(db, companyId, userId, docId, targetType as DocumentType);
        results.push({
          id: docId,
          success: true,
          data: { id: newDoc.id, number: newDoc.number },
        });
      } catch (error) {
        results.push({
          id: docId,
          success: false,
          error: safeErrorMessage(error, 'Failed to convert document'),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    // Revalidate paths for source and target types
    if (successCount > 0) {
      revalidateDocumentPaths(targetType);
    }

    return {
      success: true,
      data: {
        successCount,
        failureCount,
        results,
      },
    };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk convert documents') };
  }
}

/**
 * Bulk send dunning notices for overdue invoices.
 * Creates dunning documents and escalates invoice status.
 */
export async function bulkSendDunningAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult<{ dunningDocId: string; dunningNumber: string }>>> {
  try {
    const { companyId, userId } = await getSession();

    const parsed = bulkSendDunningSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`,
      };
    }

    const { invoiceIds } = parsed.data;
    const results: BulkOperationResult<{ dunningDocId: string; dunningNumber: string }>['results'] = [];

    // Process each invoice
    for (const invoiceId of invoiceIds) {
      try {
        const { dunningDoc } = await createDunning(db, companyId, userId, invoiceId);
        results.push({
          id: invoiceId,
          success: true,
          data: { dunningDocId: dunningDoc.id, dunningNumber: dunningDoc.number },
        });
      } catch (error) {
        results.push({
          id: invoiceId,
          success: false,
          error: safeErrorMessage(error, 'Failed to create dunning'),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    if (successCount > 0) {
      revalidateDocumentPaths('invoice');
      revalidateDocumentPaths('dunning');
    }

    return {
      success: true,
      data: {
        successCount,
        failureCount,
        results,
      },
    };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk send dunning notices') };
  }
}

/**
 * Bulk extend quote validity by adding days to dueDate.
 */
export async function bulkExtendQuoteValidityAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult<{ newDueDate: string }>>> {
  try {
    const { companyId } = await getSession();

    const parsed = bulkExtendQuoteValiditySchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`,
      };
    }

    const { quoteIds, extensionDays } = parsed.data;
    const results: BulkOperationResult<{ newDueDate: string }>['results'] = [];

    // Process each quote
    for (const quoteId of quoteIds) {
      try {
        // Get current quote to calculate new due date
        const quote = await db.query.documents.findFirst({
          where: (documents, { eq, and }) =>
            and(
              eq(documents.id, quoteId),
              eq(documents.companyId, companyId)
            ),
        });

        if (!quote) {
          results.push({
            id: quoteId,
            success: false,
            error: 'Quote not found',
          });
          continue;
        }

        if (quote.type !== 'quote') {
          results.push({
            id: quoteId,
            success: false,
            error: 'Document is not a quote',
          });
          continue;
        }

        // Calculate new due date
        const currentDueDate = quote.dueDate ? new Date(quote.dueDate) : new Date();
        const newDueDate = new Date(currentDueDate);
        newDueDate.setDate(newDueDate.getDate() + extensionDays);

        // Update the quote
        await updateDocument(db, companyId, quoteId, {
          dueDate: newDueDate.toISOString().split('T')[0],
        });

        results.push({
          id: quoteId,
          success: true,
          data: { newDueDate: newDueDate.toISOString().split('T')[0] },
        });
      } catch (error) {
        results.push({
          id: quoteId,
          success: false,
          error: safeErrorMessage(error, 'Failed to extend quote validity'),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    if (successCount > 0) {
      revalidateDocumentPaths('quote');
    }

    return {
      success: true,
      data: {
        successCount,
        failureCount,
        results,
      },
    };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk extend quote validity') };
  }
}

/**
 * Bulk match bank transactions to invoices.
 * Uses reconciliation logic to match transactions to documents.
 */
export async function bulkMatchTransactionsAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult<{ documentId: string; documentNumber: string }>>> {
  try {
    const { companyId } = await getSession();

    const parsed = bulkMatchTransactionsSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`,
      };
    }

    const { transactionIds } = parsed.data;
    const results: BulkOperationResult<{ documentId: string; documentNumber: string }>['results'] = [];

    // Process each transaction
    for (const txnId of transactionIds) {
      try {
        // Get the transaction to find a matching document
        const txn = await db.query.bankTransactions.findFirst({
          where: (bankTransactions, { eq }) => eq(bankTransactions.id, txnId),
          with: {
            bankAccount: true,
          },
        });

        if (!txn) {
          results.push({
            id: txnId,
            success: false,
            error: 'Transaction not found',
          });
          continue;
        }

        if (txn.bankAccount.companyId !== companyId) {
          results.push({
            id: txnId,
            success: false,
            error: 'Unauthorized',
          });
          continue;
        }

        if (txn.isReconciled) {
          results.push({
            id: txnId,
            success: false,
            error: 'Transaction already reconciled',
          });
          continue;
        }

        // Try to find a matching document by QR reference or amount
        let matchedDoc = null;

        // First: try QR reference match
        if (txn.reference) {
          matchedDoc = await db.query.documents.findFirst({
            where: (documents, { eq, and, sql }) =>
              and(
                eq(documents.companyId, companyId),
                eq(documents.type, 'invoice'),
                sql`${documents.qrReference} IS NOT NULL AND ${txn.reference} LIKE '%' || ${documents.qrReference} || '%'`,
                sql`${documents.status} IN ('sent', 'confirmed', 'delivered', 'partially_paid', 'overdue', 'dunning_1', 'dunning_2', 'dunning_3')`
              ),
          });
        }

        // Second: try exact amount match using database-level decimal comparison
        if (!matchedDoc) {
          // Use absolute value for comparison (txn.amount is string, stored as numeric in DB)
          const txnAmountAbs = new Decimal(txn.amount).abs().toString();
          matchedDoc = await db.query.documents.findFirst({
            where: (documents, { eq, and, sql }) =>
              and(
                eq(documents.companyId, companyId),
                eq(documents.type, 'invoice'),
                sql`ABS(CAST(${documents.total} AS DECIMAL) - CAST(${txnAmountAbs} AS DECIMAL)) < 0.01`,
                sql`${documents.status} IN ('sent', 'confirmed', 'delivered', 'partially_paid', 'overdue', 'dunning_1', 'dunning_2', 'dunning_3')`
              ),
          });
        }

        if (!matchedDoc) {
          results.push({
            id: txnId,
            success: false,
            error: 'No matching invoice found',
          });
          continue;
        }

        // Reconcile the transaction
        await reconcileTransaction(db, companyId, txnId, matchedDoc.id);

        results.push({
          id: txnId,
          success: true,
          data: { documentId: matchedDoc.id, documentNumber: matchedDoc.number },
        });
      } catch (error) {
        results.push({
          id: txnId,
          success: false,
          error: safeErrorMessage(error, 'Failed to match transaction'),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    if (successCount > 0) {
      revalidatePath('/banking');
      revalidateDocumentPaths('invoice');
    }

    return {
      success: true,
      data: {
        successCount,
        failureCount,
        results,
      },
    };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk match transactions') };
  }
}

/**
 * Bulk change document status.
 * Example: Mark multiple drafts as sent.
 */
export async function bulkStatusChangeAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult>> {
  try {
    const { companyId } = await getSession();

    const parsed = bulkStatusChangeSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return { success: false, error: `${firstError.path.join('.')}: ${firstError.message}` };
    }

    const { documentIds, targetStatus } = parsed.data;
    const results: BulkOperationResult['results'] = [];

    for (const docId of documentIds) {
      try {
        await updateDocumentStatus(db, companyId, docId, targetStatus as DocumentStatus);
        results.push({ id: docId, success: true });
      } catch (error) {
        results.push({ id: docId, success: false, error: safeErrorMessage(error, 'Failed to update status') });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    if (successCount > 0) {
      revalidatePath('/');
    }

    return { success: true, data: { successCount, failureCount, results } };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk update status') };
  }
}

/**
 * Bulk delete documents (draft-only enforced by domain).
 */
export async function bulkDeleteDocumentsAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult>> {
  try {
    const { companyId } = await getSession();

    const parsed = bulkDeleteDocumentsSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return { success: false, error: `${firstError.path.join('.')}: ${firstError.message}` };
    }

    const { documentIds } = parsed.data;
    const results: BulkOperationResult['results'] = [];

    for (const docId of documentIds) {
      try {
        await deleteDocument(db, companyId, docId);
        results.push({ id: docId, success: true });
      } catch (error) {
        results.push({ id: docId, success: false, error: safeErrorMessage(error, 'Failed to delete document') });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    if (successCount > 0) {
      revalidatePath('/');
    }

    return { success: true, data: { successCount, failureCount, results } };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk delete documents') };
  }
}

/**
 * Bulk delete contacts.
 */
export async function bulkDeleteContactsAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult>> {
  try {
    const { companyId } = await getSession();

    const parsed = bulkDeleteContactsSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return { success: false, error: `${firstError.path.join('.')}: ${firstError.message}` };
    }

    const { contactIds } = parsed.data;
    const results: BulkOperationResult['results'] = [];

    for (const contactId of contactIds) {
      try {
        await deleteContact(db, companyId, contactId);
        results.push({ id: contactId, success: true });
      } catch (error) {
        results.push({ id: contactId, success: false, error: safeErrorMessage(error, 'Failed to delete contact') });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    if (successCount > 0) {
      revalidatePath('/contacts');
    }

    return { success: true, data: { successCount, failureCount, results } };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk delete contacts') };
  }
}

/**
 * Bulk deactivate contacts.
 */
export async function bulkDeactivateContactsAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult>> {
  try {
    const { companyId } = await getSession();

    const parsed = bulkDeactivateContactsSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return { success: false, error: `${firstError.path.join('.')}: ${firstError.message}` };
    }

    const { contactIds } = parsed.data;
    const results: BulkOperationResult['results'] = [];

    for (const contactId of contactIds) {
      try {
        const [updated] = await db
          .update(contacts)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(eq(contacts.id, contactId), eq(contacts.companyId, companyId)))
          .returning();
        if (!updated) throw new Error('Contact not found');
        results.push({ id: contactId, success: true });
      } catch (error) {
        results.push({ id: contactId, success: false, error: safeErrorMessage(error, 'Failed to deactivate contact') });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    if (successCount > 0) {
      revalidatePath('/contacts');
    }

    return { success: true, data: { successCount, failureCount, results } };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk deactivate contacts') };
  }
}

/**
 * Bulk delete products.
 */
export async function bulkDeleteProductsAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult>> {
  try {
    const { companyId } = await getSession();

    const parsed = bulkDeleteProductsSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return { success: false, error: `${firstError.path.join('.')}: ${firstError.message}` };
    }

    const { productIds } = parsed.data;
    const results: BulkOperationResult['results'] = [];

    for (const productId of productIds) {
      try {
        await deleteProduct(db, companyId, productId);
        results.push({ id: productId, success: true });
      } catch (error) {
        results.push({ id: productId, success: false, error: safeErrorMessage(error, 'Failed to delete product') });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    if (successCount > 0) {
      revalidatePath('/products');
    }

    return { success: true, data: { successCount, failureCount, results } };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk delete products') };
  }
}

/**
 * Bulk deactivate products.
 */
export async function bulkDeactivateProductsAction(
  input: unknown
): Promise<ActionResult<BulkOperationResult>> {
  try {
    const { companyId } = await getSession();

    const parsed = bulkDeactivateProductsSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return { success: false, error: `${firstError.path.join('.')}: ${firstError.message}` };
    }

    const { productIds } = parsed.data;
    const results: BulkOperationResult['results'] = [];

    for (const productId of productIds) {
      try {
        const [updated] = await db
          .update(products)
          .set({ isActive: false, updatedAt: new Date() })
          .where(and(eq(products.id, productId), eq(products.companyId, companyId)))
          .returning();
        if (!updated) throw new Error('Product not found');
        results.push({ id: productId, success: true });
      } catch (error) {
        results.push({ id: productId, success: false, error: safeErrorMessage(error, 'Failed to deactivate product') });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    if (successCount > 0) {
      revalidatePath('/products');
    }

    return { success: true, data: { successCount, failureCount, results } };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to bulk deactivate products') };
  }
}
