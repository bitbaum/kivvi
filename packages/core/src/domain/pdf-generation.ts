import PDFDocument from "pdfkit";
import Decimal from "decimal.js";
import { SwissQRBill } from "swissqrbill/pdf";
import type { Data as QRBillData } from "swissqrbill/types";
import { logger } from "../logger";

// ============================================================================
// TYPES
// ============================================================================

export interface InvoicePdfData {
  // Company info
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyPostalCode: string;
  companyCountry: string;
  companyVatNumber?: string;
  companyIban?: string;
  companyLogoBase64?: string; // data:image/<type>;base64,...

  // Document info
  number: string;
  issueDate: string;
  dueDate?: string;

  // Contact info
  contactName: string;
  contactAddress?: string;
  contactCity?: string;
  contactPostalCode?: string;
  contactCountry?: string;

  // Items
  items: Array<{
    position: number;
    description: string;
    quantity: string;
    unitPrice: string;
    vatRate: string;
    discount: string;
    total: string;
  }>;

  // Totals
  subtotal: string;
  vatAmount: string;
  total: string;
  currency: string;

  // QR Bill
  qrReference?: string;
  notes?: string;
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format a number string with Swiss formatting: 1'234.50
 * Note: parseFloat used for display formatting only (not calculations).
 */
function formatSwissAmount(value: string, currency: string = "CHF"): string {
  // Display-only: converting already-calculated amount for formatting
  const num = parseFloat(value);
  if (isNaN(num)) return currency ? `${currency} 0.00` : "0.00";

  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split(".");

  // Add apostrophe as thousands separator (Swiss style)
  const withSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'");

  const formatted = `${withSeparators}.${decPart}`;
  return currency ? `${currency} ${formatted}` : formatted;
}

/**
 * Format an ISO date string as DD.MM.YYYY (Swiss format).
 */
function formatSwissDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

// ============================================================================
// PDF GENERATION
// ============================================================================

// Layout constants (A4: 595.28 x 841.89 points)
const MARGIN_LEFT = 57; // ~20mm
const MARGIN_RIGHT = 57;
const MARGIN_TOP = 57;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const FONT_REGULAR = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";
const COLOR_BLACK = "#000000";
const COLOR_GRAY = "#666666";
const COLOR_LIGHT_GRAY = "#E5E5E5";

/**
 * Generate a PDF invoice with optional Swiss QR-bill as a Buffer.
 *
 * Layout:
 * - Header: Company info (left), Document number + date (right)
 * - Contact address block
 * - Items table (Pos, Description, Qty, Unit Price, VAT, Discount, Total)
 * - Totals (Subtotal, VAT, Total)
 * - Notes
 * - Swiss QR-bill at bottom (if IBAN and reference provided)
 */
export async function generateInvoicePdf(
  data: InvoicePdfData,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: MARGIN_TOP,
        bottom: 57,
        left: MARGIN_LEFT,
        right: MARGIN_RIGHT,
      },
      info: {
        Title: `${data.number}`,
        Author: data.companyName,
        Subject: `Invoice ${data.number}`,
      },
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ---- Header: Company logo + info (left) ----
    let headerY = MARGIN_TOP;

    if (data.companyLogoBase64) {
      try {
        // Strip data URI prefix to get raw base64 for PDFKit
        const base64Data = data.companyLogoBase64.replace(
          /^data:image\/\w+;base64,/,
          "",
        );
        const logoBuffer = Buffer.from(base64Data, "base64");

        // Max dimensions: 170pt wide (~60mm) x 71pt tall (~25mm)
        const MAX_LOGO_W = 170;
        const MAX_LOGO_H = 71;

        doc.image(logoBuffer, MARGIN_LEFT, MARGIN_TOP, {
          fit: [MAX_LOGO_W, MAX_LOGO_H],
        });

        // Move headerY below logo + small gap
        headerY = MARGIN_TOP + MAX_LOGO_H + 8;
      } catch (logoError) {
        // If logo rendering fails, fall back to text-only header
        logger.error("Logo rendering failed", logoError);
      }
    }

    doc
      .font(FONT_BOLD)
      .fontSize(14)
      .fillColor(COLOR_BLACK)
      .text(data.companyName, MARGIN_LEFT, headerY);

    doc.font(FONT_REGULAR).fontSize(9).fillColor(COLOR_GRAY);

    headerY = doc.y + 4;
    if (data.companyAddress) {
      doc.text(data.companyAddress, MARGIN_LEFT, headerY);
      headerY = doc.y;
    }
    if (data.companyPostalCode || data.companyCity) {
      doc.text(
        `${data.companyPostalCode || ""} ${data.companyCity || ""}`.trim(),
        MARGIN_LEFT,
        headerY,
      );
      headerY = doc.y;
    }
    if (data.companyVatNumber) {
      doc.text(`MWST: ${data.companyVatNumber}`, MARGIN_LEFT, headerY);
      headerY = doc.y;
    }

