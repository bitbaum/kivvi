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
  listDocuments,
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
  type PaymentConfirmationEmailStrings,
} from "@kivvi/core/src/domain/email";
import { escapeHtml } from "@kivvi/core/src/utils/html";
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
import { getTranslations } from "next-intl/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  AMOUNT_REGEX,
  DATE_REGEX,
} from "@kivvi/core/src/utils/validation-patterns";

// ============================================================================
// VALIDATION SCHEMAS FOR UNVALIDATED PARAMS
// ============================================================================

const updateStatusSchema = z.object({
  newStatus: z.enum(documentStatusEnum.enumValues),
});

const recordPaymentSchema = z.object({
  amount: z.string().regex(AMOUNT_REGEX, "Invalid amount"),
  date: z.string().regex(DATE_REGEX, "Invalid date"),
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
  translateDomainErrors: true,
});

export async function updateDocumentStatusAction(
  documentId: string,
  newStatus: DocumentStatus,
): Promise<ActionResult<{ id: string; status: string }>> {
  const [t, tDomain] = await Promise.all([
    getTranslations("documents"),
    getTranslations("domainErrors"),
  ]);
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

    revalidateDocumentPaths(doc.type, doc.id);
    return { success: true, data: { id: doc.id, status: doc.status } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(
        error,
        t("errorFailedToUpdateStatus"),
        (code, params) =>
          tDomain(code as Parameters<typeof tDomain>[0], params),
      ),
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
  const [t, tDomain] = await Promise.all([
    getTranslations("documents"),
    getTranslations("domainErrors"),
  ]);
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
            recipientName: doc.contact?.name || t("emailRecipientFallback"),
            companyName,
            documentNumber: doc.number,
            amount: parsed.data.amount,
            currency: doc.currency,
            paymentDate: parsed.data.date,
            plan,
          };

          const tDoc = await getTranslations("documents");
          const formattedAmount = formatCurrency(
            emailData.amount,
            emailData.currency,
          );
          const formattedPaymentDate = formatDate(emailData.paymentDate);

          const confirmStrings: PaymentConfirmationEmailStrings = {
            subject: tDoc("paymentConfirmationSubject", {
              number: emailData.documentNumber,
            }),
            greeting: `${tDoc("emailGreeting")} ${escapeHtml(emailData.recipientName)}`,
            bodyHtml: tDoc("paymentConfirmationBody", {
              amount: `<strong>${formattedAmount}</strong>`,
              number: `<strong>${emailData.documentNumber}</strong>`,
              date: `<strong>${formattedPaymentDate}</strong>`,
            }),
            thanks: tDoc("paymentConfirmationThanks"),
            closing: tDoc("emailClosing"),
            footerAuto: tDoc("emailFooterAuto", {
              companyName: escapeHtml(companyName),
            }),
            footerBranding:
              plan !== "premium" ? tDoc("emailFooterBranding") : undefined,
          };

          const transporter = getTransporter();
          await transporter.sendMail({
            from: `${companyName} <${getFromEmail()}>`,
            to: contactEmail,
            subject: buildPaymentConfirmationEmailSubject(
              emailData,
              confirmStrings,
            ),
            html: buildPaymentConfirmationEmailHtml(emailData, confirmStrings),
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

    revalidateDocumentPaths("invoice", documentId);
    return { success: true, data: { id: payment.id } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(
        error,
        t("errorFailedToRecordPayment"),
        (code, params) =>
          tDomain(code as Parameters<typeof tDomain>[0], params),
      ),
    };
  }
}

export async function convertDocumentAction(
  sourceDocumentId: string,
  targetType: DocumentType,
): Promise<ActionResult<{ id: string; number: string }>> {
  const [t, tDomain] = await Promise.all([
    getTranslations("documents"),
    getTranslations("domainErrors"),
  ]);
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
      error: safeErrorMessage(
        error,
        t("errorFailedToConvert"),
        (code, params) =>
          tDomain(code as Parameters<typeof tDomain>[0], params),
      ),
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

export interface DocumentSearchResult {
  id: string;
  number: string | null;
  type: string;
  total: string | null;
  status: string;
  contact: { id: string; name: string } | null;
}

export const searchDocumentsAction = createAction<
  { q: string; type?: string },
  DocumentSearchResult[]
>({
  handler: async ({ q, type }, { companyId, db }) => {
    if (q.length < 2) return [];
    const result = await listDocuments(db, companyId, {
      search: q,
      type: type as "invoice" | "credit_note" | "purchase_invoice" | undefined,
      pageSize: 20,
      sortBy: "issueDate",
      sortOrder: "desc",
    });
    return result.data.map((doc) => ({
      id: doc.id,
      number: doc.number,
      type: doc.type,
      total: doc.total,
      status: doc.status,
      contact: doc.contact || null,
    }));
  },
  errorMessage: () =>
    getTranslations("documents").then((t) => t("errorFailedToSearch")),
  minRole: "member",
});
