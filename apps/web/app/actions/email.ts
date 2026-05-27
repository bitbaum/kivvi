"use server";

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  companies,
  contacts,
  documentItems,
  documents,
  users,
} from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { getDocument } from "@kivvi/core";
import {
  updateDocumentStatus,
  isValidTransition,
} from "@kivvi/core/src/domain/documents";
import {
  generateInvoicePdf,
  generateDonationReceiptPdf,
} from "@kivvi/core/src/domain/pdf-generation";
import { buildInvoicePdfData } from "@/lib/pdf/build-pdf-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DEFAULT_CURRENCY } from "@kivvi/core/src/config/locale";
import {
  buildInvoiceEmailHtml,
  buildInvoiceEmailSubject,
  buildDonationReceiptEmailHtml,
  buildDonationReceiptEmailSubject,
  buildPasswordResetEmailHtml,
  buildPasswordResetEmailSubject,
  type DonationReceiptEmailStrings,
  type InvoiceEmailStrings,
  type PasswordResetEmailStrings,
} from "@kivvi/core/src/domain/email";
import { escapeHtml } from "@kivvi/core/src/utils/html";
import Decimal from "decimal.js";
import {
  type ActionResult,
  getSession,
  requireRole,
  safeErrorMessage,
} from "./utils";
import { revalidatePath } from "next/cache";
import { getTransporter, getFromEmail } from "@/lib/email/transporter";
import { isEmailConfigured } from "@/lib/config/email";
import { getTranslations } from "next-intl/server";

// ============================================================================
// VALIDATION
// ============================================================================

// ============================================================================
// SERVER ACTION
// ============================================================================

