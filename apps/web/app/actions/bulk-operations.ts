"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  convertDocument,
  updateDocumentStatus,
  deleteDocument,
  createDunning,
  extendQuoteValidity,
  recordPayment,
  getDocument,
  calculateOutstandingAmount,
} from "@kivvi/core";
import { deleteContact } from "@kivvi/core/src/domain/contacts";
import { deleteProduct } from "@kivvi/core/src/domain/products";
import {
  reconcileTransaction,
  matchTransactionToDocument,
} from "@kivvi/core/src/domain/banking";
import {
  documentTypeEnum,
  documentStatusEnum,
  PAYMENT_METHOD_VALUES,
  type DocumentType,
  type DocumentStatus,
  type PaymentMethodValue,
} from "@kivvi/database";
import {
  type ActionResult,
  getSession,
  requireRole,
  safeErrorMessage,
} from "./utils";
import { revalidateDocumentPaths } from "./utils/revalidate-documents";
import { getTranslations } from "next-intl/server";
import { DATE_EXACT_REGEX } from "@kivvi/core/src/utils/validation-patterns";

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

const bulkConvertSchema = z.object({
  documentIds: z
    .array(z.string().uuid())
    .min(1, "At least one document ID is required"),
  targetType: z.enum(documentTypeEnum.enumValues),
});

const bulkSendDunningSchema = z.object({
  invoiceIds: z
    .array(z.string().uuid())
    .min(1, "At least one invoice ID is required"),
});

const bulkExtendQuoteValiditySchema = z.object({
  quoteIds: z
    .array(z.string().uuid())
    .min(1, "At least one quote ID is required"),
  extensionDays: z.number().int().min(1).max(365),
});

const bulkMatchTransactionsSchema = z.object({
  transactionIds: z
    .array(z.string().uuid())
    .min(1, "At least one transaction ID is required"),
});

const bulkDocumentIdsSchema = z.object({
  documentIds: z
    .array(z.string().uuid())
    .min(1, "At least one document ID is required"),
});

const bulkContactIdsSchema = z.object({
  contactIds: z
    .array(z.string().uuid())
    .min(1, "At least one contact ID is required"),
});

const bulkProductIdsSchema = z.object({
  productIds: z
    .array(z.string().uuid())
    .min(1, "At least one product ID is required"),
});

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
  translateDomainError?: (
    code: string,
    params?: Record<string, string>,
  ) => string,
): Promise<ActionResult<BulkOperationResult<T>>> {
  const results: BulkOperationResult<T>["results"] = [];

  for (const id of ids) {
    try {
      const data = await operation(id);
      results.push({ id, success: true, ...(data !== undefined && { data }) });
    } catch (error) {
      results.push({
        id,
        success: false,
        error: safeErrorMessage(error, errorLabel, translateDomainError),
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  if (successCount > 0) {
    revalidate();
  }

  return { success: true, data: { successCount, failureCount, results } };
}

function parseInput<T>(
  schema: z.ZodType<T>,
  input: unknown,
): ActionResult<T> | T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return {
      success: false,
      error: `${firstError.path.join(".")}: ${firstError.message}`,
    };
  }
  return parsed.data;
}

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/** Bulk convert documents to a different type (e.g. quotes → invoices). */
export async function bulkConvertDocumentsAction(
  input: unknown,
): Promise<ActionResult<BulkOperationResult<{ id: string; number: string }>>> {
  const [t, tDomain] = await Promise.all([
    getTranslations("bulkActions"),
    getTranslations("domainErrors"),
  ]);
  const translateDomainError = (
    code: string,
    params?: Record<string, string>,
  ) => tDomain(code as Parameters<typeof tDomain>[0], params);
  try {
    const { companyId, userId } = await requireRole("member");
    const data = parseInput(bulkConvertSchema, input);
    if ("success" in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.documentIds,
      async (docId) => {
        const newDoc = await convertDocument(
          db,
          companyId,
          userId,
          docId,
          data.targetType as DocumentType,
        );
        return { id: newDoc.id, number: newDoc.number };
      },
      () => revalidateDocumentPaths(data.targetType),
      t("errorConvertDocument"),
      translateDomainError,
    );
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(
        error,
        t("errorBulkConvert"),
        translateDomainError,
      ),
    };
  }
}

/** Bulk send dunning notices for overdue invoices. */
export async function bulkSendDunningAction(
  input: unknown,
): Promise<
  ActionResult<
    BulkOperationResult<{ dunningDocId: string; dunningNumber: string }>
  >
> {
  const t = await getTranslations("bulkActions");
  try {
    const { companyId, userId } = await requireRole("member");
    const data = parseInput(bulkSendDunningSchema, input);
    if ("success" in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.invoiceIds,
      async (invoiceId) => {
        const { dunningDoc } = await createDunning(
          db,
          companyId,
          userId,
          invoiceId,
        );
        return {
          dunningDocId: dunningDoc.id,
          dunningNumber: dunningDoc.number,
        };
      },
      () => {
        revalidateDocumentPaths("invoice");
        revalidateDocumentPaths("dunning");
      },
      t("errorCreateDunning"),
    );
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorBulkSendDunning")),
    };
  }
}

