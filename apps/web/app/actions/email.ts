"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { getDocument } from "@kivvi/core";
import {
  updateDocumentStatus,
  isValidTransition,
} from "@kivvi/core/src/domain/documents";
import { generateInvoicePdf } from "@kivvi/core/src/domain/pdf-generation";
import { buildInvoicePdfData } from "@/lib/pdf/build-pdf-data";
import {
  buildInvoiceEmailHtml,
  buildInvoiceEmailSubject,
  buildPasswordResetEmailHtml,
  buildPasswordResetEmailSubject,
} from "@kivvi/core/src/domain/email";
import {
  type ActionResult,
  getSession,
  requireRole,
  safeErrorMessage,
} from "./utils";
import { revalidatePath } from "next/cache";
import { getTransporter, getFromEmail } from "@/lib/email/transporter";
import { isEmailConfigured } from "@/lib/config/email";

// ============================================================================
// VALIDATION
// ============================================================================

const sendEmailSchema = z.object({
  documentId: z.string().uuid(),
  recipientEmail: z.string().email("Ungültige E-Mail-Adresse"),
});

// ============================================================================
// SERVER ACTION
// ============================================================================

export async function sendDocumentEmailAction(
  documentId: string,
  recipientEmail: string,
): Promise<ActionResult<{ messageId: string }>> {
  try {
    const { companyId } = await requireRole("member");

    // Validate inputs
    const parsed = sendEmailSchema.safeParse({ documentId, recipientEmail });
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return { success: false, error: firstError.message };
    }

    // Fetch document with tenant isolation
    const doc = await getDocument(db, companyId, parsed.data.documentId);
    if (!doc) return { success: false, error: "Document not found" };

    // Check email configuration
    if (!isEmailConfigured()) {
      return {
        success: false,
        error:
          "E-Mail-Versand ist nicht konfiguriert. Bitte setzen Sie EMAIL_USER und EMAIL_PASS in den Umgebungsvariablen oder kontaktieren Sie den Administrator.",
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
      recipientName: doc.contact?.name || "Kunde",
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

    const info = await transporter.sendMail({
      from: `${companyName} <${getFromEmail()}>`,
      to: parsed.data.recipientEmail,
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
      error: safeErrorMessage(error, "E-Mail konnte nicht gesendet werden"),
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
      "E-Mail-Versand ist nicht konfiguriert. Bitte setzen Sie EMAIL_USER und EMAIL_PASS in den Umgebungsvariablen oder kontaktieren Sie den Administrator.",
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
