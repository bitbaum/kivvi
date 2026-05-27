// ============================================================================
// EMAIL TEMPLATES — Domain logic for email generation
// ============================================================================

import { escapeHtml as e } from "../utils/html";

export interface InvoiceEmailData {
  recipientEmail: string;
  recipientName: string;
  companyName: string;
  documentNumber: string;
  documentType: string;
  total: string;
  currency: string;
  dueDate?: string;
  pdfUrl?: string;
  plan?: "free" | "premium";
}

import { DOCUMENT_TYPE_LABELS_DE } from "./document-conversions";
import { formatCurrency, formatDate } from "../utils/format";

// ============================================================================
// HTML TEMPLATE
// ============================================================================

/**
 * Returns the German greeting and body text based on document type.
 */
function getDocumentBody(data: InvoiceEmailData): {
  greeting: string;
  body: string;
  closing: string;
} {
  const typeLabel =
    DOCUMENT_TYPE_LABELS_DE[
      data.documentType as keyof typeof DOCUMENT_TYPE_LABELS_DE
    ] || data.documentType;
  const formattedTotal = formatCurrency(data.total, data.currency);

  const greeting = `Guten Tag ${e(data.recipientName)}`;

  let body: string;
  switch (data.documentType) {
    case "invoice":
      body = `Anbei erhalten Sie unsere ${typeLabel} <strong>${data.documentNumber}</strong> über <strong>${formattedTotal}</strong>.`;
      if (data.dueDate) {
        body += `<br><br>Zahlbar bis: <strong>${formatDate(data.dueDate)}</strong>`;
      }
      break;
    case "quote":
      body = `Anbei erhalten Sie unser ${typeLabel} <strong>${data.documentNumber}</strong> über <strong>${formattedTotal}</strong>.`;
      if (data.dueDate) {
        body += `<br><br>Gültig bis: <strong>${formatDate(data.dueDate)}</strong>`;
      }
      body += "<br><br>Wir freuen uns auf Ihre Rückmeldung.";
      break;
    case "credit_note":
      body = `Anbei erhalten Sie unsere ${typeLabel} <strong>${data.documentNumber}</strong> über <strong>${formattedTotal}</strong>.`;
      break;
    case "dunning":
      body =
        `Wir erlauben uns, Sie an die ausstehende Zahlung zu erinnern.<br><br>` +
        `${typeLabel}: <strong>${data.documentNumber}</strong><br>` +
        `Betrag: <strong>${formattedTotal}</strong>`;
      if (data.dueDate) {
        body += `<br>Fällig seit: <strong>${formatDate(data.dueDate)}</strong>`;
      }
      body +=
        "<br><br>Falls Sie die Zahlung bereits veranlasst haben, betrachten Sie dieses Schreiben als gegenstandslos.";
      break;
    case "delivery_note":
      body = `Anbei erhalten Sie unseren ${typeLabel} <strong>${data.documentNumber}</strong>.`;
      break;
    case "order":
    case "order_confirmation":
      body = `Anbei erhalten Sie unsere ${typeLabel} <strong>${data.documentNumber}</strong> über <strong>${formattedTotal}</strong>.`;
      break;
    case "purchase_order":
      body = `Anbei erhalten Sie unsere ${typeLabel} <strong>${data.documentNumber}</strong> über <strong>${formattedTotal}</strong>.`;
      break;
    case "purchase_invoice":
      body = `Anbei erhalten Sie unsere ${typeLabel} <strong>${data.documentNumber}</strong> über <strong>${formattedTotal}</strong>.`;
      break;
    default:
      body = `Anbei erhalten Sie das Dokument <strong>${data.documentNumber}</strong> über <strong>${formattedTotal}</strong>.`;
  }

  const closing = "Freundliche Grüsse";

  return { greeting, body, closing };
}

// ============================================================================
// PASSWORD RESET EMAIL
// ============================================================================

export interface PasswordResetEmailStrings {
  subject: string;
  greeting: string;
  bodyText: string;
  buttonText: string;
  expiryText: string;
  fallbackText: string;
  footerAuto: string;
}

export interface PasswordResetEmailData {
  recipientEmail: string;
  recipientName: string;
  resetUrl: string;
  companyName?: string;
}

