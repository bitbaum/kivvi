/**
 * Datenlöschzertifikat — Data Erasure Certificate PDF
 *
 * Produces a single-page A4 certificate documenting that data on a specific
 * device has been securely erased. Used for:
 * - nDSG (Schweizer Datenschutzgesetz) compliance
 * - NIST SP 800-88 / DIN 66399 documentation
 * - Audit trails for corporate donors requiring proof of erasure
 * - Customer-facing certificate for devices being resold
 *
 * Uses PDFKit — same library as invoice and impact PDF generation.
 */

import PDFDocument from "pdfkit";
import { DEFAULT_LOCALE } from "../config/locale";

export interface ErasureCertificateData {
  // Issuing organization
  companyName: string;
  companyAddress?: string;
  companyCity?: string;

  // Device being certified
  itemNumber: string;
  description: string;
  serialNumber?: string | null;
  category?: string | null;

  // Erasure event
  dataErasureMethod: string; // key from DATA_ERASURE_METHODS
  erasureMethodLabel: string; // human-readable label
  dataErasuredAt: Date;
  erasedByName?: string | null;

  // Certificate metadata
  certificateNumber: string; // e.g. "CERT-IT-00042-20260424"
  generatedAt: Date;
}

/**
 * Generate a data erasure certificate PDF buffer.
 * Returns a Buffer containing the complete A4 PDF.
 */
