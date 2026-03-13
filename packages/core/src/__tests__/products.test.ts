import { describe, it, expect } from "vitest";
import { createProductSchema, updateProductSchema } from "../domain/products";

describe("createProductSchema", () => {
  const validProduct = {
    name: "Test Product",
    type: "product" as const,
    unitPrice: "100.00",
    vatRate: "8.1",
  };

  it("accepts valid minimal product input", () => {
    const result = createProductSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it("accepts valid full product input", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      description: "A detailed description",
      sku: "SKU-001",
      ean: "1234567890123",
      currency: "CHF",
      unit: "piece",
      weight: "1.500",
      width: "10.00",
      height: "5.00",
      depth: "3.00",
      minStock: 10,
      serialNumberTracking: true,
      shopVisible: true,
      notes: "Some notes",
    });
    expect(result.success).toBe(true);
  });

  it("accepts service type", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      type: "service",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const { name, ...noName } = validProduct;
    const result = createProductSchema.safeParse(noName);
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 255 characters", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      name: "A".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      type: "widget",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid price format (letters)", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      unitPrice: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects price with more than 2 decimals", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      unitPrice: "100.123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative price (no minus sign allowed)", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      unitPrice: "-10.00",
    });
    expect(result.success).toBe(false);
  });

  it("accepts price with no decimals", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      unitPrice: "100",
    });
    expect(result.success).toBe(true);
  });

  it("accepts price with one decimal", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      unitPrice: "100.5",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid VAT rate format", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      vatRate: "abc",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid VAT rates (8.1, 2.6, 0)", () => {
    for (const rate of ["8.1", "2.6", "0"]) {
      const result = createProductSchema.safeParse({
        ...validProduct,
        vatRate: rate,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all valid unit types", () => {
    const units = ["piece", "hour", "kg", "m", "m2", "m3", "liter"];
    for (const unit of units) {
      const result = createProductSchema.safeParse({
        ...validProduct,
        unit,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid unit type", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      unit: "gallon",
    });
    expect(result.success).toBe(false);
  });

  it("defaults unit to piece when not specified", () => {
    const result = createProductSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unit).toBe("piece");
    }
  });

  it("defaults currency to CHF when not specified", () => {
    const result = createProductSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("CHF");
    }
  });

  it("defaults serialNumberTracking to false", () => {
    const result = createProductSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.serialNumberTracking).toBe(false);
    }
  });

  it("defaults shopVisible to false", () => {
    const result = createProductSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shopVisible).toBe(false);
    }
  });

  it("rejects negative minStock", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      minStock: -1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts zero minStock", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      minStock: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts nullable optional fields", () => {
    const result = createProductSchema.safeParse({
      ...validProduct,
      description: null,
      sku: null,
      ean: null,
      manufacturerId: null,
      productGroupId: null,
      purchasePrice: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateProductSchema", () => {
  it("accepts partial updates", () => {
    const result = updateProductSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no fields to update)", () => {
    const result = updateProductSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("still validates individual fields when provided", () => {
    const result = updateProductSchema.safeParse({ unitPrice: "invalid" });
    expect(result.success).toBe(false);
  });

  it("accepts updating just the type", () => {
    const result = updateProductSchema.safeParse({ type: "service" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid type on update", () => {
    const result = updateProductSchema.safeParse({ type: "widget" });
    expect(result.success).toBe(false);
  });
});
