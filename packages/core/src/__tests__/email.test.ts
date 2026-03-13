import { describe, it, expect } from "vitest";
import {
  buildInvoiceEmailSubject,
  buildInvoiceEmailHtml,
  buildPasswordResetEmailSubject,
  buildPasswordResetEmailHtml,
  buildInvitationEmailSubject,
  buildInvitationEmailHtml,
} from "../domain/email";
import type {
  InvoiceEmailData,
  PasswordResetEmailData,
  InvitationEmailData,
} from "../domain/email";

// ============================================================================
// HELPERS
// ============================================================================

function makeInvoiceEmailData(
  overrides: Partial<InvoiceEmailData> = {},
): InvoiceEmailData {
  return {
    recipientEmail: "kunde@example.ch",
    recipientName: "Hans Muster",
    companyName: "Muster AG",
    documentNumber: "RE-2026-00001",
    documentType: "invoice",
    total: "1234.50",
    currency: "CHF",
    ...overrides,
  };
}

// ============================================================================
// buildInvoiceEmailSubject
// ============================================================================

describe("buildInvoiceEmailSubject", () => {
  it("formats invoice subject with German label", () => {
    const subject = buildInvoiceEmailSubject(makeInvoiceEmailData());
    expect(subject).toBe("Rechnung RE-2026-00001 - Muster AG");
  });

  it("formats quote subject", () => {
    const subject = buildInvoiceEmailSubject(
      makeInvoiceEmailData({
        documentType: "quote",
        documentNumber: "AN-2026-00001",
      }),
    );
    expect(subject).toBe("Angebot AN-2026-00001 - Muster AG");
  });

  it("formats order subject", () => {
    const subject = buildInvoiceEmailSubject(
      makeInvoiceEmailData({
        documentType: "order",
        documentNumber: "AU-2026-00001",
      }),
    );
    expect(subject).toBe("Auftrag AU-2026-00001 - Muster AG");
  });

  it("formats credit note subject", () => {
    const subject = buildInvoiceEmailSubject(
      makeInvoiceEmailData({
        documentType: "credit_note",
        documentNumber: "GU-2026-00001",
      }),
    );
    expect(subject).toBe("Gutschrift GU-2026-00001 - Muster AG");
  });

  it("formats dunning subject", () => {
    const subject = buildInvoiceEmailSubject(
      makeInvoiceEmailData({
        documentType: "dunning",
        documentNumber: "MA-2026-00001",
      }),
    );
    expect(subject).toBe("Zahlungserinnerung MA-2026-00001 - Muster AG");
  });

  it("formats delivery note subject", () => {
    const subject = buildInvoiceEmailSubject(
      makeInvoiceEmailData({
        documentType: "delivery_note",
        documentNumber: "LS-2026-00001",
      }),
    );
    expect(subject).toBe("Lieferschein LS-2026-00001 - Muster AG");
  });

  it("formats purchase order subject", () => {
    const subject = buildInvoiceEmailSubject(
      makeInvoiceEmailData({
        documentType: "purchase_order",
        documentNumber: "BE-2026-00001",
      }),
    );
    expect(subject).toBe("Bestellung BE-2026-00001 - Muster AG");
  });

  it("formats purchase invoice subject", () => {
    const subject = buildInvoiceEmailSubject(
      makeInvoiceEmailData({
        documentType: "purchase_invoice",
        documentNumber: "ER-2026-00001",
      }),
    );
    expect(subject).toBe("Eingangsrechnung ER-2026-00001 - Muster AG");
  });

  it("falls back to raw type for unknown document type", () => {
    const subject = buildInvoiceEmailSubject(
      makeInvoiceEmailData({
        documentType: "unknown_type",
      }),
    );
    expect(subject).toBe("unknown_type RE-2026-00001 - Muster AG");
  });
});

// ============================================================================
// buildInvoiceEmailHtml
// ============================================================================

