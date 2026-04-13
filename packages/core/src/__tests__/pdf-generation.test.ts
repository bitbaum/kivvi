import { describe, it, expect } from "vitest";
import { generateInvoicePdf } from "../domain/pdf-generation";
import type { InvoicePdfData } from "../domain/pdf-generation";

// Minimal valid invoice data — no QR-bill (no IBAN)
const BASE_DATA: InvoicePdfData = {
  companyName: "revamp-it Genossenschaft",
  companyAddress: "Quellenstrasse 25",
  companyCity: "Zürich",
  companyPostalCode: "8005",
  companyCountry: "CH",
  companyVatNumber: "CHE-123.456.789",
  number: "RE-2026-00001",
  issueDate: "2026-04-13",
  dueDate: "2026-05-13",
  contactName: "Hans Müller",
  contactAddress: "Bahnhofstrasse 1",
  contactCity: "Bern",
  contactPostalCode: "3001",
  contactCountry: "CH",
  items: [
    {
      position: 1,
      description: "ThinkPad T14 – generalüberholt, Zustand: Gut",
      quantity: "1",
      unitPrice: "350.00",
      vatRate: "8.1",
      discount: "0",
      total: "350.00",
    },
  ],
  subtotal: "323.77",
  vatAmount: "26.23",
  total: "350.00",
  currency: "CHF",
};

// Invoice data with IBAN + QR reference — triggers QR-bill section
const QR_DATA: InvoicePdfData = {
  ...BASE_DATA,
  companyIban: "CH56 0483 5012 3456 7800 9",
  qrReference: "000000000000000012600001" + "5", // 25 digits + 1 check = mock 26
};

describe("generateInvoicePdf", () => {
  it("returns a non-empty Buffer", async () => {
    const pdf = await generateInvoicePdf(BASE_DATA);
    expect(pdf).toBeInstanceOf(Buffer);
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("starts with the PDF magic bytes %PDF", async () => {
    const pdf = await generateInvoicePdf(BASE_DATA);
    const header = pdf.subarray(0, 4).toString("ascii");
    expect(header).toBe("%PDF");
  });

  it("PDF without IBAN is smaller than PDF with QR-bill", async () => {
    const [withoutQr, withQr] = await Promise.all([
      generateInvoicePdf(BASE_DATA),
      generateInvoicePdf(QR_DATA),
    ]);
    // QR-bill adds substantial content (vector graphics, text blocks)
    expect(withQr.length).toBeGreaterThan(withoutQr.length);
  });

  it("PDF with QR-bill is at least 10KB (QR graphics present)", async () => {
    const pdf = await generateInvoicePdf(QR_DATA);
    expect(pdf.length).toBeGreaterThan(10 * 1024);
  });

  it("invoice number appears in PDF content", async () => {
    const pdf = await generateInvoicePdf(BASE_DATA);
    const text = pdf.toString("latin1");
    expect(text).toContain("RE-2026-00001");
  });

  it("company name appears in PDF content", async () => {
    const pdf = await generateInvoicePdf(BASE_DATA);
    const text = pdf.toString("latin1");
    expect(text).toContain("revamp-it Genossenschaft");
  });

  it("each unique invoice produces a different PDF", async () => {
    const alt = { ...BASE_DATA, number: "RE-2026-00002" };
    const [pdf1, pdf2] = await Promise.all([
      generateInvoicePdf(BASE_DATA),
      generateInvoicePdf(alt),
    ]);
    // Different invoice numbers → different binary content
    expect(pdf1.equals(pdf2)).toBe(false);
  });

  it("does not throw when optional fields are absent", async () => {
    const minimal: InvoicePdfData = {
      companyName: "Test AG",
      companyAddress: "",
      companyCity: "Zürich",
      companyPostalCode: "8000",
      companyCountry: "CH",
      number: "RE-2026-99999",
      issueDate: "2026-01-01",
      contactName: "Test Kunde",
      items: [
        {
          position: 1,
          description: "Service",
          quantity: "1",
          unitPrice: "100.00",
          vatRate: "0",
          discount: "0",
          total: "100.00",
        },
      ],
      subtotal: "100.00",
      vatAmount: "0.00",
      total: "100.00",
      currency: "CHF",
    };
    await expect(generateInvoicePdf(minimal)).resolves.toBeInstanceOf(Buffer);
  });

  it("skips QR-bill for non-CHF currency", async () => {
    const eurData: InvoicePdfData = {
      ...QR_DATA,
      currency: "EUR",
    };
    const [chfPdf, eurPdf] = await Promise.all([
      generateInvoicePdf(QR_DATA),
      generateInvoicePdf(eurData),
    ]);
    // EUR invoice has no QR-bill — must be smaller
    expect(chfPdf.length).toBeGreaterThan(eurPdf.length);
  });
});
