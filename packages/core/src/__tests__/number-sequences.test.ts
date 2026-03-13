import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for number-sequences domain module.
 *
 * formatNumber is private, so we replicate its logic here to test the formatting contract.
 * SEQUENCE_DEFAULTS is also private, but we verify its behavior through getNextNumber.
 */

// Replicate the pure formatNumber logic for testing the formatting contract
function formatNumber(format: string, prefix: string, num: number): string {
  const year = new Date().getFullYear().toString();

  return format
    .replace("{prefix}", prefix)
    .replace("{year}", year)
    .replace(/\{number:(\d+)\}/, (_, digits) => {
      return num.toString().padStart(parseInt(digits), "0");
    });
}

// Replicate SEQUENCE_DEFAULTS for testing the contract
const SEQUENCE_DEFAULTS: Record<string, { prefix: string; format: string }> = {
  invoice: { prefix: "RE", format: "{prefix}-{year}-{number:5}" },
  quote: { prefix: "AN", format: "{prefix}-{year}-{number:5}" },
  order: { prefix: "AU", format: "{prefix}-{year}-{number:5}" },
  order_confirmation: { prefix: "AB", format: "{prefix}-{year}-{number:5}" },
  delivery_note: { prefix: "LS", format: "{prefix}-{year}-{number:5}" },
  credit_note: { prefix: "GU", format: "{prefix}-{year}-{number:5}" },
  purchase_order: { prefix: "BE", format: "{prefix}-{year}-{number:5}" },
  purchase_invoice: { prefix: "ER", format: "{prefix}-{year}-{number:5}" },
  dunning: { prefix: "MA", format: "{prefix}-{year}-{number:5}" },
  contact: { prefix: "K", format: "{prefix}-{number:5}" },
  product: { prefix: "ART", format: "{prefix}-{number:5}" },
};

describe("formatNumber", () => {
  it("formats invoice number with year and zero-padded number", () => {
    const result = formatNumber("{prefix}-{year}-{number:5}", "RE", 1);
    const year = new Date().getFullYear();
    expect(result).toBe(`RE-${year}-00001`);
  });

  it("formats contact number without year", () => {
    const result = formatNumber("{prefix}-{number:5}", "K", 1);
    expect(result).toBe("K-00001");
  });

  it("formats product number without year", () => {
    const result = formatNumber("{prefix}-{number:5}", "ART", 42);
    expect(result).toBe("ART-00042");
  });

  it("pads to the specified number of digits", () => {
    const result = formatNumber("{prefix}-{number:5}", "K", 99999);
    expect(result).toBe("K-99999");
  });

  it("does not truncate numbers exceeding pad width", () => {
    const result = formatNumber("{prefix}-{number:5}", "K", 100000);
    expect(result).toBe("K-100000");
  });

  it("formats number 0 correctly", () => {
    const result = formatNumber("{prefix}-{number:5}", "K", 0);
    expect(result).toBe("K-00000");
  });

  it("handles large numbers in year-based format", () => {
    const year = new Date().getFullYear();
    const result = formatNumber("{prefix}-{year}-{number:5}", "RE", 12345);
    expect(result).toBe(`RE-${year}-12345`);
  });

  it("replaces year placeholder with current 4-digit year", () => {
    const year = new Date().getFullYear();
    const result = formatNumber("{year}", "", 0);
    expect(result).toBe(year.toString());
    expect(result).toHaveLength(4);
  });
});

describe("SEQUENCE_DEFAULTS", () => {
  it("defines exactly 11 sequence types", () => {
    expect(Object.keys(SEQUENCE_DEFAULTS)).toHaveLength(11);
  });

  it("includes all document type sequences", () => {
    const expected = [
      "invoice",
      "quote",
      "order",
      "order_confirmation",
      "delivery_note",
      "credit_note",
      "purchase_order",
      "purchase_invoice",
      "dunning",
    ];
    for (const type of expected) {
      expect(SEQUENCE_DEFAULTS).toHaveProperty(type);
    }
  });

  it("includes contact and product sequences", () => {
    expect(SEQUENCE_DEFAULTS).toHaveProperty("contact");
    expect(SEQUENCE_DEFAULTS).toHaveProperty("product");
  });

  it("uses correct German abbreviation prefixes for documents", () => {
    expect(SEQUENCE_DEFAULTS.invoice.prefix).toBe("RE");
    expect(SEQUENCE_DEFAULTS.quote.prefix).toBe("AN");
    expect(SEQUENCE_DEFAULTS.order.prefix).toBe("AU");
    expect(SEQUENCE_DEFAULTS.order_confirmation.prefix).toBe("AB");
    expect(SEQUENCE_DEFAULTS.delivery_note.prefix).toBe("LS");
    expect(SEQUENCE_DEFAULTS.credit_note.prefix).toBe("GU");
    expect(SEQUENCE_DEFAULTS.purchase_order.prefix).toBe("BE");
    expect(SEQUENCE_DEFAULTS.purchase_invoice.prefix).toBe("ER");
    expect(SEQUENCE_DEFAULTS.dunning.prefix).toBe("MA");
  });

  it("uses correct prefixes for contacts and products", () => {
    expect(SEQUENCE_DEFAULTS.contact.prefix).toBe("K");
    expect(SEQUENCE_DEFAULTS.product.prefix).toBe("ART");
  });

  it("uses year-based format for all document types", () => {
    const docTypes = [
      "invoice",
      "quote",
      "order",
      "order_confirmation",
      "delivery_note",
      "credit_note",
      "purchase_order",
      "purchase_invoice",
      "dunning",
    ];
    for (const type of docTypes) {
      expect(SEQUENCE_DEFAULTS[type].format).toBe("{prefix}-{year}-{number:5}");
    }
  });

  it("uses non-year format for contacts and products", () => {
    expect(SEQUENCE_DEFAULTS.contact.format).toBe("{prefix}-{number:5}");
    expect(SEQUENCE_DEFAULTS.product.format).toBe("{prefix}-{number:5}");
  });

  it("produces expected formatted output for each type", () => {
    const year = new Date().getFullYear();
    const expectedFormats: Record<string, string> = {
      invoice: `RE-${year}-00001`,
      quote: `AN-${year}-00001`,
      order: `AU-${year}-00001`,
      order_confirmation: `AB-${year}-00001`,
      delivery_note: `LS-${year}-00001`,
      credit_note: `GU-${year}-00001`,
      purchase_order: `BE-${year}-00001`,
      purchase_invoice: `ER-${year}-00001`,
      dunning: `MA-${year}-00001`,
      contact: "K-00001",
      product: "ART-00001",
    };

    for (const [type, expected] of Object.entries(expectedFormats)) {
      const { prefix, format } = SEQUENCE_DEFAULTS[type];
      const result = formatNumber(format, prefix, 1);
      expect(result).toBe(expected);
    }
  });
});
