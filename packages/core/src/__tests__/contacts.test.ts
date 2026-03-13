import { describe, it, expect } from "vitest";
import { createContactSchema, updateContactSchema } from "../domain/contacts";

describe("createContactSchema", () => {
  const validContact = {
    type: "customer" as const,
    name: "Muster AG",
  };

  it("accepts valid minimal contact (just type and name)", () => {
    const result = createContactSchema.safeParse(validContact);
    expect(result.success).toBe(true);
  });

  it("accepts valid full contact input", () => {
    const result = createContactSchema.safeParse({
      ...validContact,
      firstName: "Hans",
      lastName: "Muster",
      email: "hans@muster.ch",
      phone: "+41 44 123 45 67",
      mobile: "+41 79 123 45 67",
      website: "https://muster.ch",
      address: "Bahnhofstrasse 1",
      city: "Zürich",
      postalCode: "8001",
      country: "CH",
      vatNumber: "CHE-123.456.789",
      iban: "CH93 0076 2011 6238 5295 7",
      bic: "UBSWCHZH80A",
      paymentTermsDays: 30,
      creditLimit: "50000.00",
      language: "de",
      notes: "Important customer",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all three contact types", () => {
    for (const type of ["customer", "vendor", "both"] as const) {
      const result = createContactSchema.safeParse({ ...validContact, type });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid contact type", () => {
    const result = createContactSchema.safeParse({
      ...validContact,
      type: "partner",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createContactSchema.safeParse({
      ...validContact,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = createContactSchema.safeParse({ type: "customer" });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 200 characters", () => {
    const result = createContactSchema.safeParse({
      ...validContact,
      name: "A".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("accepts name with exactly 200 characters", () => {
    const result = createContactSchema.safeParse({
      ...validContact,
      name: "A".repeat(200),
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = createContactSchema.safeParse({
      ...validContact,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid email", () => {
    const result = createContactSchema.safeParse({
      ...validContact,
      email: "test@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for email (converts to nullable)", () => {
    const result = createContactSchema.safeParse({
      ...validContact,
      email: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null email", () => {
    const result = createContactSchema.safeParse({
      ...validContact,
      email: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects paymentTermsDays below 0", () => {
    const result = createContactSchema.safeParse({
      ...validContact,
      paymentTermsDays: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects paymentTermsDays above 365", () => {
    const result = createContactSchema.safeParse({
      ...validContact,
      paymentTermsDays: 366,
    });
    expect(result.success).toBe(false);
  });

  it("accepts paymentTermsDays at boundaries (0 and 365)", () => {
    for (const days of [0, 365]) {
      const result = createContactSchema.safeParse({
        ...validContact,
        paymentTermsDays: days,
      });
      expect(result.success).toBe(true);
    }
  });

  it("coerces paymentTermsDays from string to number", () => {
    const result = createContactSchema.safeParse({
      ...validContact,
      paymentTermsDays: "30",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paymentTermsDays).toBe(30);
    }
  });

  it("accepts nullable optional fields as null", () => {
    const result = createContactSchema.safeParse({
      ...validContact,
      firstName: null,
      lastName: null,
      phone: null,
      mobile: null,
      website: null,
      address: null,
      city: null,
      postalCode: null,
      country: null,
      vatNumber: null,
      iban: null,
      bic: null,
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects notes exceeding 5000 characters", () => {
    const result = createContactSchema.safeParse({
      ...validContact,
      notes: "A".repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});

describe("updateContactSchema", () => {
  it("accepts partial updates", () => {
    const result = updateContactSchema.safeParse({ name: "Updated AG" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no changes)", () => {
    const result = updateContactSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("validates provided fields", () => {
    const result = updateContactSchema.safeParse({ email: "bad-email" });
    expect(result.success).toBe(false);
  });

  it("accepts changing type", () => {
    const result = updateContactSchema.safeParse({ type: "vendor" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid type on update", () => {
    const result = updateContactSchema.safeParse({ type: "lead" });
    expect(result.success).toBe(false);
  });
});

describe("contact type enum values", () => {
  it("customer type is accepted", () => {
    const result = createContactSchema.safeParse({
      type: "customer",
      name: "Test",
    });
    expect(result.success).toBe(true);
  });

  it("vendor type is accepted", () => {
    const result = createContactSchema.safeParse({
      type: "vendor",
      name: "Test",
    });
    expect(result.success).toBe(true);
  });

  it("both type is accepted", () => {
    const result = createContactSchema.safeParse({
      type: "both",
      name: "Test",
    });
    expect(result.success).toBe(true);
  });

  it("missing type is rejected", () => {
    const result = createContactSchema.safeParse({ name: "Test" });
    expect(result.success).toBe(false);
  });
});
