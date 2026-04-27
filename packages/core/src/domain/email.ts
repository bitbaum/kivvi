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
import { DEFAULT_LOCALE } from "../config/locale";

// ============================================================================
// SUBJECT LINE
// ============================================================================

export function buildInvoiceEmailSubject(data: InvoiceEmailData): string {
  const typeLabel =
    DOCUMENT_TYPE_LABELS_DE[
      data.documentType as keyof typeof DOCUMENT_TYPE_LABELS_DE
    ] || data.documentType;
  return `${typeLabel} ${data.documentNumber} - ${data.companyName}`;
}

// ============================================================================
// HTML TEMPLATE
// ============================================================================

/**
 * Formats a date string (YYYY-MM-DD or ISO) to Swiss format (DD.MM.YYYY).
 */
function formatDateSwiss(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(DEFAULT_LOCALE);
}

/**
 * Formats a numeric string with currency for display in emails.
 * Uses Swiss number formatting (e.g., CHF 1'234.50).
 */
function formatAmountSwiss(amount: string, currency: string): string {
  const num = Number(amount);
  if (isNaN(num)) return `${currency} ${amount}`;
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency,
  }).format(num);
}

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
  const formattedTotal = formatAmountSwiss(data.total, data.currency);

  const greeting = `Guten Tag ${e(data.recipientName)}`;

  let body: string;
  switch (data.documentType) {
    case "invoice":
      body = `Anbei erhalten Sie unsere ${typeLabel} <strong>${data.documentNumber}</strong> über <strong>${formattedTotal}</strong>.`;
      if (data.dueDate) {
        body += `<br><br>Zahlbar bis: <strong>${formatDateSwiss(data.dueDate)}</strong>`;
      }
      break;
    case "quote":
      body = `Anbei erhalten Sie unser ${typeLabel} <strong>${data.documentNumber}</strong> über <strong>${formattedTotal}</strong>.`;
      if (data.dueDate) {
        body += `<br><br>Gültig bis: <strong>${formatDateSwiss(data.dueDate)}</strong>`;
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
        body += `<br>Fällig seit: <strong>${formatDateSwiss(data.dueDate)}</strong>`;
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

export interface PasswordResetEmailData {
  recipientEmail: string;
  recipientName: string;
  resetUrl: string;
  companyName?: string;
}

export function buildPasswordResetEmailSubject(
  data: PasswordResetEmailData,
): string {
  const companyName = data.companyName || "Kivvi";
  return `Passwort zurücksetzen - ${companyName}`;
}

export function buildPasswordResetEmailHtml(
  data: PasswordResetEmailData,
): string {
  const companyName = e(data.companyName || "Kivvi");

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${e(buildPasswordResetEmailSubject(data))}</title>
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
                Guten Tag ${e(data.recipientName)}
              </p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. Klicken Sie auf den untenstehenden Button, um Ihr Passwort zurückzusetzen.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #2563eb;">
                    <a href="${data.resetUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 15px; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500;">
                      Passwort zurücksetzen
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                Dieser Link ist 1 Stunde gültig. Falls Sie keine Anfrage zum Zurücksetzen Ihres Passworts gestellt haben, können Sie diese E-Mail ignorieren.
              </p>
              <p style="margin: 20px 0; font-size: 13px; line-height: 1.6; color: #a1a1aa;">
                Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
                <a href="${data.resetUrl}" style="color: #2563eb; word-break: break-all;">${data.resetUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                Diese E-Mail wurde automatisch von ${companyName} versendet.
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

export interface InvitationEmailData {
  inviterName: string;
  companyName: string;
  acceptUrl: string;
  role: string;
}

export function buildInvitationEmailSubject(data: InvitationEmailData): string {
  return `Einladung: ${data.companyName} auf Kivvi beitreten`;
}

export function buildInvitationEmailHtml(data: InvitationEmailData): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${e(buildInvitationEmailSubject(data))}</title>
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
                Guten Tag
              </p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                ${e(data.inviterName)} hat Sie eingeladen, <strong>${e(data.companyName)}</strong> auf Kivvi beizutreten.
              </p>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #71717a;">
                Rolle: <strong>${e(data.role)}</strong>
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td style="border-radius: 6px; background-color: #2563eb;">
                    <a href="${data.acceptUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 15px; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500;">
                      Einladung annehmen
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 20px 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                Diese Einladung ist 7 Tage gültig. Falls Sie diese Einladung nicht erwartet haben, können Sie diese E-Mail ignorieren.
              </p>
              <p style="margin: 20px 0; font-size: 13px; line-height: 1.6; color: #a1a1aa;">
                Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
                <a href="${data.acceptUrl}" style="color: #2563eb; word-break: break-all;">${data.acceptUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                Diese E-Mail wurde automatisch versendet.
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
): string {
  return `Zahlung erhalten – ${data.documentNumber}`;
}

export function buildPaymentConfirmationEmailHtml(
  data: PaymentConfirmationEmailData,
): string {
  const formattedAmount = formatAmountSwiss(data.amount, data.currency);
  const formattedDate = formatDateSwiss(data.paymentDate);
  const safeCompanyName = e(data.companyName);
  const safeRecipientName = e(data.recipientName);

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${e(buildPaymentConfirmationEmailSubject(data))}</title>
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
                Guten Tag ${safeRecipientName}
              </p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                Wir bestätigen den Eingang Ihrer Zahlung über <strong>${formattedAmount}</strong> für Rechnung <strong>${data.documentNumber}</strong> vom <strong>${formattedDate}</strong>.
              </p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                Vielen Dank für Ihre Zahlung.
              </p>
              <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                Freundliche Grüsse<br>
                ${safeCompanyName}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                Diese E-Mail wurde automatisch von ${safeCompanyName} versendet.
              </p>${
                data.plan !== "premium"
                  ? `
              <p style="margin: 8px 0 0; font-size: 11px; color: #a1a1aa; line-height: 1.5;">
                Versendet mit <a href="https://kivvi.ch" style="color: #2563eb; text-decoration: none;">Kivvi</a> — KI-gestützte ERP-Software für Schweizer Unternehmen
              </p>`
                  : ""
              }
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

export function buildDonationReceiptEmailSubject(
  data: DonationReceiptEmailData,
): string {
  return `Spendenquittung ${data.receiptNumber} - ${data.companyName}`;
}

export function buildDonationReceiptEmailHtml(
  data: DonationReceiptEmailData,
): string {
  const formattedDate = formatDateSwiss(data.date);
  const safeCompanyName = e(data.companyName);
  const safeRecipientName = e(data.recipientName);
  const valueText =
    data.estimatedValue && Number(data.estimatedValue) > 0
      ? ` im geschätzten Wert von <strong>${formatAmountSwiss(data.estimatedValue, data.currency)}</strong>`
      : "";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${e(buildDonationReceiptEmailSubject(data))}</title>
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
                Guten Tag ${safeRecipientName}
              </p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                Herzlichen Dank für Ihre Spende vom <strong>${formattedDate}</strong>. Wir haben <strong>${data.itemCount} ${data.itemCount === 1 ? "Artikel" : "Artikel"}</strong>${valueText} erhalten.
              </p>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                Im Anhang finden Sie die Spendenquittung <strong>${data.receiptNumber}</strong>, die Sie für Ihre Steuererklärung verwenden können (Art. 33a DBG).
              </p>
              <p style="margin: 0 0 8px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                Freundliche Grüsse<br>
                ${safeCompanyName}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                Diese E-Mail wurde automatisch von ${safeCompanyName} versendet.
              </p>${
                data.plan !== "premium"
                  ? `
              <p style="margin: 8px 0 0; font-size: 11px; color: #a1a1aa; line-height: 1.5;">
                Versendet mit <a href="https://kivvi.ch" style="color: #2563eb; text-decoration: none;">Kivvi</a> — KI-gestützte ERP-Software für Schweizer Unternehmen
              </p>`
                  : ""
              }
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

export function buildInvoiceEmailHtml(data: InvoiceEmailData): string {
  const { greeting, body, closing } = getDocumentBody(data);
  const safeCompanyName = e(data.companyName);

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${e(buildInvoiceEmailSubject(data))}</title>
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
                Diese E-Mail wurde automatisch von ${safeCompanyName} versendet.
              </p>${
                data.plan !== "premium"
                  ? `
              <p style="margin: 8px 0 0; font-size: 11px; color: #a1a1aa; line-height: 1.5;">
                Versendet mit <a href="https://kivvi.ch" style="color: #2563eb; text-decoration: none;">Kivvi</a> — KI-gestützte ERP-Software für Schweizer Unternehmen
              </p>`
                  : ""
              }
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

export interface WelcomeEmailData {
  userName: string;
  userEmail: string;
  companyName: string;
  loginUrl: string;
}

export function buildWelcomeEmailSubject(data: WelcomeEmailData): string {
  return `Willkommen bei Kivvi, ${data.userName}!`;
}

export function buildWelcomeEmailHtml(data: WelcomeEmailData): string {
  const safeUserName = e(data.userName);
  const safeCompanyName = e(data.companyName);
  const safeUserEmail = e(data.userEmail);
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Willkommen bei Kivvi</title>
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
              <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #18181b;">Hallo ${safeUserName}!</p>
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                Willkommen bei Kivvi! Dein Konto für <strong>${safeCompanyName}</strong> wurde erfolgreich erstellt.
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #3f3f46;">
                Mit Kivvi kannst du Rechnungen, Kontakte, Lagerbestand und mehr verwalten — alles auf Schweizer Standards ausgerichtet.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius: 8px; background-color: #16a34a;">
                    <a href="${data.loginUrl}" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">Zu Kivvi →</a>
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
                    <p style="margin: 0 0 12px; font-size: 13px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Was dich erwartet</p>
                    <ul style="margin: 0; padding: 0 0 0 20px; font-size: 14px; line-height: 2; color: #3f3f46;">
                      <li>Rechnungen mit QR-Einzahlungsschein (gesetzlich vorgeschrieben)</li>
                      <li>Inventarverwaltung mit Zustandsbewertung und Reparatur-Workflow</li>
                      <li>CO&#8322;-Wirkungsberichte für Vereinsberichte und Förderanträge</li>
                      <li>KI-Assistent für schnelle Dateneingabe und Auswertungen</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                Diese E-Mail wurde automatisch versendet, weil sich jemand mit dieser Adresse (${safeUserEmail}) bei Kivvi registriert hat.
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
