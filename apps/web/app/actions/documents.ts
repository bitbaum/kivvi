'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import {
  createDocument,
  updateDocument,
  deleteDocument,
  updateDocumentStatus,
  recordPayment,
  convertDocument,
  createDocumentSchema,
  updateDocumentSchema,
} from '@kivvi/core';
import type { DocumentType, DocumentStatus } from '@kivvi/database';
import { type ActionResult, getSession, safeErrorMessage } from './utils';

// ============================================================================
// VALIDATION SCHEMAS FOR UNVALIDATED PARAMS
// ============================================================================

const documentStatusValues = [
  'draft', 'sent', 'confirmed', 'delivered', 'paid', 'partially_paid',
  'overdue', 'cancelled', 'dunning_1', 'dunning_2', 'dunning_3',
] as const;

const updateStatusSchema = z.object({
  newStatus: z.enum(documentStatusValues),
});

const recordPaymentSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date'),
  method: z.enum(['bank_transfer', 'cash', 'card', 'other']).optional(),
  reference: z.string().max(500).optional(),
});

const documentTypeValues = [
  'quote', 'order', 'order_confirmation', 'delivery_note',
  'invoice', 'credit_note', 'purchase_order', 'purchase_invoice', 'dunning',
] as const;

const convertSchema = z.object({
  targetType: z.enum(documentTypeValues),
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

// ============================================================================
// SERVER ACTIONS
// ============================================================================

export async function createDocumentAction(
  input: unknown
): Promise<ActionResult<{ id: string; number: string }>> {
  try {
    const { companyId, userId } = await getSession();

    const parsed = createDocumentSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`,
      };
    }

    const doc = await db.transaction(async (tx) => {
      return createDocument(tx, companyId, userId, parsed.data);
    });

    revalidateDocumentPaths(doc.type, doc.id);
    return { success: true, data: { id: doc.id, number: doc.number } };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to create document') };
  }
}

export async function updateDocumentAction(
  documentId: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await getSession();

    const parsed = updateDocumentSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`,
      };
    }

    const doc = await db.transaction(async (tx) => {
      return updateDocument(tx, companyId, documentId, parsed.data);
    });

    revalidateDocumentPaths(doc.type, doc.id);
    return { success: true, data: { id: doc.id } };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to update document') };
  }
}

export async function deleteDocumentAction(
  documentId: string
): Promise<ActionResult> {
  try {
    const { companyId } = await getSession();

    const doc = await deleteDocument(db, companyId, documentId);

    revalidateDocumentPaths(doc.type);
    return { success: true };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to delete document') };
  }
}

export async function updateDocumentStatusAction(
  documentId: string,
  newStatus: DocumentStatus
): Promise<ActionResult<{ id: string; status: string }>> {
  try {
    const { companyId } = await getSession();

    // Validate the status parameter
    const parsed = updateStatusSchema.safeParse({ newStatus });
    if (!parsed.success) {
      return { success: false, error: 'Invalid status value' };
    }

    const doc = await db.transaction(async (tx) => {
      return updateDocumentStatus(tx, companyId, documentId, parsed.data.newStatus as DocumentStatus);
    });

    revalidateDocumentPaths(doc.type, doc.id);
    return { success: true, data: { id: doc.id, status: doc.status } };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to update status') };
  }
}

export async function recordPaymentAction(
  documentId: string,
  input: {
    amount: string;
    date: string;
    method?: 'bank_transfer' | 'cash' | 'card' | 'other';
    reference?: string;
  }
): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await getSession();

    // Validate the payment input
    const parsed = recordPaymentSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return { success: false, error: `${firstError.path.join('.')}: ${firstError.message}` };
    }

    const payment = await db.transaction(async (tx) => {
      return recordPayment(tx, companyId, documentId, parsed.data);
    });

    revalidateDocumentPaths('invoice', documentId);
    return { success: true, data: { id: payment.id } };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to record payment') };
  }
}

export async function convertDocumentAction(
  sourceDocumentId: string,
  targetType: DocumentType
): Promise<ActionResult<{ id: string; number: string }>> {
  try {
    const { companyId, userId } = await getSession();

    // Validate the target type
    const parsed = convertSchema.safeParse({ targetType });
    if (!parsed.success) {
      return { success: false, error: 'Invalid target document type' };
    }

    const doc = await db.transaction(async (tx) => {
      return convertDocument(tx, companyId, userId, sourceDocumentId, parsed.data.targetType as DocumentType);
    });

    revalidateDocumentPaths(doc.type, doc.id);
    return { success: true, data: { id: doc.id, number: doc.number } };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'Failed to convert document') };
  }
}
