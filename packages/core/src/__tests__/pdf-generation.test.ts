import { inflateSync } from "node:zlib";
import { describe, it, expect } from "vitest";
import {
  generateInvoicePdf,
  generateDeliveryNotePdf,
  generateQuotePdf,
  generateDonationReceiptPdf,
} from "../domain/pdf-generation";
import {
  generateErasureCertificate,
  buildCertificateNumber,
  type ErasureCertificateData,
} from "../domain/erasure-certificate";
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

// Reconstruct the human-visible text rendered into a PDF. PDFKit (and the
// swissqrbill payment slip) write text as hex-encoded show strings inside
// FlateDecode content streams; concatenating every decoded hex run yields the
// visible text — proving content renders, not just metadata. Whitespace is
// dropped so values formatted in groups (IBAN "CH18 3199 …", reference
// "17 16781 …") match their canonical, unspaced form.
function reconstructPdfText(pdf: Buffer): { text: string; compact: string } {
  const raw = pdf.toString("latin1");
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let text = "";
  let match: RegExpExecArray | null;
  while ((match = streamRe.exec(raw)) !== null) {
    let body: string;
    try {
      body = inflateSync(Buffer.from(match[1], "latin1")).toString("latin1");
    } catch {
      continue; // Non-Flate stream (e.g. metadata) — skip.
    }
    for (const hex of body.match(/<([0-9a-fA-F]+)>/g) ?? []) {
      text += Buffer.from(hex.slice(1, -1), "hex").toString("latin1");
    }
  }
  return { text, compact: text.replace(/\s/g, "") };
}

// MOD-10 recursive check (Swiss QR-bill standard) — mirrors the domain
// algorithm so the test validates the reference independently of how it was
// generated. Returns the check digit for a digit string.
function mod10Recursive(input: string): string {
  const table = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
  let carry = 0;
  for (const ch of input) carry = table[(carry + parseInt(ch, 10)) % 10];
  return ((10 - carry) % 10).toString();
}

// ISO 7064 mod-97-10 check for SCOR (ISO 11649 creditor) references.
function isValidScor(ref: string): boolean {
  if (!/^RF\d{2}[A-Z0-9]{1,21}$/.test(ref)) return false;
  const rearranged = ref.slice(4) + ref.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) =>
    (c.charCodeAt(0) - 55).toString(),
  );
  let remainder = 0;
  for (const ch of numeric) remainder = (remainder * 10 + Number(ch)) % 97;
  return remainder === 1;
}

