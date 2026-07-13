"use server";

import { z } from "zod";
import Decimal from "decimal.js";
import { and, desc, eq } from "drizzle-orm";
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
  createRepairLaborInvoice,
  createRepairLaborInvoiceSchema,
} from "@kivvi/core";
import {
  documentStatusEnum,
  documentTypeEnum,
  PAYMENT_METHOD_VALUES,
  companies,
  talerOrders,
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
import { revalidatePath } from "next/cache";
import {
  AMOUNT_REGEX,
  DATE_REGEX,
} from "@kivvi/core/src/utils/validation-patterns";
import {
  createTalerOrder,
  getTalerOrderStatus,
  talerTimestampToDate,
} from "@/lib/taler-client";
import { decryptIntegrationSecret } from "@/lib/integration-secrets";

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

function sanitizeTalerError(error: unknown): string {
  if (!(error instanceof Error)) return "GNU Taler request failed";
  if (error.name === "AbortError") return "GNU Taler request timed out";
  return error.message.replace(
    /secret-token:[^\s"]+/g,
    "secret-token:[redacted]",
  );
}

function buildKivviOrderId(documentId: string) {
  return `kivvi-${documentId.replace(/-/g, "").slice(0, 24)}-${Date.now()}`;
}

async function loadTalerConfig(companyId: string) {
  const [company] = await db
    .select({ settings: companies.settings })
    .from(companies)
    .where(eq(companies.id, companyId));
  const settings = (company?.settings as CompanySettings) ?? {};
  const config = settings.taler;

  if (
    !config?.enabled ||
    !config.merchantBackendUrl ||
    !config.accessToken ||
    !config.instance
  ) {
    throw new Error("GNU Taler is not configured.");
  }

  return {
    merchantBackendUrl: config.merchantBackendUrl,
    instance: config.instance,
    accessToken: decryptIntegrationSecret(config.accessToken) || "",
    enabled: config.enabled ?? true,
  };
}

function talerStatus(
  status: Awaited<ReturnType<typeof getTalerOrderStatus>>,
): "unpaid" | "claimed" | "paid" | "refunded" {
  if (status.order_status === "paid" && status.refunded) return "refunded";
  return status.order_status;
}

// ============================================================================
// SERVER ACTIONS
// ============================================================================

export async function createRepairLaborInvoiceAction(
  input: unknown,
): Promise<ActionResult<{ id: string; number: string }>> {
  const t = await getTranslations("inventory");
  try {
    const { companyId, userId } = await requireRole("member");

    const parsed = createRepairLaborInvoiceSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, ...formatZodError(parsed.error) };
    }

    const doc = await db.transaction(async (tx) =>
      createRepairLaborInvoice(tx, companyId, userId, parsed.data),
    );

    revalidateDocumentPaths(doc.type, doc.id);
    revalidatePath("/intake");
    return { success: true, data: { id: doc.id, number: doc.number } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorRepairLaborInvoice")),
    };
  }
}

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