    // ---- Header: Document info (right) ----
    const rightColumnX = PAGE_WIDTH - MARGIN_RIGHT - 180;

    doc
      .font(FONT_BOLD)
      .fontSize(20)
      .fillColor(COLOR_BLACK)
      .text(data.number, rightColumnX, MARGIN_TOP, {
        width: 180,
        align: "right",
      });

    doc.font(FONT_REGULAR).fontSize(9).fillColor(COLOR_GRAY);

    let infoY = MARGIN_TOP + 28;

    doc.text(`Datum: ${formatSwissDate(data.issueDate)}`, rightColumnX, infoY, {
      width: 180,
      align: "right",
    });
    infoY += 14;

    if (data.dueDate) {
      doc.text(
        `Fällig: ${formatSwissDate(data.dueDate)}`,
        rightColumnX,
        infoY,
        {
          width: 180,
          align: "right",
        },
      );
      infoY += 14;
    }

    // ---- Contact address block ----
    const addressY = Math.max(headerY, infoY) + 30;

    doc
      .font(FONT_BOLD)
      .fontSize(10)
      .fillColor(COLOR_BLACK)
      .text(data.contactName, MARGIN_LEFT, addressY);

    doc.font(FONT_REGULAR).fontSize(10).fillColor(COLOR_BLACK);

    if (data.contactAddress) {
      doc.text(data.contactAddress, MARGIN_LEFT);
    }
    if (data.contactPostalCode || data.contactCity) {
      doc.text(
        `${data.contactPostalCode || ""} ${data.contactCity || ""}`.trim(),
        MARGIN_LEFT,
      );
    }
    if (data.contactCountry && data.contactCountry !== "CH") {
      doc.text(data.contactCountry, MARGIN_LEFT);
    }

    // ---- Items table ----
    const tableTop = doc.y + 40;

    // Column definitions (x position and width)
    const cols = {
      pos: { x: MARGIN_LEFT, w: 30 },
      desc: {
        x: MARGIN_LEFT + 30,
        w: CONTENT_WIDTH - 30 - 55 - 65 - 45 - 45 - 70,
      },
      qty: { x: 0, w: 55 },
      price: { x: 0, w: 65 },
      vat: { x: 0, w: 45 },
      disc: { x: 0, w: 45 },
      total: { x: 0, w: 70 },
    };

    // Calculate x positions for right-aligned columns
    cols.total.x = PAGE_WIDTH - MARGIN_RIGHT - cols.total.w;
    cols.disc.x = cols.total.x - cols.disc.w;
    cols.vat.x = cols.disc.x - cols.vat.w;
    cols.price.x = cols.vat.x - cols.price.w;
    cols.qty.x = cols.price.x - cols.qty.w;
    cols.desc.w = cols.qty.x - cols.desc.x;

    // Table header
    doc.font(FONT_BOLD).fontSize(8).fillColor(COLOR_GRAY);

    doc.text("Pos", cols.pos.x, tableTop, { width: cols.pos.w });
    doc.text("Beschreibung", cols.desc.x, tableTop, { width: cols.desc.w });
    doc.text("Menge", cols.qty.x, tableTop, {
      width: cols.qty.w,
      align: "right",
    });
    doc.text("Einzelpreis", cols.price.x, tableTop, {
      width: cols.price.w,
      align: "right",
    });
    doc.text("MWST", cols.vat.x, tableTop, {
      width: cols.vat.w,
      align: "right",
    });
    doc.text("Rabatt", cols.disc.x, tableTop, {
      width: cols.disc.w,
      align: "right",
    });
    doc.text("Total", cols.total.x, tableTop, {
      width: cols.total.w,
      align: "right",
    });

    // Header line
    const lineY = tableTop + 14;
    doc
      .moveTo(MARGIN_LEFT, lineY)
      .lineTo(PAGE_WIDTH - MARGIN_RIGHT, lineY)
      .strokeColor(COLOR_LIGHT_GRAY)
      .lineWidth(0.5)
      .stroke();

    // Table rows
    let rowY = lineY + 6;

    doc.font(FONT_REGULAR).fontSize(9).fillColor(COLOR_BLACK);

    for (const item of data.items) {
      // Check if we need a new page (leave room for totals + QR-bill)
      if (rowY > 550) {
        doc.addPage();
        rowY = MARGIN_TOP;
      }

      // Display-only: check if discount is positive
      const discountStr = new Decimal(item.discount).greaterThan(0)
        ? `${item.discount}%`
        : "-";
      const qtyStr = formatQuantity(item.quantity);

      doc.font(FONT_REGULAR).fontSize(9).fillColor(COLOR_GRAY);
      doc.text(String(item.position), cols.pos.x, rowY, { width: cols.pos.w });

      doc.fillColor(COLOR_BLACK);
      doc.text(item.description, cols.desc.x, rowY, { width: cols.desc.w });

      // Get the height of the description text to handle multi-line descriptions
      const descHeight = doc.heightOfString(item.description, {
        width: cols.desc.w,
      });
      const currentRowBottom = rowY + Math.max(descHeight, 14);

      doc.text(qtyStr, cols.qty.x, rowY, { width: cols.qty.w, align: "right" });
      doc.text(formatSwissAmount(item.unitPrice, ""), cols.price.x, rowY, {
        width: cols.price.w,
        align: "right",
      });
      doc.text(`${item.vatRate}%`, cols.vat.x, rowY, {
        width: cols.vat.w,
        align: "right",
      });
      doc.text(discountStr, cols.disc.x, rowY, {
        width: cols.disc.w,
        align: "right",
      });
      doc
        .font(FONT_BOLD)
        .text(formatSwissAmount(item.total, ""), cols.total.x, rowY, {
          width: cols.total.w,
          align: "right",
        });

      rowY = currentRowBottom + 4;
    }