/** Bulk extend quote validity by adding days to dueDate. */
export async function bulkExtendQuoteValidityAction(
  input: unknown,
): Promise<ActionResult<BulkOperationResult<{ newDueDate: string }>>> {
  const t = await getTranslations("bulkActions");
  try {
    const { companyId } = await requireRole("member");
    const data = parseInput(bulkExtendQuoteValiditySchema, input);
    if ("success" in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.quoteIds,
      async (quoteId) =>
        extendQuoteValidity(db, companyId, quoteId, data.extensionDays),
      () => revalidateDocumentPaths("quote"),
      t("errorExtendQuoteValidity"),
    );
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorBulkExtendValidity")),
    };
  }
}

/** Bulk match bank transactions to invoices. */
export async function bulkMatchTransactionsAction(
  input: unknown,
): Promise<
  ActionResult<
    BulkOperationResult<{ documentId: string; documentNumber: string }>
  >
> {
  const t = await getTranslations("bulkActions");
  try {
    const { companyId } = await requireRole("member");
    const data = parseInput(bulkMatchTransactionsSchema, input);
    if ("success" in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.transactionIds,
      async (txnId) => {
        const match = await matchTransactionToDocument(db, companyId, txnId);
        if (!match) throw new Error("no_match_found");
        await reconcileTransaction(db, companyId, txnId, match.documentId);
        return match;
      },
      () => {
        revalidatePath("/banking");
        revalidateDocumentPaths("invoice");
      },
      t("errorMatchTransaction"),
    );
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorBulkMatchTransactions")),
    };
  }
}

/** Bulk change document status (e.g. mark drafts as sent). */
export async function bulkStatusChangeAction(
  input: unknown,
): Promise<ActionResult<BulkOperationResult>> {
  const [t, tDomain] = await Promise.all([
    getTranslations("bulkActions"),
    getTranslations("domainErrors"),
  ]);
  const translateDomainError = (
    code: string,
    params?: Record<string, string>,
  ) => tDomain(code as Parameters<typeof tDomain>[0], params);
  try {
    const { companyId } = await requireRole("member");
    const schema = bulkDocumentIdsSchema.extend({
      targetStatus: z.enum(documentStatusEnum.enumValues),
    });
    const data = parseInput(schema, input);
    if ("success" in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.documentIds,
      async (docId) => {
        await updateDocumentStatus(
          db,
          companyId,
          docId,
          data.targetStatus as DocumentStatus,
        );
        return undefined;
      },
      () => revalidatePath("/"),
      t("errorUpdateStatus"),
      translateDomainError,
    );
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(
        error,
        t("errorBulkUpdateStatus"),
        translateDomainError,
      ),
    };
  }
}

