// ============================================================================
// EMAIL TEMPLATES — Domain logic for email generation
// ============================================================================

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

  const greeting = `Guten Tag ${data.recipientName}`;

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
  const companyName = data.companyName || "Kivvi";

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${buildPasswordResetEmailSubject(data)}</title>
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
                Guten Tag ${data.recipientName}
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
  <title>${buildInvitationEmailSubject(data)}</title>
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
                ${data.inviterName} hat Sie eingeladen, <strong>${data.companyName}</strong> auf Kivvi beizutreten.
              </p>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #71717a;">
                Rolle: <strong>${data.role}</strong>
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
// DOCUMENT EMAIL
// ============================================================================

export function buildInvoiceEmailHtml(data: InvoiceEmailData): string {
  const { greeting, body, closing } = getDocumentBody(data);

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${buildInvoiceEmailSubject(data)}</title>
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
                ${data.companyName}
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
                ${data.companyName}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                Diese E-Mail wurde automatisch von ${data.companyName} versendet.
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
