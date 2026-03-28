"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import {
  createDocument,
  updateDocument,
  deleteDocument,
  updateDocumentStatus,
  recordPayment,
  convertDocument,
  duplicateDocument,
  createDocumentSchema,
  updateDocumentSchema,
} from "@kivvi/core";
import {
  documentStatusEnum,
  type DocumentType,
  type DocumentStatus,
} from "@kivvi/database";
import {
  type ActionResult,
  getSession,
  requireRole,
  safeErrorMessage,
  formatZodError,
} from "./utils";
import { revalidateDocumentPaths } from "./utils/revalidate-documents";

// ============================================================================
// VALIDATION SCHEMAS FOR UNVALIDATED PARAMS
// ============================================================================

const updateStatusSchema = z.object({
  newStatus: z.enum(documentStatusEnum.enumValues),
});

const recordPaymentSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Invalid date"),
  method: z.enum(["bank_transfer", "cash", "card", "other"]).optional(),
  reference: z.string().max(500).optional(),
});

const documentTypeValues = [
  "quote",
  "order",
  "order_confirmation",
  "delivery_note",
  "invoice",
  "credit_note",
  "purchase_order",
  "purchase_invoice",
  "dunning",
] as const;

const convertSchema = z.object({
  targetType: z.enum(documentTypeValues),
});

// ============================================================================
// SERVER ACTIONS
// ============================================================================

export async function createDocumentAction(
  input: unknown,
): Promise<ActionResult<{ id: string; number: string }>> {
  try {
    const { companyId, userId } = await requireRole("member");

    const parsed = createDocumentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, ...formatZodError(parsed.error) };
    }

    const doc = await createDocument(db, companyId, userId, parsed.data);

    revalidateDocumentPaths(doc.type, doc.id);
    return { success: true, data: { id: doc.id, number: doc.number } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to create document"),
    };
  }
}

export async function updateDocumentAction(
  documentId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await requireRole("member");

    const parsed = updateDocumentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, ...formatZodError(parsed.error) };
    }

    const doc = await updateDocument(db, companyId, documentId, parsed.data);

    revalidateDocumentPaths(doc.type, doc.id);
    return { success: true, data: { id: doc.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to update document"),
    };
  }
}

export async function deleteDocumentAction(
  documentId: string,
): Promise<ActionResult> {
  try {
    const { companyId } = await requireRole("member");

    const doc = await deleteDocument(db, companyId, documentId);

    revalidateDocumentPaths(doc.type);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to delete document"),
    };
  }
}

export async function updateDocumentStatusAction(
  documentId: string,
  newStatus: DocumentStatus,
): Promise<ActionResult<{ id: string; status: string }>> {
  try {
    const { companyId } = await requireRole("member");

    // Validate the status parameter
    const parsed = updateStatusSchema.safeParse({ newStatus });
    if (!parsed.success) {
      return { success: false, error: "Invalid status value" };
    }

    const doc = await updateDocumentStatus(
      db,
      companyId,
      documentId,
      parsed.data.newStatus as DocumentStatus,
    );

    revalidateDocumentPaths(doc.type, doc.id);
    return { success: true, data: { id: doc.id, status: doc.status } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to update status"),
    };
  }
}

export async function recordPaymentAction(
  documentId: string,
  input: {
    amount: string;
    date: string;
    method?: "bank_transfer" | "cash" | "card" | "other";
    reference?: string;
  },
): Promise<ActionResult<{ id: string }>> {
  try {
    const { companyId } = await requireRole("member");

    // Validate the payment input
    const parsed = recordPaymentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, ...formatZodError(parsed.error) };
    }

    const payment = await recordPayment(db, companyId, documentId, parsed.data);

    revalidateDocumentPaths("invoice", documentId);
    return { success: true, data: { id: payment.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to record payment"),
    };
  }
}

export async function convertDocumentAction(
  sourceDocumentId: string,
  targetType: DocumentType,
): Promise<ActionResult<{ id: string; number: string }>> {
  try {
    const { companyId, userId } = await requireRole("member");

    // Validate the target type
    const parsed = convertSchema.safeParse({ targetType });
    if (!parsed.success) {
      return { success: false, error: "Invalid target document type" };
    }

    const doc = await convertDocument(
      db,
      companyId,
      userId,
      sourceDocumentId,
      parsed.data.targetType as DocumentType,
    );

    revalidateDocumentPaths(doc.type, doc.id);
    return { success: true, data: { id: doc.id, number: doc.number } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to convert document"),
    };
  }
}

export async function duplicateDocumentAction(
  sourceDocumentId: string,
): Promise<ActionResult<{ id: string; number: string; type: string }>> {
  try {
    const { companyId, userId } = await requireRole("member");

    const doc = await duplicateDocument(
      db,
      companyId,
      userId,
      sourceDocumentId,
    );

    revalidateDocumentPaths(doc.type, doc.id);
    return {
      success: true,
      data: { id: doc.id, number: doc.number, type: doc.type },
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, "Failed to duplicate document"),
    };
  }
}