    // Separator before totals
    rowY += 4;
    doc
      .moveTo(MARGIN_LEFT, rowY)
      .lineTo(PAGE_WIDTH - MARGIN_RIGHT, rowY)
      .strokeColor(COLOR_LIGHT_GRAY)
      .lineWidth(0.5)
      .stroke();

    rowY += 10;

    // ---- Totals ----
    const totalsLabelX = cols.disc.x - 80;
    const totalsValueX = cols.total.x;
    const totalsValueW = cols.total.w;

    doc.font(FONT_REGULAR).fontSize(9).fillColor(COLOR_GRAY);
    doc.text("Zwischensumme", totalsLabelX, rowY, {
      width: 80,
      align: "right",
    });
    doc.fillColor(COLOR_BLACK);
    doc.text(formatSwissAmount(data.subtotal, ""), totalsValueX, rowY, {
      width: totalsValueW,
      align: "right",
    });
    rowY += 16;

    doc.fillColor(COLOR_GRAY);
    doc.text("MWST", totalsLabelX, rowY, { width: 80, align: "right" });
    doc.fillColor(COLOR_BLACK);
    doc.text(formatSwissAmount(data.vatAmount, ""), totalsValueX, rowY, {
      width: totalsValueW,
      align: "right",
    });
    rowY += 16;

    // Total line
    doc
      .moveTo(totalsLabelX, rowY)
      .lineTo(PAGE_WIDTH - MARGIN_RIGHT, rowY)
      .strokeColor(COLOR_BLACK)
      .lineWidth(1)
      .stroke();

    rowY += 8;

    doc.font(FONT_BOLD).fontSize(12).fillColor(COLOR_BLACK);
    doc.text("Total", totalsLabelX, rowY, { width: 80, align: "right" });
    doc.text(formatSwissAmount(data.total, data.currency), totalsValueX, rowY, {
      width: totalsValueW,
      align: "right",
    });

    rowY += 30;

    // ---- Notes ----
    if (data.notes) {
      if (rowY > 650) {
        doc.addPage();
        rowY = MARGIN_TOP;
      }

      doc
        .font(FONT_BOLD)
        .fontSize(9)
        .fillColor(COLOR_GRAY)
        .text("Bemerkungen", MARGIN_LEFT, rowY);

      rowY += 14;

      doc
        .font(FONT_REGULAR)
        .fontSize(9)
        .fillColor(COLOR_BLACK)
        .text(data.notes, MARGIN_LEFT, rowY, { width: CONTENT_WIDTH });
    }

    // ---- Swiss QR-bill ----
    if (data.companyIban && data.currency === "CHF") {
      // Convert total to number for QR library (display only - precision already correct from DB)
      const totalAmount = new Decimal(data.total).toNumber();

      const qrBillData: QRBillData = {
        creditor: {
          name: data.companyName,
          address: data.companyAddress,
          zip: data.companyPostalCode,
          city: data.companyCity,
          country: data.companyCountry || "CH",
          account: data.companyIban,
        },
        currency: "CHF",
        amount: totalAmount,
      };

      // Add debtor info if contact has address
      if (data.contactName && data.contactPostalCode && data.contactCity) {
        qrBillData.debtor = {
          name: data.contactName,
          address: data.contactAddress || "",
          zip: data.contactPostalCode,
          city: data.contactCity,
          country: data.contactCountry || "CH",
        };
      }

      // Add QR reference if available
      if (data.qrReference) {
        qrBillData.reference = data.qrReference;
      }

      try {
        const qrBill = new SwissQRBill(qrBillData, { language: "DE" });
        qrBill.attachTo(doc);
      } catch (qrError) {
        // If QR-bill generation fails (e.g. invalid IBAN format),
        // still produce the PDF without the QR-bill
        logger.error("QR-bill generation failed", qrError);
      }
    }

    doc.end();
  });
}

/**
 * Format a quantity string: strip trailing zeros, show up to 4 decimal places.
 */
function formatQuantity(qty: string): string {
  const num = parseFloat(qty);
  if (isNaN(num)) return qty;
  // If it's a whole number, show without decimals
  if (Number.isInteger(num)) return String(num);
  // Otherwise show significant decimals (up to 4)
  return num.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}