export function generateErasureCertificate(
  data: ErasureCertificateData,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: "A4",
      margin: 56,
      info: {
        Title: `Datenlöschzertifikat ${data.certificateNumber}`,
        Author: data.companyName,
        Creator: "Kivvi ERP",
        Subject: `Datenlöschung: ${data.itemNumber} — ${data.description}`,
      },
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const PAGE_W = doc.page.width - 112; // usable width (72pt margins both sides)
    const BLUE = "#1d4ed8";
    const MUTED = "#6b7280";
    const BORDER = "#e5e7eb";
    const BG_BLUE = "#eff6ff";
    const GREEN = "#15803d";
    const DARK = "#111827";

    const erasureDate = data.dataErasuredAt.toLocaleDateString(DEFAULT_LOCALE, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const generatedDate = data.generatedAt.toLocaleDateString(DEFAULT_LOCALE, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    // ── Header bar ─────────────────────────────────────────────────────────
    doc.rect(56, 56, PAGE_W, 4).fillColor(BLUE).fill();

    doc.moveDown(0.6);

    // Title
    doc
      .fontSize(24)
      .fillColor(DARK)
      .font("Helvetica-Bold")
      .text("Datenlöschzertifikat", { continued: false });

    doc.fontSize(11).fillColor(MUTED).font("Helvetica").text(data.companyName);

    if (data.companyAddress || data.companyCity) {
      const addr = [data.companyAddress, data.companyCity]
        .filter(Boolean)
        .join(", ");
      doc.fontSize(10).fillColor(MUTED).text(addr);
    }

    doc.moveDown(0.4);

    // Certificate number + date row
    doc
      .fontSize(9)
      .fillColor(MUTED)
      .text(
        `Zertifikat-Nr.: ${data.certificateNumber}   ·   Ausgestellt am: ${generatedDate}`,
      );

    // Divider
    doc
      .moveDown(0.8)
      .moveTo(56, doc.y)
      .lineTo(56 + PAGE_W, doc.y)
      .strokeColor(BORDER)
      .lineWidth(1)
      .stroke()
      .moveDown(0.8);

    // ── Certification statement ─────────────────────────────────────────────
    doc
      .fontSize(11)
      .fillColor(DARK)
      .font("Helvetica-Bold")
      .text(
        "Hiermit wird bestätigt, dass die folgenden Daten gemäss den aufgeführten Standards unwiderruflich gelöscht wurden.",
      );

    doc.moveDown(0.8);

    // ── Device details box ──────────────────────────────────────────────────
    const boxY = doc.y;
    const boxH = 88;

    doc.roundedRect(56, boxY, PAGE_W, boxH, 6).fillColor(BG_BLUE).fill();

    doc
      .fontSize(9)
      .fillColor(BLUE)
      .font("Helvetica-Bold")
      .text("GERÄTEINFORMATIONEN", 70, boxY + 12);

    const fieldY = boxY + 28;
    const col1X = 70;
    const col2X = 56 + PAGE_W / 2 + 10;
    const labelColor = MUTED;
    const valueColor = DARK;

    // Col 1
    doc
      .fontSize(8)
      .fillColor(labelColor)
      .font("Helvetica")
      .text("Artikelnummer", col1X, fieldY);
    doc
      .fontSize(10)
      .fillColor(valueColor)
      .font("Helvetica-Bold")
      .text(data.itemNumber, col1X, fieldY + 10);

    doc
      .fontSize(8)
      .fillColor(labelColor)
      .font("Helvetica")
      .text("Beschreibung", col1X, fieldY + 28);
    doc
      .fontSize(10)
      .fillColor(valueColor)
      .font("Helvetica-Bold")
      .text(data.description, col1X, fieldY + 38, { width: PAGE_W / 2 - 20 });

    // Col 2
    if (data.serialNumber) {
      doc
        .fontSize(8)
        .fillColor(labelColor)
        .font("Helvetica")
        .text("Seriennummer", col2X, fieldY);
      doc
        .fontSize(10)
        .fillColor(valueColor)
        .font("Helvetica-Bold")
        .text(data.serialNumber, col2X, fieldY + 10);
    }

    if (data.category) {
      doc
        .fontSize(8)
        .fillColor(labelColor)
        .font("Helvetica")
        .text("Kategorie", col2X, fieldY + 28);
      doc
        .fontSize(10)
        .fillColor(valueColor)
        .font("Helvetica-Bold")
        .text(data.category, col2X, fieldY + 38);
    }

    doc.y = boxY + boxH + 16;

    // ── Erasure details box ─────────────────────────────────────────────────
    const erasureBoxY = doc.y;
    const erasureBoxH = 88;

    doc
      .roundedRect(56, erasureBoxY, PAGE_W, erasureBoxH, 6)
      .strokeColor(BORDER)
      .lineWidth(1)
      .stroke();

    doc
      .fontSize(9)
      .fillColor(DARK)
      .font("Helvetica-Bold")
      .text("LÖSCHDETAILS", 70, erasureBoxY + 12);

    const eFieldY = erasureBoxY + 28;
    const colW = (PAGE_W - 20) / 3;

    const fields = [
      { label: "Löschmethode", value: data.erasureMethodLabel },
      { label: "Datum der Löschung", value: erasureDate },
      {
        label: "Durchgeführt von",
        value: data.erasedByName || data.companyName,
      },
    ];

    fields.forEach((f, i) => {
      const x = 70 + i * (colW + 10);
      doc
        .fontSize(8)
        .fillColor(MUTED)
        .font("Helvetica")
        .text(f.label, x, eFieldY, { width: colW });
      doc
        .fontSize(10)
        .fillColor(DARK)
        .font("Helvetica-Bold")
        .text(f.value, x, eFieldY + 10, { width: colW });
    });

    doc.y = erasureBoxY + erasureBoxH + 16;

    // ── Standards compliance ────────────────────────────────────────────────
    doc
      .fontSize(10)
      .fillColor(DARK)
      .font("Helvetica-Bold")
      .text("Compliance-Standards");

    doc.moveDown(0.3);

    const standards = [
      "NIST SP 800-88 Rev. 1 — Guidelines for Media Sanitization",
      "DIN 66399 — Vernichtung von Datenträgern",
      "nDSG (Schweizer Datenschutzgesetz) — Art. 6 Datensicherheit",
    ];

    standards.forEach((s) => {
      doc.fontSize(9).fillColor(MUTED).font("Helvetica").text(`• ${s}`, 66);
    });

    doc.moveDown(0.8);

    // ── Confirmation statement ──────────────────────────────────────────────
    doc.roundedRect(56, doc.y, PAGE_W, 40, 6).fillColor("#f0fdf4").fill();

    const confirmY = doc.y + 8;
    doc
      .fontSize(10)
      .fillColor(GREEN)
      .font("Helvetica-Bold")
      .text(
        `✓  Alle personenbezogenen Daten auf diesem Gerät wurden am ${erasureDate} unwiderruflich gelöscht.`,
        70,
        confirmY,
        { width: PAGE_W - 28 },
      );

    doc.y = doc.y + 40 + 10;

    // ── Footer ──────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 80;
    doc
      .moveTo(56, footerY)
      .lineTo(56 + PAGE_W, footerY)
      .strokeColor(BORDER)
      .lineWidth(0.5)
      .stroke();

    doc
      .fontSize(8)
      .fillColor(MUTED)
      .font("Helvetica")
      .text(
        `Dieses Zertifikat wurde elektronisch ausgestellt und ist ohne Unterschrift gültig. Ausgestellt von: ${data.companyName}. Erstellt mit Kivvi ERP.`,
        56,
        footerY + 10,
        { width: PAGE_W, align: "center" },
      );

    doc.end();
  });
}

/**
 * Build a certificate number from item number and erasure date.
 * Format: CERT-{itemNumber}-{YYYYMMDD}
 *
 * Uses Europe/Zurich timezone so the date on the certificate matches
 * the calendar date visible in Switzerland, regardless of where the
 * server runs.
 */
export function buildCertificateNumber(
  itemNumber: string,
  erasedAt: Date,
): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(erasedAt)
    .split("-"); // sv-SE gives YYYY-MM-DD
  const date = parts.join("");
  return `CERT-${itemNumber}-${date}`;
}
