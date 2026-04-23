import { describe, it, expect } from "vitest";
import {
  generateInvoicePdf,
  generateDeliveryNotePdf,
  generateQuotePdf,
  generateDonationReceiptPdf,
} from "../domain/pdf-generation";
import type {
  InvoicePdfData,
  DeliveryNotePdfData,
  QuotePdfData,
  DonationReceiptPdfData,
} from "../domain/pdf-generation";
import { generateQRReference } from "../domain/documents";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

// A valid 27-digit QR reference generated from the domain function
const VALID_QR_REFERENCE = generateQRReference(
  "550e8400-e29b-41d4-a716-446655440000",
  "RE-2026-00001",
);

// QR-IBAN: IID must be in range 30000–31999 when using a QR reference.
// CH1831999000000000001 — IID = 31999 (in QR-IID range), check digits verified.
const QR_IBAN = "CH1831999000000000001";

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

// Invoice data with QR-IBAN + valid QR reference — triggers QR-bill section
const QR_DATA: InvoicePdfData = {
  ...BASE_DATA,
  companyIban: QR_IBAN,
  qrReference: VALID_QR_REFERENCE,
};

// ---------------------------------------------------------------------------
// generateInvoicePdf
// ---------------------------------------------------------------------------

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

  it("invoice number appears in PDF metadata", async () => {
    // PDFKit embeds number in the Title metadata (uncompressed)
    const pdf = await generateInvoicePdf(BASE_DATA);
    const text = pdf.toString("latin1");
    expect(text).toContain("RE-2026-00001");
  });

  it("company name appears in PDF metadata", async () => {
    // PDFKit embeds company name as Author metadata (uncompressed)
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

  it("multi-item invoice is larger than single-item invoice", async () => {
    // More items → more body content → larger PDF
    const multiItem: InvoicePdfData = {
      ...BASE_DATA,
      number: "RE-2026-00010",
      items: [
        {
          position: 1,
          description: "Laptop Dell XPS",
          quantity: "2",
          unitPrice: "200.00",
          vatRate: "8.1",
          discount: "0",
          total: "400.00",
        },
        {
          position: 2,
          description: "Maus Logitech MX",
          quantity: "3",
          unitPrice: "30.00",
          vatRate: "8.1",
          discount: "10",
          total: "81.00",
        },
        {
          position: 3,
          description: "Tastatur Cherry",
          quantity: "1",
          unitPrice: "75.00",
          vatRate: "8.1",
          discount: "0",
          total: "75.00",
        },
      ],
      subtotal: "514.93",
      vatAmount: "41.71",
      total: "556.00",
    };
    const [single, multi] = await Promise.all([
      generateInvoicePdf(BASE_DATA),
      generateInvoicePdf(multiItem),
    ]);
    expect(multi.length).toBeGreaterThan(single.length);
  });

  it("invoice with notes is larger than invoice without notes", async () => {
    const withNotes: InvoicePdfData = {
      ...BASE_DATA,
      notes: "Zahlbar innert 30 Tagen. Danke für Ihr Vertrauen.",
    };
    const [withoutNotes, withNotesResult] = await Promise.all([
      generateInvoicePdf(BASE_DATA),
      generateInvoicePdf(withNotes),
    ]);
    expect(withNotesResult.length).toBeGreaterThan(withoutNotes.length);
  });

  it("QR-bill without reference also generates (IBAN only, no reference)", async () => {
    // A QR-bill without reference is valid — any IBAN works
    const ibanOnly: InvoicePdfData = {
      ...BASE_DATA,
      companyIban: "CH56 0483 5012 3456 7800 9", // regular IBAN, no reference
    };
    const pdf = await generateInvoicePdf(ibanOnly);
    expect(pdf).toBeInstanceOf(Buffer);
    // Should be larger than no-IBAN version (QR-bill rendered)
    const noIban = await generateInvoicePdf(BASE_DATA);
    expect(pdf.length).toBeGreaterThan(noIban.length);
  });
});

// ---------------------------------------------------------------------------
// generateDeliveryNotePdf
// ---------------------------------------------------------------------------

const DELIVERY_NOTE_DATA: DeliveryNotePdfData = {
  companyName: "revamp-it Genossenschaft",
  companyAddress: "Quellenstrasse 25",
  companyCity: "Zürich",
  companyPostalCode: "8005",
  companyCountry: "CH",
  companyVatNumber: "CHE-123.456.789",
  number: "LS-2026-00001",
  issueDate: "2026-04-13",
  contactName: "Lager AG",
  contactAddress: "Industriestrasse 10",
  contactCity: "Basel",
  contactPostalCode: "4000",
  contactCountry: "CH",
  items: [
    {
      position: 1,
      description: "ThinkPad T14 generalüberholt",
      quantity: "5",
      unit: "Stk",
    },
    {
      position: 2,
      description: "Dell Latitude E7440",
      quantity: "3",
      unit: "Stk",
    },
  ],
};

