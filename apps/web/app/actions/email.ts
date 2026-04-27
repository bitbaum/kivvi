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
import {
  buildInvoiceEmailHtml,
  buildInvoiceEmailSubject,
  buildDonationReceiptEmailHtml,
  buildDonationReceiptEmailSubject,
  buildPasswordResetEmailHtml,
  buildPasswordResetEmailSubject,
} from "@kivvi/core/src/domain/email";
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

const sendEmailSchema = z.object({
  documentId: z.string().uuid(),
  recipientEmail: z.string().email("Invalid email address"),
  ccSender: z.boolean().optional(),
});

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
      return {
        success: false,
        error:
          "Email sending is not configured. Please set EMAIL_USER and EMAIL_PASS in the environment variables or contact the administrator.",
      };
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
      recipientName: doc.contact?.name || "Customer",
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

    const info = await transporter.sendMail({
      from: `${companyName} <${getFromEmail()}>`,
      to: parsed.data.recipientEmail,
      ...(ccEmail ? { cc: ccEmail } : {}),
      subject: buildInvoiceEmailSubject(emailData),
      html: buildInvoiceEmailHtml(emailData),
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
      return {
        success: false,
        error: "Receipt only available for donation intakes",
      };
    if (doc.status === "draft")
      return {
        success: false,
        error: "Confirm the intake before sending the receipt",
      };

    // Resolve donor contact
    const donorId = doc.donorId || doc.contactId;
    if (!donorId) {
      return {
        success: false,
        error:
          "No donor linked to this intake. Please add a donor contact first.",
      };
    }

    const [donor] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, donorId), eq(contacts.companyId, companyId)))
      .limit(1);

    if (!donor?.email) {
      return {
        success: false,
        error:
          "The donor contact has no email address. Please add one before sending.",
      };
    }

    // Check email configuration
    if (!isEmailConfigured()) {
      return {
        success: false,
        error:
          "Email sending is not configured. Please set EMAIL_USER and EMAIL_PASS in the environment variables or contact the administrator.",
      };
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
      ? new Date(doc.issueDate).toLocaleDateString("de-CH")
      : new Date().toLocaleDateString("de-CH");

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
      currency: doc.currency || "CHF",
    });

    const emailData = {
      recipientEmail: donor.email,
      recipientName: donor.name,
      companyName,
      receiptNumber: doc.number,
      itemCount: items.length,
      estimatedValue,
      currency: doc.currency || "CHF",
      date,
      plan: plan as "free" | "premium",
    };

    const info = await transporter.sendMail({
      from: `${companyName} <${getFromEmail()}>`,
      to: donor.email,
      subject: buildDonationReceiptEmailSubject(emailData),
      html: buildDonationReceiptEmailHtml(emailData),
      attachments: [
        {
          filename: `Spendenquittung-${doc.number}.pdf`,
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
    subject: buildPasswordResetEmailSubject(emailData),
    html: buildPasswordResetEmailHtml(emailData),
  });
}