export async function sendDocumentEmailAction(
  documentId: string,
  recipientEmail: string,
  ccSender?: boolean,
): Promise<ActionResult<{ messageId: string }>> {
  const t = await getTranslations("documents");
  try {
    const { companyId, userId } = await requireRole("member");

    // Validate inputs
    const sendEmailSchema = z.object({
      documentId: z.string().uuid(),
      recipientEmail: z.string().email(t("emailInvalid")),
      ccSender: z.boolean().optional(),
    });
    const parsed = sendEmailSchema.safeParse({
      documentId,
      recipientEmail,
      ccSender,
    });
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return { success: false, error: firstError.message };
    }

    // Fetch document with tenant isolation
    const doc = await getDocument(db, companyId, parsed.data.documentId);
    if (!doc) return { success: false, error: t("errorNotFound") };

    // Check email configuration
    if (!isEmailConfigured()) {
      return { success: false, error: t("errorEmailNotConfigured") };
    }

    const transporter = getTransporter();

    // Fetch full company record for email + PDF generation
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));

    const companyName = company?.name || "Kivvi";
    const settings = (company?.settings as CompanySettings) ?? {};
    const plan = settings.plan || "free";

    const emailData = {
      recipientEmail: parsed.data.recipientEmail,
      recipientName: doc.contact?.name || t("emailRecipientFallback"),
      companyName,
      documentNumber: doc.number,
      documentType: doc.type,
      total: doc.total,
      currency: doc.currency,
      dueDate: doc.dueDate
        ? new Date(doc.dueDate).toISOString().split("T")[0]
        : undefined,
      plan,
    };

    // Generate PDF attachment
    const pdfData = buildInvoicePdfData(doc, {
      ...company,
      settings,
    });
    const pdfBuffer = await generateInvoicePdf(pdfData);

    // Resolve Cc email if requested
    let ccEmail: string | undefined;
    if (parsed.data.ccSender) {
      const [senderUser] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (senderUser?.email) ccEmail = senderUser.email;
    }

    // Map document type to i18n key
    const DOC_TYPE_I18N_KEY: Record<string, string> = {
      invoice: "invoice",
      quote: "quote",
      order: "order",
      order_confirmation: "orderConfirmation",
      delivery_note: "deliveryNote",
      credit_note: "creditNote",
      dunning: "dunning",
      intake: "intake",
      purchase_order: "purchaseOrder",
      purchase_invoice: "purchaseInvoice",
    };
    const typeLabel = t(
      (DOC_TYPE_I18N_KEY[emailData.documentType] ?? "document") as Parameters<
        typeof t
      >[0],
    );

    const formattedTotal = formatCurrency(emailData.total, emailData.currency);
    const formattedDueDate = emailData.dueDate
      ? formatDate(emailData.dueDate)
      : null;

    const numHtml = `<strong>${emailData.documentNumber}</strong>`;
    const amtHtml = `<strong>${formattedTotal}</strong>`;
    const dueDateHtml = formattedDueDate
      ? `<strong>${formattedDueDate}</strong>`
      : null;

    let bodyHtml: string;
    if (emailData.documentType === "dunning") {
      bodyHtml =
        `${t("emailBodyDunningIntro")}<br><br>` +
        `${typeLabel}: ${numHtml}<br>` +
        `${t("emailBodyDunningAmount")}: ${amtHtml}`;
      if (dueDateHtml)
        bodyHtml += `<br>${t("emailBodyDunningOverdue")}: ${dueDateHtml}`;
      bodyHtml += `<br><br>${t("emailBodyDunningIgnore")}`;
    } else if (emailData.documentType === "delivery_note") {
      bodyHtml = t("emailBodyDeliveryLine", {
        typeLabel,
        number: numHtml,
      });
    } else if (emailData.documentType === "quote") {
      bodyHtml = t("emailBodyQuoteLine", {
        typeLabel,
        number: numHtml,
        amount: amtHtml,
      });
      if (dueDateHtml)
        bodyHtml += `<br><br>${t("emailBodyValidUntil")}: ${dueDateHtml}`;
      bodyHtml += `<br><br>${t("emailBodyFeedback")}`;
    } else {
      bodyHtml = t("emailBodyStandardLine", {
        typeLabel,
        number: numHtml,
        amount: amtHtml,
      });
      if (dueDateHtml && emailData.documentType === "invoice") {
        bodyHtml += `<br><br>${t("emailBodyDueDate")}: ${dueDateHtml}`;
      }
    }

    const invoiceStrings: InvoiceEmailStrings = {
      subject: buildInvoiceEmailSubject(emailData),
      greeting: `${t("emailGreeting")} ${escapeHtml(emailData.recipientName)}`,
      bodyHtml,
      closing: t("emailClosing"),
      footerAuto: t("emailFooterAuto", {
        companyName: escapeHtml(companyName),
      }),
      footerBranding: plan !== "premium" ? t("emailFooterBranding") : undefined,
    };

    const info = await transporter.sendMail({
      from: `${companyName} <${getFromEmail()}>`,
      to: parsed.data.recipientEmail,
      ...(ccEmail ? { cc: ccEmail } : {}),
      subject: buildInvoiceEmailSubject(emailData, invoiceStrings),
      html: buildInvoiceEmailHtml(emailData, invoiceStrings),
      attachments: [
        {
          filename: `${doc.number}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    // Record last email send timestamp + recipient
    await db
      .update(documents)
      .set({
        lastEmailedAt: new Date(),
        lastEmailedTo: parsed.data.recipientEmail,
      })
      .where(
        and(
          eq(documents.id, parsed.data.documentId),
          eq(documents.companyId, companyId),
        ),
      );

    // Auto-transition to "sent" if the document is still in draft/confirmed
    // (emailing IS the act of sending — no need for a separate status change)
    if (isValidTransition(doc.status, "sent")) {
      await updateDocumentStatus(db, companyId, parsed.data.documentId, "sent");
    }

    revalidatePath(`/sales/invoices/${documentId}`);
    revalidatePath(`/sales/quotes/${documentId}`);
    revalidatePath(`/documents/${documentId}`);

    return { success: true, data: { messageId: info.messageId || "" } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorEmailCouldNotBeSent")),
    };
  }
}

// ============================================================================
// DONATION RECEIPT EMAIL ACTION
// ============================================================================

export async function sendDonationReceiptEmailAction(
  intakeId: string,
): Promise<ActionResult<{ messageId: string }>> {
  const t = await getTranslations("documents");
  try {
    const { companyId } = await requireRole("member");

    if (!intakeId) return { success: false, error: t("errorIntakeIdRequired") };

    // Fetch intake document with tenant isolation
    const doc = await getDocument(db, companyId, intakeId);
    if (!doc) return { success: false, error: t("errorNotFound") };
    if (doc.type !== "intake")
      return { success: false, error: t("errorNotAnIntake") };
    if (doc.intakeSource !== "donation")
      return { success: false, error: t("errorReceiptDonationOnly") };
    if (doc.status === "draft")
      return { success: false, error: t("errorReceiptConfirmFirst") };

    // Resolve donor contact
    const donorId = doc.donorId || doc.contactId;
    if (!donorId) {
      return { success: false, error: t("errorNoDonorLinked") };
    }

    const [donor] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, donorId), eq(contacts.companyId, companyId)))
      .limit(1);

    if (!donor?.email) {
      return { success: false, error: t("errorNoDonorEmail") };
    }

    // Check email configuration
    if (!isEmailConfigured()) {
      return { success: false, error: t("errorEmailNotConfigured") };
    }

    const transporter = getTransporter();

    // Fetch company
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));

    const companyName = company?.name || "Kivvi";
    const settings = (company?.settings as CompanySettings) ?? {};
    const plan = settings.plan || "free";

    // Fetch document items
    const items = await db
      .select()
      .from(documentItems)
      .where(eq(documentItems.documentId, intakeId));

    // Calculate estimated total with Decimal (never float arithmetic on money)
    const total = items.reduce(
      (sum, item) =>
        sum.plus(
          new Decimal(item.unitPrice || "0").times(item.quantity || "1"),
        ),
      new Decimal(0),
    );
    const estimatedValue = total.gt(0) ? total.toFixed(2) : undefined;

    // Format date
    const date = doc.issueDate
      ? formatDate(doc.issueDate)
      : formatDate(new Date());

    // Generate PDF
    const pdfBuffer = await generateDonationReceiptPdf({
      companyName,
      companyAddress: company?.address || "",
      companyCity: company?.city || "",
      companyPostalCode: company?.postalCode || "",
      companyLogoBase64: settings.logoBase64,
      donorName: donor.name,
      donorAddress: donor.address || undefined,
      donorCity: donor.city || undefined,
      donorPostalCode: donor.postalCode || undefined,
      number: doc.number,
      date,
      items: items.map((item) => ({
        description: item.description || "",
        quantity: item.quantity || "1",
      })),
      estimatedTotalValue: estimatedValue,
      currency: doc.currency || DEFAULT_CURRENCY,
    });

    const emailData = {
      recipientEmail: donor.email,
      recipientName: donor.name,
      companyName,
      receiptNumber: doc.number,
      itemCount: items.length,
      estimatedValue,
      currency: doc.currency || DEFAULT_CURRENCY,
      date,
      plan: plan as "free" | "premium",
    };

    const currency = doc.currency || DEFAULT_CURRENCY;
    const fmtAmount = estimatedValue
      ? formatCurrency(estimatedValue, currency)
      : null;
    const itemUnit =
      items.length === 1
        ? t("donationReceiptEmailItemSingular")
        : t("donationReceiptEmailItemPlural");
    const valueHtml = fmtAmount
      ? ` ${t("donationReceiptEmailValuePrefix")} <strong>${fmtAmount}</strong>`
      : "";

    const emailStrings: DonationReceiptEmailStrings = {
      subject: t("donationReceiptEmailSubject", {
        receiptNumber: doc.number,
        companyName,
      }),
      greeting: `${t("donationReceiptEmailGreeting")} ${escapeHtml(donor.name)}`,
      bodyLine1: `${t("donationReceiptEmailThankYouPrefix")} <strong>${date}</strong>. ${t("donationReceiptEmailReceivedPrefix")} <strong>${items.length} ${itemUnit}</strong>${valueHtml} ${t("donationReceiptEmailReceivedSuffix")}.`,
      bodyLine2: `${t("donationReceiptEmailReceiptRefPrefix")} <strong>${doc.number}</strong>, ${t("donationReceiptEmailReceiptRefSuffix")}`,
      closing: t("donationReceiptEmailClosing"),
      footerAuto: t("donationReceiptEmailFooterAuto", {
        companyName: escapeHtml(companyName),
      }),
      footerBranding:
        plan !== "premium"
          ? t("donationReceiptEmailFooterBranding")
          : undefined,
      attachmentFilename: t("donationReceiptEmailFilename", {
        receiptNumber: doc.number,
      }),
    };

    const info = await transporter.sendMail({
      from: `${companyName} <${getFromEmail()}>`,
      to: donor.email,
      subject: buildDonationReceiptEmailSubject(emailData, emailStrings),
      html: buildDonationReceiptEmailHtml(emailData, emailStrings),
      attachments: [
        {
          filename: emailStrings.attachmentFilename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    revalidatePath(`/intake/${intakeId}`);

    return { success: true, data: { messageId: info.messageId || "" } };
  } catch (error) {
    return {
      success: false,
      error: safeErrorMessage(error, t("errorReceiptCouldNotBeSent")),
    };
  }
}

// ============================================================================
// PASSWORD RESET EMAIL
// ============================================================================

/**
 * Sends a password reset email with a secure token link.
 * Used by password-reset.ts server action.
 */
export async function sendPasswordResetEmail(
  recipientEmail: string,
  recipientName: string,
  resetUrl: string,
  strings?: PasswordResetEmailStrings,
): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error(
      "Email sending is not configured. Please set EMAIL_USER and EMAIL_PASS in the environment variables or contact the administrator.",
    );
  }

  const transporter = getTransporter();

  const emailData = {
    recipientEmail,
    recipientName,
    resetUrl,
    companyName: "Kivvi",
  };

  await transporter.sendMail({
    from: `Kivvi <${getFromEmail()}>`,
    to: recipientEmail,
    subject: buildPasswordResetEmailSubject(emailData, strings),
    html: buildPasswordResetEmailHtml(emailData, strings),
  });
}