describe("generateDeliveryNotePdf", () => {
  it("returns a non-empty Buffer", async () => {
    const pdf = await generateDeliveryNotePdf(DELIVERY_NOTE_DATA);
    expect(pdf).toBeInstanceOf(Buffer);
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("starts with the PDF magic bytes %PDF", async () => {
    const pdf = await generateDeliveryNotePdf(DELIVERY_NOTE_DATA);
    const header = pdf.subarray(0, 4).toString("ascii");
    expect(header).toBe("%PDF");
  });

  it("document number appears in PDF metadata", async () => {
    const pdf = await generateDeliveryNotePdf(DELIVERY_NOTE_DATA);
    const text = pdf.toString("latin1");
    expect(text).toContain("LS-2026-00001");
  });

  it("company name appears in PDF metadata", async () => {
    const pdf = await generateDeliveryNotePdf(DELIVERY_NOTE_DATA);
    const text = pdf.toString("latin1");
    expect(text).toContain("revamp-it Genossenschaft");
  });

  it("multi-item delivery note is larger than single-item", async () => {
    const singleItem: DeliveryNotePdfData = {
      ...DELIVERY_NOTE_DATA,
      items: [{ position: 1, description: "ThinkPad T14", quantity: "1" }],
    };
    const [single, multi] = await Promise.all([
      generateDeliveryNotePdf(singleItem),
      generateDeliveryNotePdf(DELIVERY_NOTE_DATA),
    ]);
    expect(multi.length).toBeGreaterThan(single.length);
  });

  it("delivery note with notes is larger than one without", async () => {
    const withNotes: DeliveryNotePdfData = {
      ...DELIVERY_NOTE_DATA,
      notes: "Bitte Eingangskontrolle durchführen.",
    };
    const [without, with_] = await Promise.all([
      generateDeliveryNotePdf(DELIVERY_NOTE_DATA),
      generateDeliveryNotePdf(withNotes),
    ]);
    expect(with_.length).toBeGreaterThan(without.length);
  });

  it("does not throw with minimal required fields", async () => {
    const minimal: DeliveryNotePdfData = {
      companyName: "Mini GmbH",
      companyAddress: "Strasse 1",
      companyCity: "Bern",
      companyPostalCode: "3000",
      companyCountry: "CH",
      number: "LS-2026-99999",
      issueDate: "2026-01-01",
      contactName: "Empfänger",
      items: [{ position: 1, description: "Artikel A", quantity: "1" }],
    };
    await expect(generateDeliveryNotePdf(minimal)).resolves.toBeInstanceOf(
      Buffer,
    );
  });

  it("different document numbers produce different PDFs", async () => {
    const alt: DeliveryNotePdfData = {
      ...DELIVERY_NOTE_DATA,
      number: "LS-2026-00002",
    };
    const [pdf1, pdf2] = await Promise.all([
      generateDeliveryNotePdf(DELIVERY_NOTE_DATA),
      generateDeliveryNotePdf(alt),
    ]);
    expect(pdf1.equals(pdf2)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateQuotePdf
// ---------------------------------------------------------------------------

const QUOTE_DATA: QuotePdfData = {
  companyName: "revamp-it Genossenschaft",
  companyAddress: "Quellenstrasse 25",
  companyCity: "Zürich",
  companyPostalCode: "8005",
  companyCountry: "CH",
  companyVatNumber: "CHE-123.456.789",
  number: "AN-2026-00001",
  issueDate: "2026-04-13",
  dueDate: "2026-05-13", // "Gültig bis" for quotes
  contactName: "Angebot Empfänger AG",
  contactAddress: "Hauptgasse 5",
  contactCity: "Luzern",
  contactPostalCode: "6000",
  contactCountry: "CH",
  items: [
    {
      position: 1,
      description: "MacBook Air M2 – refurbished",
      quantity: "1",
      unitPrice: "850.00",
      vatRate: "8.1",
      discount: "0",
      total: "850.00",
    },
  ],
  subtotal: "786.31",
  vatAmount: "63.69",
  total: "850.00",
  currency: "CHF",
};

describe("generateQuotePdf", () => {
  it("returns a non-empty Buffer", async () => {
    const pdf = await generateQuotePdf(QUOTE_DATA);
    expect(pdf).toBeInstanceOf(Buffer);
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("starts with the PDF magic bytes %PDF", async () => {
    const pdf = await generateQuotePdf(QUOTE_DATA);
    const header = pdf.subarray(0, 4).toString("ascii");
    expect(header).toBe("%PDF");
  });

  it("quote number appears in PDF metadata", async () => {
    const pdf = await generateQuotePdf(QUOTE_DATA);
    const text = pdf.toString("latin1");
    expect(text).toContain("AN-2026-00001");
  });

  it("company name appears in PDF metadata", async () => {
    const pdf = await generateQuotePdf(QUOTE_DATA);
    const text = pdf.toString("latin1");
    expect(text).toContain("revamp-it Genossenschaft");
  });

  it("quote is smaller than equivalent invoice with QR-bill (no QR on quotes)", async () => {
    const equivalentInvoice: InvoicePdfData = {
      ...QUOTE_DATA,
      number: "RE-2026-00001",
      companyIban: QR_IBAN,
      qrReference: VALID_QR_REFERENCE,
    };
    const [quotePdf, invoicePdf] = await Promise.all([
      generateQuotePdf(QUOTE_DATA),
      generateInvoicePdf(equivalentInvoice),
    ]);
    // Quotes have no QR-bill → smaller binary
    expect(invoicePdf.length).toBeGreaterThan(quotePdf.length);
  });

  it("quote with notes is larger than quote without notes", async () => {
    const withNotes: QuotePdfData = {
      ...QUOTE_DATA,
      notes: "Preise exkl. Versand. Angebot gültig 30 Tage.",
    };
    const [without, with_] = await Promise.all([
      generateQuotePdf(QUOTE_DATA),
      generateQuotePdf(withNotes),
    ]);
    expect(with_.length).toBeGreaterThan(without.length);
  });

  it("each unique quote produces a different PDF", async () => {
    const alt: QuotePdfData = { ...QUOTE_DATA, number: "AN-2026-00002" };
    const [pdf1, pdf2] = await Promise.all([
      generateQuotePdf(QUOTE_DATA),
      generateQuotePdf(alt),
    ]);
    expect(pdf1.equals(pdf2)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateDonationReceiptPdf (Spendenquittung)
// ---------------------------------------------------------------------------

const DONATION_RECEIPT_DATA: DonationReceiptPdfData = {
  companyName: "revamp-it Genossenschaft",
  companyAddress: "Quellenstrasse 25",
  companyCity: "Zürich",
  companyPostalCode: "8005",
  donorName: "Maria Bergmann",
  donorAddress: "Seestrasse 22",
  donorCity: "Zürich",
  donorPostalCode: "8002",
  number: "SQ-2026-00001",
  date: "2026-04-13",
  items: [
    { description: "ThinkPad T470 (funktionsfähig)", quantity: "2" },
    { description: "Dell Monitor 24 Zoll", quantity: "1" },
  ],
  estimatedTotalValue: "350.00",
  currency: "CHF",
};

describe("generateDonationReceiptPdf", () => {
  it("returns a non-empty Buffer", async () => {
    const pdf = await generateDonationReceiptPdf(DONATION_RECEIPT_DATA);
    expect(pdf).toBeInstanceOf(Buffer);
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("starts with the PDF magic bytes %PDF", async () => {
    const pdf = await generateDonationReceiptPdf(DONATION_RECEIPT_DATA);
    const header = pdf.subarray(0, 4).toString("ascii");
    expect(header).toBe("%PDF");
  });

  it("document number appears in PDF metadata", async () => {
    // PDFKit embeds number in the Title metadata (uncompressed)
    const pdf = await generateDonationReceiptPdf(DONATION_RECEIPT_DATA);
    const text = pdf.toString("latin1");
    expect(text).toContain("SQ-2026-00001");
  });

  it("company name appears in PDF metadata", async () => {
    // PDFKit embeds company name as Author metadata (uncompressed)
    const pdf = await generateDonationReceiptPdf(DONATION_RECEIPT_DATA);
    const text = pdf.toString("latin1");
    expect(text).toContain("revamp-it Genossenschaft");
  });

  it("multi-item receipt is larger than single-item receipt", async () => {
    const singleItem: DonationReceiptPdfData = {
      ...DONATION_RECEIPT_DATA,
      items: [{ description: "ThinkPad T470", quantity: "1" }],
    };
    const [single, multi] = await Promise.all([
      generateDonationReceiptPdf(singleItem),
      generateDonationReceiptPdf(DONATION_RECEIPT_DATA),
    ]);
    expect(multi.length).toBeGreaterThan(single.length);
  });

  it("does not throw with minimal required fields", async () => {
    const minimal: DonationReceiptPdfData = {
      companyName: "Mini GmbH",
      companyAddress: "Strasse 1",
      companyCity: "Bern",
      companyPostalCode: "3000",
      donorName: "Anonym",
      number: "SQ-2026-99999",
      date: "2026-01-01",
      items: [{ description: "Diverse Elektronik", quantity: "5" }],
      currency: "CHF",
    };
    await expect(generateDonationReceiptPdf(minimal)).resolves.toBeInstanceOf(
      Buffer,
    );
  });

  it("different donors produce different PDFs", async () => {
    const alt: DonationReceiptPdfData = {
      ...DONATION_RECEIPT_DATA,
      donorName: "Klaus Schmidt",
      number: "SQ-2026-00002",
    };
    const [pdf1, pdf2] = await Promise.all([
      generateDonationReceiptPdf(DONATION_RECEIPT_DATA),
      generateDonationReceiptPdf(alt),
    ]);
    expect(pdf1.equals(pdf2)).toBe(false);
  });
});