export function buildPasswordResetEmailSubject(
  data: PasswordResetEmailData,
  strings?: PasswordResetEmailStrings,
): string {
  if (strings) return strings.subject;
  const companyName = data.companyName || "Kivvi";
  return `Passwort zurücksetzen - ${companyName}`;
}

export function buildPasswordResetEmailHtml(
  data: PasswordResetEmailData,
  strings?: PasswordResetEmailStrings,
): string {
  const companyName = e(data.companyName || "Kivvi");
  const greeting = strings
    ? strings.greeting
    : `Guten Tag ${e(data.recipientName)}`;
  const bodyText = strings
    ? strings.bodyText
    : "Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. Klicken Sie auf den untenstehenden Button, um Ihr Passwort zurückzusetzen.";
  const buttonText = strings ? strings.buttonText : "Passwort zurücksetzen";
  const expiryText = strings
    ? strings.expiryText
    : "Dieser Link ist 1 Stunde gültig. Falls Sie keine Anfrage zum Zurücksetzen Ihres Passworts gestellt haben, können Sie diese E-Mail ignorieren.";
  const fallbackText = strings
    ? strings.fallbackText
    : "Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:";
  const footerAuto = strings
    ? strings.footerAuto
    : `Diese E-Mail wurde automatisch von ${companyName} versendet.`;
  const title = strings
    ? e(strings.subject)
    : e(buildPasswordResetEmailSubject(data));

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #18181b;">
                ${companyName}
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                ${greeting}
              </p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                ${bodyText}
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #2563eb;">
                    <a href="${e(data.resetUrl)}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 15px; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                ${expiryText}
              </p>
              <p style="margin: 20px 0; font-size: 13px; line-height: 1.6; color: #a1a1aa;">
                ${fallbackText}<br>
                <a href="${e(data.resetUrl)}" style="color: #2563eb; word-break: break-all;">${e(data.resetUrl)}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                ${footerAuto}
              </p>
              <p style="margin: 8px 0 0; font-size: 11px; color: #a1a1aa; line-height: 1.5;">
                Versendet mit <a href="https://kivvi.ch" style="color: #2563eb; text-decoration: none;">Kivvi</a> — KI-gestützte ERP-Software für Schweizer Unternehmen
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================================================
// INVITATION EMAIL
// ============================================================================

export interface InvitationEmailStrings {
  subject: string;
  greeting: string;
  bodyHtml: string;
  roleText: string;
  buttonText: string;
  expiryText: string;
  fallbackText: string;
  footerAuto: string;
}

export interface InvitationEmailData {
  inviterName: string;
  companyName: string;
  acceptUrl: string;
  role: string;
}

export function buildInvitationEmailSubject(
  data: InvitationEmailData,
  strings?: InvitationEmailStrings,
): string {
  if (strings) return strings.subject;
  return `Einladung: ${data.companyName} auf Kivvi beitreten`;
}

export function buildInvitationEmailHtml(
  data: InvitationEmailData,
  strings?: InvitationEmailStrings,
): string {
  const title = strings
    ? e(strings.subject)
    : e(buildInvitationEmailSubject(data));
  const greeting = strings ? strings.greeting : "Guten Tag";
  const bodyHtml = strings
    ? strings.bodyHtml
    : `${e(data.inviterName)} hat Sie eingeladen, <strong>${e(data.companyName)}</strong> auf Kivvi beizutreten.`;
  const roleText = strings
    ? strings.roleText
    : `Rolle: <strong>${e(data.role)}</strong>`;
  const buttonText = strings ? strings.buttonText : "Einladung annehmen";
  const expiryText = strings
    ? strings.expiryText
    : "Diese Einladung ist 7 Tage gültig. Falls Sie diese Einladung nicht erwartet haben, können Sie diese E-Mail ignorieren.";
  const fallbackText = strings
    ? strings.fallbackText
    : "Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:";
  const footerAuto = strings
    ? strings.footerAuto
    : "Diese E-Mail wurde automatisch versendet.";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #18181b;">
                Kivvi
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                ${greeting}
              </p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                ${bodyHtml}
              </p>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #71717a;">
                ${roleText}
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #2563eb;">
                    <a href="${e(data.acceptUrl)}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 15px; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                ${expiryText}
              </p>
              <p style="margin: 20px 0; font-size: 13px; line-height: 1.6; color: #a1a1aa;">
                ${fallbackText}<br>
                <a href="${e(data.acceptUrl)}" style="color: #2563eb; word-break: break-all;">${e(data.acceptUrl)}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                ${footerAuto}
              </p>
              <p style="margin: 8px 0 0; font-size: 11px; color: #a1a1aa; line-height: 1.5;">
                Versendet mit <a href="https://kivvi.ch" style="color: #2563eb; text-decoration: none;">Kivvi</a> — KI-gestützte ERP-Software für Schweizer Unternehmen
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================================================
// PAYMENT CONFIRMATION EMAIL
// ============================================================================

export interface PaymentConfirmationEmailStrings {
  subject: string;
  greeting: string;
  bodyHtml: string;
  thanks: string;
  closing: string;
  footerAuto: string;
  footerBranding?: string;
}

export interface PaymentConfirmationEmailData {
  recipientEmail: string;
  recipientName: string;
  companyName: string;
  documentNumber: string;
  amount: string;
  currency: string;
  paymentDate: string;
  plan?: "free" | "premium";
}

export function buildPaymentConfirmationEmailSubject(
  data: PaymentConfirmationEmailData,
  strings?: PaymentConfirmationEmailStrings,
): string {
  if (strings) return strings.subject;
  return `Zahlung erhalten – ${data.documentNumber}`;
}

export function buildPaymentConfirmationEmailHtml(
  data: PaymentConfirmationEmailData,
  strings?: PaymentConfirmationEmailStrings,
): string {
  const formattedAmount = formatCurrency(data.amount, data.currency);
  const formattedDate = formatDate(data.paymentDate);
  const safeCompanyName = e(data.companyName);
  const safeRecipientName = e(data.recipientName);

  const title = strings
    ? e(strings.subject)
    : e(buildPaymentConfirmationEmailSubject(data));
  const greeting = strings
    ? strings.greeting
    : `Guten Tag ${safeRecipientName}`;
  const bodyHtml = strings
    ? strings.bodyHtml
    : `Wir bestätigen den Eingang Ihrer Zahlung über <strong>${formattedAmount}</strong> für Rechnung <strong>${data.documentNumber}</strong> vom <strong>${formattedDate}</strong>.`;
  const thanks = strings ? strings.thanks : "Vielen Dank für Ihre Zahlung.";
  const closing = strings ? strings.closing : "Freundliche Grüsse";
  const footerAuto = strings
    ? strings.footerAuto
    : `Diese E-Mail wurde automatisch von ${safeCompanyName} versendet.`;
  const footerBrandingHtml = strings
    ? strings.footerBranding
      ? `
              <p style="margin: 8px 0 0; font-size: 11px; color: #a1a1aa; line-height: 1.5;">
                ${strings.footerBranding}
              </p>`
      : ""
    : data.plan !== "premium"
      ? `
              <p style="margin: 8px 0 0; font-size: 11px; color: #a1a1aa; line-height: 1.5;">
                Versendet mit <a href="https://kivvi.ch" style="color: #2563eb; text-decoration: none;">Kivvi</a> — KI-gestützte ERP-Software für Schweizer Unternehmen
              </p>`
      : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #18181b;">
                ${safeCompanyName}
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                ${greeting}
              </p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                ${bodyHtml}
              </p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                ${thanks}
              </p>
              <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                ${closing}<br>
                ${safeCompanyName}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                ${footerAuto}
              </p>${footerBrandingHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================================================
// DONATION RECEIPT EMAIL
// ============================================================================

export interface DonationReceiptEmailData {
  recipientEmail: string;
  recipientName: string;
  companyName: string;
  receiptNumber: string;
  itemCount: number;
  estimatedValue?: string;
  currency: string;
  date: string;
  plan?: "free" | "premium";
}

/**
 * Pre-composed i18n strings for the donation receipt email.
 * Resolved by the Server Action (which has next-intl access) and passed here.
 * HTML fragments (greeting, bodyLine1, bodyLine2, footerAuto) must have all
 * user-controlled values HTML-escaped by the caller before passing.
 */
export interface DonationReceiptEmailStrings {
  subject: string;
  greeting: string;
  bodyLine1: string;
  bodyLine2: string;
  closing: string;
  footerAuto: string;
  footerBranding?: string;
  attachmentFilename: string;
}

export function buildDonationReceiptEmailSubject(
  data: DonationReceiptEmailData,
  strings?: DonationReceiptEmailStrings,
): string {
  if (strings) return strings.subject;
  return `Spendenquittung ${data.receiptNumber} - ${data.companyName}`;
}

export function buildDonationReceiptEmailHtml(
  data: DonationReceiptEmailData,
  strings?: DonationReceiptEmailStrings,
): string {
  const formattedDate = formatDate(data.date);
  const safeCompanyName = e(data.companyName);
  const safeRecipientName = e(data.recipientName);
  const valueText =
    data.estimatedValue && Number(data.estimatedValue) > 0
      ? ` im geschätzten Wert von <strong>${formatCurrency(data.estimatedValue, data.currency)}</strong>`
      : "";

  const title = strings
    ? e(strings.subject)
    : e(buildDonationReceiptEmailSubject(data));
  const greeting = strings
    ? strings.greeting
    : `Guten Tag ${safeRecipientName}`;
  const bodyLine1 = strings
    ? strings.bodyLine1
    : `Herzlichen Dank für Ihre Spende vom <strong>${formattedDate}</strong>. Wir haben <strong>${data.itemCount} ${data.itemCount === 1 ? "Artikel" : "Artikel"}</strong>${valueText} erhalten.`;
  const bodyLine2 = strings
    ? strings.bodyLine2
    : `Im Anhang finden Sie die Spendenquittung <strong>${data.receiptNumber}</strong>, die Sie für Ihre Steuererklärung verwenden können (Art. 33a DBG).`;
  const closing = strings ? e(strings.closing) : "Freundliche Grüsse";
  const footerAuto = strings
    ? strings.footerAuto
    : `Diese E-Mail wurde automatisch von ${safeCompanyName} versendet.`;
  const footerBrandingHtml = strings
    ? strings.footerBranding
      ? `
              <p style="margin: 8px 0 0; font-size: 11px; color: #a1a1aa; line-height: 1.5;">
                ${strings.footerBranding}
              </p>`
      : ""
    : data.plan !== "premium"
      ? `
              <p style="margin: 8px 0 0; font-size: 11px; color: #a1a1aa; line-height: 1.5;">
                Versendet mit <a href="https://kivvi.ch" style="color: #2563eb; text-decoration: none;">Kivvi</a> — KI-gestützte ERP-Software für Schweizer Unternehmen
              </p>`
      : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #18181b;">
                ${safeCompanyName}
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                ${greeting}
              </p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                ${bodyLine1}
              </p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                ${bodyLine2}
              </p>
              <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                ${closing}<br>
                ${safeCompanyName}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                ${footerAuto}
              </p>${footerBrandingHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================================================
// DOCUMENT EMAIL
// ============================================================================

export interface InvoiceEmailStrings {
  subject: string;
  greeting: string;
  bodyHtml: string;
  closing: string;
  footerAuto: string;
  footerBranding?: string;
}

export function buildInvoiceEmailSubject(
  data: InvoiceEmailData,
  strings?: InvoiceEmailStrings,
): string {
  if (strings) return strings.subject;
  const typeLabel =
    DOCUMENT_TYPE_LABELS_DE[
      data.documentType as keyof typeof DOCUMENT_TYPE_LABELS_DE
    ] || data.documentType;
  return `${typeLabel} ${data.documentNumber} - ${data.companyName}`;
}

export function buildInvoiceEmailHtml(
  data: InvoiceEmailData,
  strings?: InvoiceEmailStrings,
): string {
  const safeCompanyName = e(data.companyName);

  let greeting: string;
  let body: string;
  let closing: string;
  let footerAuto: string;
  let footerBrandingHtml: string;
  let title: string;

  if (strings) {
    title = e(strings.subject);
    greeting = strings.greeting;
    body = strings.bodyHtml;
    closing = strings.closing;
    footerAuto = strings.footerAuto;
    footerBrandingHtml = strings.footerBranding
      ? `
              <p style="margin: 8px 0 0; font-size: 11px; color: #a1a1aa; line-height: 1.5;">
                ${strings.footerBranding}
              </p>`
      : "";
  } else {
    const docBody = getDocumentBody(data);
    title = e(buildInvoiceEmailSubject(data));
    greeting = docBody.greeting;
    body = docBody.body;
    closing = docBody.closing;
    footerAuto = `Diese E-Mail wurde automatisch von ${safeCompanyName} versendet.`;
    footerBrandingHtml =
      data.plan !== "premium"
        ? `
              <p style="margin: 8px 0 0; font-size: 11px; color: #a1a1aa; line-height: 1.5;">
                Versendet mit <a href="https://kivvi.ch" style="color: #2563eb; text-decoration: none;">Kivvi</a> — KI-gestützte ERP-Software für Schweizer Unternehmen
              </p>`
        : "";
  }

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #18181b;">
                ${safeCompanyName}
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                ${greeting}
              </p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                ${body}
              </p>
              <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                ${closing}<br>
                ${safeCompanyName}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                ${footerAuto}
              </p>${footerBrandingHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================================================
// WELCOME EMAIL — sent once on registration
// ============================================================================

export interface WelcomeEmailStrings {
  subject: string;
  greeting: string;
  body1Html: string;
  body2: string;
  buttonText: string;
  featuresHeading: string;
  feature1: string;
  feature2: string;
  feature3: string;
  feature4: string;
  footerAuto: string;
}

export interface WelcomeEmailData {
  userName: string;
  userEmail: string;
  companyName: string;
  loginUrl: string;
}

export function buildWelcomeEmailSubject(
  data: WelcomeEmailData,
  strings?: WelcomeEmailStrings,
): string {
  if (strings) return strings.subject;
  return `Willkommen bei Kivvi, ${data.userName}!`;
}

export function buildWelcomeEmailHtml(
  data: WelcomeEmailData,
  strings?: WelcomeEmailStrings,
): string {
  const safeUserName = e(data.userName);
  const safeCompanyName = e(data.companyName);
  const safeUserEmail = e(data.userEmail);

  const greeting = strings ? strings.greeting : `Hallo ${safeUserName}!`;
  const body1Html = strings
    ? strings.body1Html
    : `Willkommen bei Kivvi! Dein Konto für <strong>${safeCompanyName}</strong> wurde erfolgreich erstellt.`;
  const body2 = strings
    ? strings.body2
    : "Mit Kivvi kannst du Rechnungen, Kontakte, Lagerbestand und mehr verwalten — alles auf Schweizer Standards ausgerichtet.";
  const buttonText = strings ? strings.buttonText : "Zu Kivvi →";
  const featuresHeading = strings
    ? strings.featuresHeading
    : "Was dich erwartet";
  const feature1 = strings
    ? strings.feature1
    : "Rechnungen mit QR-Einzahlungsschein (gesetzlich vorgeschrieben)";
  const feature2 = strings
    ? strings.feature2
    : "Inventarverwaltung mit Zustandsbewertung und Reparatur-Workflow";
  const feature3 = strings
    ? strings.feature3
    : "CO&#8322;-Wirkungsberichte für Vereinsberichte und Förderanträge";
  const feature4 = strings
    ? strings.feature4
    : "KI-Assistent für schnelle Dateneingabe und Auswertungen";
  const footerAuto = strings
    ? strings.footerAuto
    : `Diese E-Mail wurde automatisch versendet, weil sich jemand mit dieser Adresse (${safeUserEmail}) bei Kivvi registriert hat.`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${strings ? e(strings.subject) : "Willkommen bei Kivvi"}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 32px 40px 24px; background-color: #16a34a; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Kivvi</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: rgba(255,255,255,0.8);">KI-gestützte ERP-Software für Schweizer Unternehmen</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 40px 24px;">
              <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #18181b;">${greeting}</p>
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                ${body1Html}
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                ${body2}
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius: 8px; background-color: #16a34a;">
                    <a href="${e(data.loginUrl)}" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">${buttonText}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e4e4e7;">
                <tr>
                  <td style="padding-top: 24px;">
                    <p style="margin: 0 0 12px; font-size: 13px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">${featuresHeading}</p>
                    <ul style="margin: 0; padding: 0 0 0 20px; font-size: 14px; line-height: 2; color: #3f3f46;">
                      <li>${feature1}</li>
                      <li>${feature2}</li>
                      <li>${feature3}</li>
                      <li>${feature4}</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                ${footerAuto}
              </p>
              <p style="margin: 8px 0 0; font-size: 11px; color: #a1a1aa;">
                <a href="https://kivvi.ch" style="color: #2563eb; text-decoration: none;">kivvi.ch</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