export async function createTalerPaymentOrderAction(
  documentId: string,
): Promise<ActionResult<{ paymentUrl: string | null; orderId: string }>> {
  const t = await getTranslations("documents");
  try {
    const { companyId } = await requireRole("member");
    const doc = await getDocument(db, companyId, documentId);
    if (!doc) return { success: false, error: t("errorNotFound") };
    if (doc.type !== "invoice") {
      return { success: false, error: t("taler.invoiceOnly") };
    }
    if (doc.status === "draft" || doc.status === "cancelled") {
      return { success: false, error: t("taler.invoiceNotReady") };
    }

    const existing = await db
      .select()
      .from(talerOrders)
      .where(
        and(
          eq(talerOrders.companyId, companyId),
          eq(talerOrders.documentId, documentId),
        ),
      )
      .orderBy(desc(talerOrders.createdAt))
      .limit(1);

    const active = existing.find((order) =>
      ["unpaid", "claimed"].includes(order.status),
    );
    if (active) {
      return {
        success: true,
        data: {
          paymentUrl: active.orderStatusUrl || active.talerPayUri || null,
          orderId: active.orderId,
        },
      };
    }

    const outstanding = doc.payments?.length
      ? new Decimal(doc.total || "0").minus(
          doc.payments.reduce(
            (sum, payment) => sum.plus(payment.amount || "0"),
            new Decimal(0),
          ),
        )
      : new Decimal(doc.total || "0");
    if (outstanding.lte(0)) {
      return { success: false, error: t("taler.nothingToCollect") };
    }

    const config = await loadTalerConfig(companyId);
    const orderId = buildKivviOrderId(documentId);
    const result = await createTalerOrder(config, {
      orderId,
      amount: outstanding.toFixed(2),
      currency: doc.currency || "CHF",
      summary: `${doc.number} ${doc.contact?.name || "Kivvi invoice"}`,
      fulfillmentUrl: `${
        process.env.NEXT_PUBLIC_APP_URL || "https://kivvi.orangecat.ch"
      }/sales/invoices/${doc.id}`,
      fulfillmentMessage: t("taler.fulfillmentMessage", {
        number: doc.number,
      }),
      payDeadline: doc.dueDate || undefined,
      products: doc.items?.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    });

    const status = talerStatus(result.status);
    const [created] = await db
      .insert(talerOrders)
      .values({
        companyId,
        documentId,
        orderId: result.response.order_id,
        status,
        amount: outstanding.toFixed(2),
        currency: doc.currency || "CHF",
        talerPayUri: result.status.taler_pay_uri,
        orderStatusUrl: result.status.order_status_url,
        payDeadline: talerTimestampToDate(
          result.status.pay_deadline || result.response.pay_deadline,
        ),
        paidAt:
          status === "paid"
            ? talerTimestampToDate(result.status.last_payment) || new Date()
            : null,
        lastCheckedAt: new Date(),
        raw: { create: result.response, status: result.status },
      })
      .returning();

    revalidateDocumentPaths(doc.type, doc.id);
    return {
      success: true,
      data: {
        paymentUrl: created.orderStatusUrl || created.talerPayUri || null,
        orderId: created.orderId,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, sanitizeTalerError(error)),
    };
  }
}

export async function refreshTalerPaymentOrderAction(
  talerOrderId: string,
): Promise<ActionResult<{ status: string }>> {
  try {
    const { companyId } = await requireRole("member");
    const [order] = await db
      .select()
      .from(talerOrders)
      .where(
        and(
          eq(talerOrders.id, talerOrderId),
          eq(talerOrders.companyId, companyId),
        ),
      )
      .limit(1);

    if (!order) return { success: false, error: "GNU Taler order not found." };

    const config = await loadTalerConfig(companyId);
    const statusResponse = await getTalerOrderStatus(config, order.orderId);
    const status = talerStatus(statusResponse);
    const paidAt =
      status === "paid"
        ? talerTimestampToDate(statusResponse.last_payment) || new Date()
        : null;

    await db
      .update(talerOrders)
      .set({
        status,
        talerPayUri: statusResponse.taler_pay_uri || order.talerPayUri,
        orderStatusUrl: statusResponse.order_status_url || order.orderStatusUrl,
        payDeadline:
          talerTimestampToDate(statusResponse.pay_deadline) ||
          order.payDeadline,
        paidAt,
        lastCheckedAt: new Date(),
        lastError: null,
        raw: statusResponse,
        updatedAt: new Date(),
      })
      .where(eq(talerOrders.id, order.id));

    if (status === "paid") {
      const doc = await getDocument(db, companyId, order.documentId);
      const alreadyRecorded = doc?.payments?.some(
        (payment) => payment.reference === `GNU Taler ${order.orderId}`,
      );
      if (doc && !alreadyRecorded) {
        const outstanding = new Decimal(doc.total || "0").minus(
          (doc.payments || []).reduce(
            (sum, payment) => sum.plus(payment.amount || "0"),
            new Decimal(0),
          ),
        );
        const amountToRecord = Decimal.min(
          outstanding,
          new Decimal(order.amount),
        );
        if (amountToRecord.gt(0)) {
          await recordPayment(db, companyId, order.documentId, {
            amount: amountToRecord.toFixed(2),
            date: (paidAt || new Date()).toISOString().slice(0, 10),
            method: "other",
            reference: `GNU Taler ${order.orderId}`,
          });
        }
      }
    }

    const doc = await getDocument(db, companyId, order.documentId);
    if (doc) revalidateDocumentPaths(doc.type, doc.id);
    return { success: true, data: { status } };
  } catch (error) {
    try {
      const { companyId } = await requireRole("member");
      await db
        .update(talerOrders)
        .set({
          lastCheckedAt: new Date(),
          lastError: sanitizeTalerError(error),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(talerOrders.id, talerOrderId),
            eq(talerOrders.companyId, companyId),
          ),
        );
    } catch {
      // Keep original response.
    }
    return { success: false, error: sanitizeTalerError(error) };
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