/** Bulk mark documents as paid by recording full outstanding payment for each. */
export async function bulkMarkPaidAction(
  input: unknown,
): Promise<ActionResult<BulkOperationResult>> {
  const [t, tDomain] = await Promise.all([
    getTranslations("bulkActions"),
    getTranslations("domainErrors"),
  ]);
  const translateDomainError = (
    code: string,
    params?: Record<string, string>,
  ) => tDomain(code as Parameters<typeof tDomain>[0], params);
  try {
    const { companyId } = await requireRole("member");
    const schema = bulkDocumentIdsSchema.extend({
      paymentDate: z.string().regex(DATE_EXACT_REGEX),
      method: z.enum(PAYMENT_METHOD_VALUES).default("bank_transfer"),
    });
    const data = parseInput(schema, input);
    if ("success" in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.documentIds,
      async (docId) => {
        const doc = await getDocument(db, companyId, docId);
        if (!doc) throw new Error("document_not_found");

        const outstanding = calculateOutstandingAmount(doc);
        if (outstanding.lte(0)) return undefined; // Already fully paid

        await recordPayment(db, companyId, docId, {
          amount: outstanding.toFixed(2),
          date: data.paymentDate,
          method: data.method as PaymentMethodValue,
          reference: `Bulk payment ${data.paymentDate}`,
        });
        return undefined;
      },
      () => revalidatePath("/"),
      t("errorRecordPayment"),
      translateDomainError,
    );
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(
        error,
        t("errorBulkMarkPaid"),
        translateDomainError,
      ),
    };
  }
}

/** Bulk delete documents (draft-only enforced by domain). */
export async function bulkDeleteDocumentsAction(
  input: unknown,
): Promise<ActionResult<BulkOperationResult>> {
  const [t, tDomain] = await Promise.all([
    getTranslations("bulkActions"),
    getTranslations("domainErrors"),
  ]);
  const translateDomainError = (
    code: string,
    params?: Record<string, string>,
  ) => tDomain(code as Parameters<typeof tDomain>[0], params);
  try {
    const { companyId } = await requireRole("member");
    const data = parseInput(bulkDocumentIdsSchema, input);
    if ("success" in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.documentIds,
      async (docId) => {
        await deleteDocument(db, companyId, docId);
        return undefined;
      },
      () => revalidatePath("/"),
      t("errorDeleteDocument"),
      translateDomainError,
    );
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(
        error,
        t("errorBulkDeleteDocuments"),
        translateDomainError,
      ),
    };
  }
}

/** Bulk delete contacts. */
export async function bulkDeleteContactsAction(
  input: unknown,
): Promise<ActionResult<BulkOperationResult>> {
  const t = await getTranslations("bulkActions");
  try {
    const { companyId } = await requireRole("member");
    const data = parseInput(bulkContactIdsSchema, input);
    if ("success" in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.contactIds,
      async (contactId) => {
        await deleteContact(db, companyId, contactId);
        return undefined;
      },
      () => revalidatePath("/contacts"),
      t("errorDeleteContact"),
    );
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorBulkDeleteContacts")),
    };
  }
}

/** Bulk delete products. */
export async function bulkDeleteProductsAction(
  input: unknown,
): Promise<ActionResult<BulkOperationResult>> {
  const t = await getTranslations("bulkActions");
  try {
    const { companyId } = await requireRole("member");
    const data = parseInput(bulkProductIdsSchema, input);
    if ("success" in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.productIds,
      async (productId) => {
        await deleteProduct(db, companyId, productId);
        return undefined;
      },
      () => revalidatePath("/products"),
      t("errorDeleteProduct"),
    );
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorBulkDeleteProducts")),
    };
  }
}

/** Bulk deactivate contacts (soft delete — sets isActive = false). */
export async function bulkDeactivateContactsAction(
  input: unknown,
): Promise<ActionResult<BulkOperationResult>> {
  const t = await getTranslations("bulkActions");
  try {
    const { companyId } = await requireRole("member");
    const data = parseInput(bulkContactIdsSchema, input);
    if ("success" in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.contactIds,
      async (contactId) => {
        await deleteContact(db, companyId, contactId);
        return undefined;
      },
      () => revalidatePath("/contacts"),
      t("errorDeactivateContact"),
    );
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorBulkDeactivateContacts")),
    };
  }
}

/** Bulk deactivate products (soft delete — sets isActive = false). */
export async function bulkDeactivateProductsAction(
  input: unknown,
): Promise<ActionResult<BulkOperationResult>> {
  const t = await getTranslations("bulkActions");
  try {
    const { companyId } = await requireRole("member");
    const data = parseInput(bulkProductIdsSchema, input);
    if ("success" in data) return data as ActionResult<never>;

    return runBulkOperation(
      data.productIds,
      async (productId) => {
        await deleteProduct(db, companyId, productId);
        return undefined;
      },
      () => revalidatePath("/products"),
      t("errorDeactivateProduct"),
    );
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorBulkDeactivateProducts")),
    };
  }
}
