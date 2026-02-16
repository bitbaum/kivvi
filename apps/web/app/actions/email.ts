'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { getDocument } from '@kivvi/core';
import {
  buildInvoiceEmailHtml,
  buildInvoiceEmailSubject,
  buildPasswordResetEmailHtml,
  buildPasswordResetEmailSubject,
} from '@kivvi/core/src/domain/email';
import { type ActionResult, getSession, safeErrorMessage } from './utils';
import { revalidatePath } from 'next/cache';
import { getTransporter, getFromEmail } from '@/lib/email/transporter';
import { isEmailConfigured } from '@/lib/config/email';

// ============================================================================
// VALIDATION
// ============================================================================

const sendEmailSchema = z.object({
  documentId: z.string().uuid(),
  recipientEmail: z.string().email('Ungültige E-Mail-Adresse'),
});

// ============================================================================
// SERVER ACTION
// ============================================================================

export async function sendDocumentEmailAction(
  documentId: string,
  recipientEmail: string
): Promise<ActionResult<{ messageId: string }>> {
  try {
    const { companyId } = await getSession();

    // Validate inputs
    const parsed = sendEmailSchema.safeParse({ documentId, recipientEmail });
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return { success: false, error: firstError.message };
    }

    // Fetch document with tenant isolation
    const doc = await getDocument(db, companyId, parsed.data.documentId);
    if (!doc) return { success: false, error: 'Dokument nicht gefunden' };

    // Check email configuration
    if (!isEmailConfigured()) {
      return { success: false, error: 'E-Mail-Versand ist nicht konfiguriert (EMAIL_USER und EMAIL_PASS fehlen)' };
    }

    const transporter = getTransporter();

    // Build email data
    // TODO: get companyName from company settings once available
    const emailData = {
      recipientEmail: parsed.data.recipientEmail,
      recipientName: doc.contact?.name || 'Kunde',
      companyName: 'Kivvi', // TODO: fetch from company settings
      documentNumber: doc.number,
      documentType: doc.type,
      total: doc.total,
      currency: doc.currency,
      dueDate: doc.dueDate ? new Date(doc.dueDate).toISOString().split('T')[0] : undefined,
    };

    const info = await transporter.sendMail({
      from: `${emailData.companyName} <${getFromEmail()}>`,
      to: parsed.data.recipientEmail,
      subject: buildInvoiceEmailSubject(emailData),
      html: buildInvoiceEmailHtml(emailData),
    });

    // Revalidate the document detail page to reflect any future "last emailed" state
    revalidatePath(`/sales/invoices/${documentId}`);

    return { success: true, data: { messageId: info.messageId || '' } };
  } catch (error) {
    return { success: false, error: safeErrorMessage(error, 'E-Mail konnte nicht gesendet werden') };
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
  resetUrl: string
): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error('E-Mail-Versand ist nicht konfiguriert (EMAIL_USER und EMAIL_PASS fehlen)');
  }

  const transporter = getTransporter();

  const emailData = {
    recipientEmail,
    recipientName,
    resetUrl,
    companyName: 'Kivvi',
  };

  await transporter.sendMail({
    from: `Kivvi <${getFromEmail()}>`,
    to: recipientEmail,
    subject: buildPasswordResetEmailSubject(emailData),
    html: buildPasswordResetEmailHtml(emailData),
  });
}