describe("buildInvoiceEmailHtml", () => {
  it("contains the document number", () => {
    const html = buildInvoiceEmailHtml(makeInvoiceEmailData());
    expect(html).toContain("RE-2026-00001");
  });

  it("contains the recipient name in greeting", () => {
    const html = buildInvoiceEmailHtml(makeInvoiceEmailData());
    expect(html).toContain("Guten Tag Hans Muster");
  });

  it("contains the company name in header and closing", () => {
    const html = buildInvoiceEmailHtml(makeInvoiceEmailData());
    expect(html).toContain("Muster AG");
  });

  it("contains a formatted amount with CHF", () => {
    const html = buildInvoiceEmailHtml(makeInvoiceEmailData());
    // Swiss number formatting: CHF 1'234.50 or similar
    expect(html).toContain("CHF");
  });

  it("contains due date when provided for invoice", () => {
    const html = buildInvoiceEmailHtml(
      makeInvoiceEmailData({
        dueDate: "2026-04-15",
      }),
    );
    expect(html).toContain("Zahlbar bis");
    expect(html).toContain("15");
  });

  it("contains validity date for quote", () => {
    const html = buildInvoiceEmailHtml(
      makeInvoiceEmailData({
        documentType: "quote",
        documentNumber: "AN-2026-00001",
        dueDate: "2026-04-30",
      }),
    );
    expect(html).toContain("Gültig bis");
  });

  it("contains reminder text for dunning type", () => {
    const html = buildInvoiceEmailHtml(
      makeInvoiceEmailData({
        documentType: "dunning",
        documentNumber: "MA-2026-00001",
      }),
    );
    expect(html).toContain("ausstehende Zahlung");
  });

  it("contains standard closing (Freundliche Grüsse)", () => {
    const html = buildInvoiceEmailHtml(makeInvoiceEmailData());
    expect(html).toContain("Freundliche Grüsse");
  });

  it("is valid HTML with DOCTYPE", () => {
    const html = buildInvoiceEmailHtml(makeInvoiceEmailData());
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("contains Kivvi branding for free plan", () => {
    const html = buildInvoiceEmailHtml(makeInvoiceEmailData({ plan: "free" }));
    expect(html).toContain("kivvi.ch");
  });

  it("omits Kivvi branding for premium plan", () => {
    const html = buildInvoiceEmailHtml(
      makeInvoiceEmailData({ plan: "premium" }),
    );
    expect(html).not.toContain("Versendet mit");
  });

  it("contains specific text for delivery note (no amount mention)", () => {
    const html = buildInvoiceEmailHtml(
      makeInvoiceEmailData({
        documentType: "delivery_note",
        documentNumber: "LS-2026-00001",
      }),
    );
    expect(html).toContain("Lieferschein");
    expect(html).toContain("LS-2026-00001");
  });
});

// ============================================================================
// buildPasswordResetEmailHtml / Subject
// ============================================================================

describe("buildPasswordResetEmailSubject", () => {
  it("contains company name when provided", () => {
    const subject = buildPasswordResetEmailSubject({
      recipientEmail: "test@example.com",
      recipientName: "Test User",
      resetUrl: "https://app.kivvi.ch/reset?token=abc",
      companyName: "Muster AG",
    });
    expect(subject).toBe("Passwort zurücksetzen - Muster AG");
  });

  it("defaults to Kivvi when company name not provided", () => {
    const subject = buildPasswordResetEmailSubject({
      recipientEmail: "test@example.com",
      recipientName: "Test User",
      resetUrl: "https://app.kivvi.ch/reset?token=abc",
    });
    expect(subject).toBe("Passwort zurücksetzen - Kivvi");
  });
});

describe("buildPasswordResetEmailHtml", () => {
  const resetData: PasswordResetEmailData = {
    recipientEmail: "test@example.com",
    recipientName: "Hans Muster",
    resetUrl: "https://app.kivvi.ch/reset?token=abc123",
  };

  it("contains the reset URL", () => {
    const html = buildPasswordResetEmailHtml(resetData);
    expect(html).toContain("https://app.kivvi.ch/reset?token=abc123");
  });

  it("contains the recipient name", () => {
    const html = buildPasswordResetEmailHtml(resetData);
    expect(html).toContain("Hans Muster");
  });

  it("contains a clickable button", () => {
    const html = buildPasswordResetEmailHtml(resetData);
    expect(html).toContain("Passwort zurücksetzen");
    expect(html).toContain('href="https://app.kivvi.ch/reset?token=abc123"');
  });

  it("mentions the link expiration (1 hour)", () => {
    const html = buildPasswordResetEmailHtml(resetData);
    expect(html).toContain("1 Stunde");
  });

  it("is valid HTML", () => {
    const html = buildPasswordResetEmailHtml(resetData);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });
});

// ============================================================================
// buildInvitationEmailHtml / Subject
// ============================================================================

describe("buildInvitationEmailSubject", () => {
  it("contains company name", () => {
    const subject = buildInvitationEmailSubject({
      inviterName: "Anna Müller",
      companyName: "Muster AG",
      acceptUrl: "https://app.kivvi.ch/accept?token=xyz",
      role: "member",
    });
    expect(subject).toBe("Einladung: Muster AG auf Kivvi beitreten");
  });
});

describe("buildInvitationEmailHtml", () => {
  const invitationData: InvitationEmailData = {
    inviterName: "Anna Müller",
    companyName: "Muster AG",
    acceptUrl: "https://app.kivvi.ch/accept?token=xyz789",
    role: "admin",
  };

  it("contains the company name", () => {
    const html = buildInvitationEmailHtml(invitationData);
    expect(html).toContain("Muster AG");
  });

  it("contains the inviter name", () => {
    const html = buildInvitationEmailHtml(invitationData);
    expect(html).toContain("Anna Müller");
  });

  it("contains the accept URL", () => {
    const html = buildInvitationEmailHtml(invitationData);
    expect(html).toContain("https://app.kivvi.ch/accept?token=xyz789");
  });

  it("contains the role", () => {
    const html = buildInvitationEmailHtml(invitationData);
    expect(html).toContain("admin");
  });

  it("contains the accept button text", () => {
    const html = buildInvitationEmailHtml(invitationData);
    expect(html).toContain("Einladung annehmen");
  });

  it("mentions 7-day validity", () => {
    const html = buildInvitationEmailHtml(invitationData);
    expect(html).toContain("7 Tage");
  });

  it("is valid HTML", () => {
    const html = buildInvitationEmailHtml(invitationData);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("</html>");
  });
});
