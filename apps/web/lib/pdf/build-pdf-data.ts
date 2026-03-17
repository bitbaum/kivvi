import type { InvoicePdfData } from "@kivvi/core/src/domain/pdf-generation";
import type { CompanySettings } from "@kivvi/database";
import { DEFAULT_VAT_RATE } from "@/lib/config/vat-rates";

/**
 * Build InvoicePdfData from a document + company record.
 *
 * Shared between the PDF download route and the email attachment flow
 * so the same PDF is produced in both cases.
 */
export function buildInvoicePdfData(
  doc: {
    number: string;
    issueDate: Date | string;
    dueDate?: Date | string | null;
    contact?: {
      name?: string | null;
      address?: string | null;
      city?: string | null;
      postalCode?: string | null;
      country?: string | null;
      [key: string]: unknown;
    } | null;
    items?: Array<{
      position?: number | null;
      description: string;
      quantity: string;
      unitPrice: string;
      vatRate?: string | null;
      discount?: string | null;
      total: string;
      [key: string]: unknown;
    }>;
    subtotal: string;
    vatAmount: string;
    total: string;
    currency: string;
    qrReference?: string | null;
    notes?: string | null;
  },
  company: {
    name: string;
    legalName?: string | null;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
    country?: string | null;
    vatNumber?: string | null;
    settings?: CompanySettings | null;
  },
): InvoicePdfData {
  const settings = company.settings ?? {};

  // Resolve notes: use document notes, fall back to company default footer
  const notes = doc.notes || settings.defaultDocumentFooter || undefined;

  return {
    // Company info
    companyName: company.legalName || company.name,
    companyAddress: company.address || "",
    companyCity: company.city || "",
    companyPostalCode: company.postalCode || "",
    companyCountry: company.country || "CH",
    companyVatNumber: company.vatNumber || undefined,
    companyIban: settings.bankAccount?.iban || undefined,
    companyLogoBase64: settings.logoBase64 || undefined,

    // Document info
    number: doc.number,
    issueDate:
      doc.issueDate instanceof Date
        ? doc.issueDate.toISOString()
        : String(doc.issueDate),
    dueDate: doc.dueDate
      ? doc.dueDate instanceof Date
        ? doc.dueDate.toISOString()
        : String(doc.dueDate)
      : undefined,

    // Contact info
    contactName: doc.contact?.name || "",
    contactAddress: doc.contact?.address || undefined,
    contactCity: doc.contact?.city || undefined,
    contactPostalCode: doc.contact?.postalCode || undefined,
    contactCountry: doc.contact?.country || undefined,

    // Items
    items: (doc.items || []).map((item, index) => ({
      position: item.position ?? index + 1,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: item.vatRate || DEFAULT_VAT_RATE,
      discount: item.discount || "0",
      total: item.total,
    })),

    // Totals
    subtotal: doc.subtotal,
    vatAmount: doc.vatAmount,
    total: doc.total,
    currency: doc.currency,

    // QR Bill
    qrReference: doc.qrReference || undefined,
    notes,
  };
}
