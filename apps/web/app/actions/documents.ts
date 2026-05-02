"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
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
  getDocument,
} from "@kivvi/core";
import {
  documentStatusEnum,
  documentTypeEnum,
  PAYMENT_METHOD_VALUES,
  companies,
  type DocumentType,
  type DocumentStatus,
  type CompanySettings,
} from "@kivvi/database";
import {
  buildPaymentConfirmationEmailHtml,
  buildPaymentConfirmationEmailSubject,
} from "@kivvi/core/src/domain/email";
import {
  type ActionResult,
  requireRole,
  safeErrorMessage,
  formatZodError,
} from "./utils";
import { createAction } from "./action-factory";
import { revalidateDocumentPaths } from "./utils/revalidate-documents";
import { getTransporter, getFromEmail } from "@/lib/email/transporter";
import { isEmailConfigured } from "@/lib/config/email";
import { logger } from "@/lib/logger";
import { dispatchWebhookEvent } from "@kivvi/core/src/domain/webhooks";
import { getTranslations } from "next-intl/server";

// ============================================================================
// VALIDATION SCHEMAS FOR UNVALIDATED PARAMS
// ============================================================================

const updateStatusSchema = z.object({
  newStatus: z.enum(documentStatusEnum.enumValues),
});

const recordPaymentSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Invalid date"),
  method: z.enum(PAYMENT_METHOD_VALUES).optional(),
  reference: z.string().max(500).optional(),
});

const convertSchema = z.object({
  targetType: z.enum(documentTypeEnum.enumValues),
});

// ============================================================================
// SERVER ACTIONS
// ============================================================================

export async function createDocumentAction(
  input: unknown,
): Promise<ActionResult<{ id: string; number: string }>> {
  const t = await getTranslations("documents");
  try {
    const { companyId, userId } = await requireRole("member");

    const parsed = createDocumentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, ...formatZodError(parsed.error) };
    }

    const doc = await createDocument(db, companyId, userId, parsed.data);

    dispatchWebhookEvent(db, companyId, "document.created", {
      id: doc.id,
      number: doc.number,
      type: doc.type,
      status: doc.status,
      contactId: doc.contactId,
      total: doc.total,
    }).catch(() => {});

    revalidateDocumentPaths(doc.type, doc.id);
    return { success: true, data: { id: doc.id, number: doc.number } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorFailedToCreate")),
    };
  }
}

export async function updateDocumentAction(
  documentId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const t = await getTranslations("documents");
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
      error: safeErrorMessage(error, t("errorFailedToUpdate")),
    };
  }
}

export const deleteDocumentAction = createAction<string, void>({
  handler: async (documentId, { companyId, db }) => {
    const doc = await deleteDocument(db, companyId, documentId);
    revalidateDocumentPaths(doc.type);
  },
  errorMessage: () =>
    getTranslations("documents").then((t) => t("errorFailedToDelete")),
  minRole: "member",
});

export async function updateDocumentStatusAction(
  documentId: string,
  newStatus: DocumentStatus,
): Promise<ActionResult<{ id: string; status: string }>> {
  const t = await getTranslations("documents");
  try {
    const { companyId } = await requireRole("member");

    // Validate the status parameter
    const parsed = updateStatusSchema.safeParse({ newStatus });
    if (!parsed.success) {
      return { success: false, error: t("errorInvalidStatus") };
    }

    const doc = await updateDocumentStatus(
      db,
      companyId,
      documentId,
      parsed.data.newStatus as DocumentStatus,
    );

    dispatchWebhookEvent(db, companyId, "document.status_changed", {
      id: doc.id,
      number: doc.number,
      type: doc.type,
      status: doc.status,
      contactId: doc.contactId,
    }).catch(() => {});

    revalidateDocumentPaths(doc.type, doc.id);
    return { success: true, data: { id: doc.id, status: doc.status } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorFailedToUpdateStatus")),
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
  const t = await getTranslations("documents");
  try {
    const { companyId } = await requireRole("member");

    // Validate the payment input
    const parsed = recordPaymentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, ...formatZodError(parsed.error) };
    }

    const payment = await recordPayment(db, companyId, documentId, parsed.data);

    // Send payment confirmation email — optional, never fails the action
    if (isEmailConfigured()) {
      try {
        const doc = await getDocument(db, companyId, documentId);
        const contactEmail = doc?.contact?.email;
        if (doc && contactEmail) {
          const [company] = await db
            .select()
            .from(companies)
            .where(eq(companies.id, companyId));
          const companyName = company?.name || "Kivvi";
          const settings = (company?.settings as CompanySettings) ?? {};
          const plan = settings.plan || "free";

          const emailData = {
            recipientEmail: contactEmail,
            recipientName: doc.contact?.name || "Customer",
            companyName,
            documentNumber: doc.number,
            amount: parsed.data.amount,
            currency: doc.currency,
            paymentDate: parsed.data.date,
            plan,
          };

          const transporter = getTransporter();
          await transporter.sendMail({
            from: `${companyName} <${getFromEmail()}>`,
            to: contactEmail,
            subject: buildPaymentConfirmationEmailSubject(emailData),
            html: buildPaymentConfirmationEmailHtml(emailData),
          });
        }
      } catch (emailError) {
        // Email failure must not roll back a successful payment
        logger.warn(
          "[recordPaymentAction] Payment confirmation email failed",
          emailError,
        );
      }
    }

    dispatchWebhookEvent(db, companyId, "payment.received", {
      paymentId: payment.id,
      documentId,
      amount: parsed.data.amount,
      method: parsed.data.method ?? "bank_transfer",
      date: parsed.data.date,
    }).catch(() => {});

    revalidateDocumentPaths("invoice", documentId);
    return { success: true, data: { id: payment.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorFailedToRecordPayment")),
    };
  }
}

export async function convertDocumentAction(
  sourceDocumentId: string,
  targetType: DocumentType,
): Promise<ActionResult<{ id: string; number: string }>> {
  const t = await getTranslations("documents");
  try {
    const { companyId, userId } = await requireRole("member");

    // Validate the target type
    const parsed = convertSchema.safeParse({ targetType });
    if (!parsed.success) {
      return { success: false, error: t("errorInvalidTargetType") };
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
      error: safeErrorMessage(error, t("errorFailedToConvert")),
    };
  }
}

export const duplicateDocumentAction = createAction<
  string,
  { id: string; number: string; type: string }
>({
  handler: async (sourceDocumentId, { companyId, userId, db }) => {
    const doc = await duplicateDocument(
      db,
      companyId,
      userId,
      sourceDocumentId,
    );
    revalidateDocumentPaths(doc.type, doc.id);
    return { id: doc.id, number: doc.number, type: doc.type };
  },
  errorMessage: () =>
    getTranslations("documents").then((t) => t("errorFailedToDuplicate")),
  minRole: "member",
});