// A structurally valid Swiss payment reference is either a 27-digit QRR with a
// valid trailing MOD-10 check digit, or an ISO 11649 SCOR reference.
function isValidQrReference(ref: string): boolean {
  if (/^\d{27}$/.test(ref)) {
    return mod10Recursive(ref.slice(0, 26)) === ref[26];
  }
  return isValidScor(ref);
}

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

  it("renders a Swiss QR-bill payment slip with valid reference, IBAN and amount", async () => {
    const pdf = await generateInvoicePdf(QR_DATA);
    const { text, compact } = reconstructPdfText(pdf);

    // Payment slip is present (German QR-bill section labels, legally fixed).
    expect(text).toContain("Empfangsschein"); // receipt part
    expect(text).toContain("Zahlteil"); // payment part
    expect(text).toContain("Referenz"); // reference label

    // The structured reference renders and is structurally valid (QRR/SCOR).
    expect(compact).toContain(VALID_QR_REFERENCE);
    expect(isValidQrReference(VALID_QR_REFERENCE)).toBe(true);

    // Creditor IBAN renders (formatted in groups → matched in compact form).
    expect(compact).toContain(QR_IBAN.replace(/\s/g, ""));

    // Currency and payable amount render in the slip.
    expect(text).toContain("CHF");
    expect(compact).toContain(QR_DATA.total); // "350.00"
  });

  it("rejects malformed QR references (validator sanity check)", () => {
    expect(isValidQrReference(VALID_QR_REFERENCE)).toBe(true);
    // Flip the check digit → invalid QRR.
    const badCheck =
      VALID_QR_REFERENCE.slice(0, 26) +
      ((Number(VALID_QR_REFERENCE[26]) + 1) % 10).toString();
    expect(isValidQrReference(badCheck)).toBe(false);
    expect(isValidQrReference("12345")).toBe(false); // wrong length
    expect(isValidQrReference("RF18539007547034")).toBe(true); // valid SCOR
    expect(isValidQrReference("RF19539007547034")).toBe(false); // bad SCOR check
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

  it("renders the title, donor name, and receipt number in the visible body", async () => {
    // PDFKit writes the visible text into FlateDecode content streams as
    // hex-encoded show strings (e.g. `<5370...> Tj`), split by kerning
    // offsets. Inflate the streams and concatenate every decoded hex run to
    // reconstruct the rendered text — proving the content actually renders,
    // not just the PDF metadata.
    const pdf = await generateDonationReceiptPdf(DONATION_RECEIPT_DATA);
    const raw = pdf.toString("latin1");
    let rendered = "";
    const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;
    while ((match = streamRe.exec(raw)) !== null) {
      let body: string;
      try {
        body = inflateSync(Buffer.from(match[1], "latin1")).toString("latin1");
      } catch {
        continue; // Non-Flate stream (e.g. metadata) — skip.
      }
      for (const hex of body.match(/<([0-9a-fA-F]+)>/g) ?? []) {
        rendered += Buffer.from(hex.slice(1, -1), "hex").toString("latin1");
      }
    }

    expect(rendered).toContain("Spendenquittung");
    expect(rendered).toContain(DONATION_RECEIPT_DATA.donorName);
    expect(rendered).toContain(DONATION_RECEIPT_DATA.number);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildCertificateNumber — pure function, no PDF involved
// ─────────────────────────────────────────────────────────────────────────────

describe("buildCertificateNumber", () => {
  it("formats as CERT-{itemNumber}-{YYYYMMDD}", () => {
    const date = new Date("2026-04-24T10:00:00Z");
    expect(buildCertificateNumber("IT-00042", date)).toBe(
      "CERT-IT-00042-20260424",
    );
  });

  it("pads single-digit month", () => {
    const date = new Date("2026-03-05T00:00:00Z");
    expect(buildCertificateNumber("IT-00001", date)).toBe(
      "CERT-IT-00001-20260305",
    );
  });

  it("pads single-digit day", () => {
    const date = new Date("2026-07-09T00:00:00Z");
    expect(buildCertificateNumber("IT-00099", date)).toBe(
      "CERT-IT-00099-20260709",
    );
  });

  it("preserves item number as-is", () => {
    const date = new Date("2026-12-31T00:00:00Z");
    expect(buildCertificateNumber("IT-99999", date)).toBe(
      "CERT-IT-99999-20261231",
    );
  });

  it("works across year boundary", () => {
    const date = new Date("2027-01-01T00:00:00Z");
    expect(buildCertificateNumber("IT-00001", date)).toBe(
      "CERT-IT-00001-20270101",
    );
  });

  it("uses Europe/Zurich timezone — 23:30 UTC Dec 31 shows Jan 1 (CET UTC+1)", () => {
    // 2026-12-31T23:30:00Z = 2027-01-01T00:30:00 CET
    // A UTC-based implementation would produce 20261231; correct is 20270101
    const date = new Date("2026-12-31T23:30:00Z");
    expect(buildCertificateNumber("IT-00001", date)).toBe(
      "CERT-IT-00001-20270101",
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generateErasureCertificate — PDF buffer smoke tests
// ─────────────────────────────────────────────────────────────────────────────

const ERASURE_DATA: ErasureCertificateData = {
  companyName: "revamp-it Genossenschaft",
  companyAddress: "Quellenstrasse 25",
  companyCity: "8005 Zürich",
  itemNumber: "IT-00042",
  description: "Lenovo ThinkPad T14 — generalüberholt",
  serialNumber: "PF2X3Y45",
  category: "laptop",
  dataErasureMethod: "secure_erase",
  erasureMethodLabel: "NIST Secure Erase",
  dataErasuredAt: new Date("2026-04-24T10:00:00Z"),
  erasedByName: "Anna Muster",
  certificateNumber: "CERT-IT-00042-20260424",
  generatedAt: new Date("2026-04-24T12:00:00Z"),
};

describe("generateErasureCertificate", () => {
  it("returns a non-empty Buffer", async () => {
    const pdf = await generateErasureCertificate(ERASURE_DATA);
    expect(pdf).toBeInstanceOf(Buffer);
    expect(pdf.length).toBeGreaterThan(0);
  });

  it("starts with PDF magic bytes", async () => {
    const pdf = await generateErasureCertificate(ERASURE_DATA);
    expect(pdf.slice(0, 4).toString()).toBe("%PDF");
  });

  it("does not throw with minimal required fields", async () => {
    const minimal: ErasureCertificateData = {
      companyName: "Brocki GmbH",
      itemNumber: "IT-00001",
      description: "Dell Laptop",
      dataErasureMethod: "dban",
      erasureMethodLabel: "DBAN",
      dataErasuredAt: new Date("2026-01-01"),
      certificateNumber: "CERT-IT-00001-20260101",
      generatedAt: new Date("2026-01-01"),
    };
    await expect(generateErasureCertificate(minimal)).resolves.toBeInstanceOf(
      Buffer,
    );
  });

  it("different items produce different PDFs", async () => {
    const alt: ErasureCertificateData = {
      ...ERASURE_DATA,
      itemNumber: "IT-00099",
      serialNumber: "ABCD1234",
      certificateNumber: "CERT-IT-00099-20260424",
    };
    const [pdf1, pdf2] = await Promise.all([
      generateErasureCertificate(ERASURE_DATA),
      generateErasureCertificate(alt),
    ]);
    expect(pdf1.equals(pdf2)).toBe(false);
  });
});
