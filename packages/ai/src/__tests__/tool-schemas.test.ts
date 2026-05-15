import { describe, it, expect } from "vitest";
import { getDefaultTools } from "../tools/index";
import type { Tool } from "../types";

function findTool(name: string): Tool {
  const tool = getDefaultTools().find((t) => t.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool;
}

function parse(toolName: string, input: unknown) {
  return findTool(toolName).parameters.safeParse(input);
}

// ============================================================================
// bulk_update_item_status
// ============================================================================

describe("bulk_update_item_status schema", () => {
  const tool = "bulk_update_item_status";

  it("accepts valid input", () => {
    const result = parse(tool, {
      item_identifiers: ["IT-00001", "IT-00002"],
      status: "testing",
    });
    expect(result.success).toBe(true);
  });

  it("rejects fewer than 2 identifiers", () => {
    const result = parse(tool, {
      item_identifiers: ["IT-00001"],
      status: "testing",
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 200 identifiers", () => {
    const result = parse(tool, {
      item_identifiers: Array.from({ length: 201 }, (_, i) => `IT-${i}`),
      status: "testing",
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 200 identifiers", () => {
    const result = parse(tool, {
      item_identifiers: Array.from(
        { length: 200 },
        (_, i) => `IT-${String(i).padStart(5, "0")}`,
      ),
      status: "ready_for_sale",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = parse(tool, {
      item_identifiers: ["IT-00001", "IT-00002"],
      status: "sold",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid statuses", () => {
    const validStatuses = [
      "intake",
      "testing",
      "repair",
      "ready_for_sale",
      "listed",
      "reserved",
      "donated",
      "parts_only",
      "recycled",
    ];
    for (const status of validStatuses) {
      const result = parse(tool, {
        item_identifiers: ["IT-00001", "IT-00002"],
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects missing status", () => {
    const result = parse(tool, { item_identifiers: ["IT-00001", "IT-00002"] });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// update_item_status
// ============================================================================

describe("update_item_status schema", () => {
  const tool = "update_item_status";

  it("accepts item number + valid status", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      status: "testing",
    });
    expect(result.success).toBe(true);
  });

  it("accepts UUID identifier", () => {
    const result = parse(tool, {
      item_identifier: "550e8400-e29b-41d4-a716-446655440000",
      status: "repair",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing item_identifier", () => {
    const result = parse(tool, { status: "testing" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      status: "unknown",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// update_item_condition
// ============================================================================

describe("update_item_condition schema", () => {
  const tool = "update_item_condition";

  it("accepts valid condition", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      condition: "good",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid conditions", () => {
    const validConditions = [
      "untested",
      "like_new",
      "good",
      "fair",
      "poor",
      "parts_only",
      "scrap",
    ];
    for (const condition of validConditions) {
      expect(
        parse(tool, { item_identifier: "IT-00001", condition }).success,
      ).toBe(true);
    }
  });

  it("rejects invalid condition", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      condition: "excellent",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// record_repair_part
// ============================================================================

describe("record_repair_part schema", () => {
  const tool = "record_repair_part";

  it("accepts valid minimal input", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      description: "Battery 5000mAh",
      unit_cost: 25.0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional quantity and notes", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      description: "Replacement screen",
      unit_cost: 45.0,
      quantity: 2,
      notes: "Samsung OEM part",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative unit_cost", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      description: "Battery",
      unit_cost: -1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts zero unit_cost (donated parts)", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      description: "Donated RAM stick",
      unit_cost: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero quantity", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      description: "Battery",
      unit_cost: 10,
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty description", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      description: "",
      unit_cost: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 200 chars", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      description: "x".repeat(201),
      unit_cost: 10,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// update_inventory_item
// ============================================================================

describe("update_inventory_item schema", () => {
  const tool = "update_inventory_item";

  it("accepts any single field update", () => {
    expect(
      parse(tool, { item_identifier: "IT-00001", location: "A3-B2" }).success,
    ).toBe(true);
    expect(
      parse(tool, { item_identifier: "IT-00001", asking_price: 299 }).success,
    ).toBe(true);
    expect(
      parse(tool, { item_identifier: "IT-00001", serial_number: "ABC123" })
        .success,
    ).toBe(true);
    expect(
      parse(tool, { item_identifier: "IT-00001", notes: "Tested OK" }).success,
    ).toBe(true);
  });

  it("rejects negative prices", () => {
    expect(
      parse(tool, { item_identifier: "IT-00001", asking_price: -1 }).success,
    ).toBe(false);
    expect(
      parse(tool, { item_identifier: "IT-00001", min_price: -0.01 }).success,
    ).toBe(false);
    expect(
      parse(tool, { item_identifier: "IT-00001", estimated_value: -100 })
        .success,
    ).toBe(false);
  });

  it("accepts zero prices", () => {
    expect(
      parse(tool, { item_identifier: "IT-00001", asking_price: 0 }).success,
    ).toBe(true);
    expect(
      parse(tool, { item_identifier: "IT-00001", min_price: 0 }).success,
    ).toBe(true);
  });

  it("rejects empty description", () => {
    const result = parse(tool, {
      item_identifier: "IT-00001",
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts no optional fields (only identifier)", () => {
    // Schema accepts this — execute() guards against it
    const result = parse(tool, { item_identifier: "IT-00001" });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// record_checklist
// ============================================================================

describe("record_checklist schema", () => {
  const tool = "record_checklist";

  it("accepts all_pass shorthand", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      results: "all_pass",
    });
    expect(result.success).toBe(true);
  });

  it("accepts array of results", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      results: [
        { id: "power_on", result: "pass" },
        { id: "display", result: "fail" },
        { id: "battery_pct", result: "pass", value: "87" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty results array", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      results: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid result value", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      results: [{ id: "power_on", result: "unknown" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects arbitrary string for results (not all_pass)", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      results: "all_fail",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// record_data_erasure
// ============================================================================

describe("record_data_erasure schema", () => {
  const tool = "record_data_erasure";

  it("accepts all valid erasure methods", () => {
    const methods = [
      "secure_erase",
      "dban",
      "manual",
      "certified",
      "factory_reset",
    ];
    for (const method of methods) {
      expect(parse(tool, { item_identifier: "IT-00001", method }).success).toBe(
        true,
      );
    }
  });

  it("accepts optional notes", () => {
    const result = parse(tool, {
      item_identifier: "IT-00001",
      method: "certified",
      notes: "BL-2024-99",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid method", () => {
    const result = parse(tool, {
      item_identifier: "IT-00001",
      method: "hammer",
    });
    expect(result.success).toBe(false);
  });

  it("rejects notes longer than 500 chars", () => {
    const result = parse(tool, {
      item_identifier: "IT-00001",
      method: "manual",
      notes: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// create_price_rule
// ============================================================================

describe("create_price_rule schema", () => {
  const tool = "create_price_rule";

  it("accepts fixed rule without product", () => {
    const result = parse(tool, {
      price_list_name: "wholesale",
      type: "fixed",
      value: 299.0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts percentage rule with product", () => {
    const result = parse(tool, {
      price_list_name: "student",
      type: "percentage",
      value: 15,
      product_identifier: "ThinkPad",
    });
    expect(result.success).toBe(true);
  });

  it("accepts tiered rule with min_quantity", () => {
    const result = parse(tool, {
      price_list_name: "volume",
      type: "tiered",
      value: 20,
      min_quantity: 10,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative value", () => {
    const result = parse(tool, {
      price_list_name: "wholesale",
      type: "percentage",
      value: -5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts zero value", () => {
    const result = parse(tool, {
      price_list_name: "wholesale",
      type: "fixed",
      value: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid date format", () => {
    const result = parse(tool, {
      price_list_name: "sale",
      type: "percentage",
      value: 10,
      valid_from: "01.01.2026",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid YYYY-MM-DD dates", () => {
    const result = parse(tool, {
      price_list_name: "spring-sale",
      type: "percentage",
      value: 20,
      valid_from: "2026-03-01",
      valid_to: "2026-03-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid type", () => {
    const result = parse(tool, {
      price_list_name: "sale",
      type: "multiplier",
      value: 0.8,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer min_quantity", () => {
    const result = parse(tool, {
      price_list_name: "volume",
      type: "tiered",
      value: 10,
      min_quantity: 1.5,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// intake_inventory_item
// ============================================================================

describe("intake_inventory_item schema", () => {
  const tool = "intake_inventory_item";

  it("accepts minimal valid input", () => {
    const result = parse(tool, { description: "ThinkPad T490" });
    expect(result.success).toBe(true);
  });

  it("accepts full input", () => {
    const result = parse(tool, {
      description: "Dell Latitude 5490",
      quantity: 10,
      donor_name: "UBS",
      category: "laptop",
      condition: "good",
      estimated_value: 50,
      location: "A3",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty description", () => {
    const result = parse(tool, { description: "" });
    expect(result.success).toBe(false);
  });

  it("rejects quantity less than 1", () => {
    const result = parse(tool, { description: "Laptop", quantity: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid condition", () => {
    const result = parse(tool, { description: "Laptop", condition: "mint" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// update_document_status
// ============================================================================

describe("update_document_status schema", () => {
  const tool = "update_document_status";

  it("accepts valid UUID + status", () => {
    const result = parse(tool, {
      documentId: "550e8400-e29b-41d4-a716-446655440000",
      newStatus: "sent",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid statuses", () => {
    const statuses = [
      "draft",
      "sent",
      "confirmed",
      "delivered",
      "paid",
      "partially_paid",
      "overdue",
      "cancelled",
      "dunning_1",
      "dunning_2",
      "dunning_3",
    ];
    for (const newStatus of statuses) {
      expect(
        parse(tool, {
          documentId: "550e8400-e29b-41d4-a716-446655440000",
          newStatus,
        }).success,
      ).toBe(true);
    }
  });

  it("rejects non-UUID documentId", () => {
    const result = parse(tool, {
      documentId: "RE-2026-00001",
      newStatus: "sent",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = parse(tool, {
      documentId: "550e8400-e29b-41d4-a716-446655440000",
      newStatus: "archived",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing newStatus", () => {
    const result = parse(tool, {
      documentId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// record_payment
// ============================================================================

describe("record_payment schema", () => {
  const tool = "record_payment";
  const uuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid minimal input", () => {
    const result = parse(tool, { documentId: uuid, amount: "1500.00" });
    expect(result.success).toBe(true);
  });

  it("accepts full input", () => {
    const result = parse(tool, {
      documentId: uuid,
      amount: "250.50",
      date: "2026-03-15",
      method: "cash",
      reference: "TXN-9999",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid payment methods", () => {
    for (const method of ["bank_transfer", "cash", "card", "other"]) {
      expect(
        parse(tool, { documentId: uuid, amount: "100", method }).success,
      ).toBe(true);
    }
  });

  it("rejects non-UUID documentId", () => {
    const result = parse(tool, {
      documentId: "RE-2026-00001",
      amount: "100.00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric amount string", () => {
    const result = parse(tool, { documentId: uuid, amount: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects amount with currency symbol", () => {
    const result = parse(tool, { documentId: uuid, amount: "CHF 100" });
    expect(result.success).toBe(false);
  });

  it("accepts integer amount string", () => {
    const result = parse(tool, { documentId: uuid, amount: "500" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid date format", () => {
    const result = parse(tool, {
      documentId: uuid,
      amount: "100",
      date: "15.03.2026",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid YYYY-MM-DD date", () => {
    const result = parse(tool, {
      documentId: uuid,
      amount: "100",
      date: "2026-03-15",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid method", () => {
    const result = parse(tool, {
      documentId: uuid,
      amount: "100",
      method: "crypto",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// create_contact
// ============================================================================

describe("create_contact schema", () => {
  const tool = "create_contact";

  it("accepts minimal valid input", () => {
    const result = parse(tool, { name: "Acme AG" });
    expect(result.success).toBe(true);
  });

  it("accepts full input", () => {
    const result = parse(tool, {
      name: "Acme AG",
      type: "vendor",
      email: "info@acme.ch",
      phone: "+41 44 123 45 67",
      address: "Bahnhofstrasse 1",
      city: "Zürich",
      postalCode: "8001",
      country: "CH",
      vatNumber: "CHE-123.456.789 MWST",
      notes: "Long-term supplier",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid contact types", () => {
    for (const type of ["customer", "vendor", "both"]) {
      expect(parse(tool, { name: "Test", type }).success).toBe(true);
    }
  });

  it("rejects empty name", () => {
    const result = parse(tool, { name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = parse(tool, { name: "Test", email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("accepts valid email", () => {
    const result = parse(tool, { name: "Test", email: "user@example.com" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid contact type", () => {
    const result = parse(tool, { name: "Test", type: "supplier" });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = parse(tool, { type: "customer" });
    expect(result.success).toBe(false);
  });

  it("defaults type to customer when omitted", () => {
    const result = parse(tool, { name: "Test" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("customer");
    }
  });
});

// ============================================================================
// record_repair
// ============================================================================

describe("record_repair schema", () => {
  const tool = "record_repair";

  it("accepts minimal valid input", () => {
    const result = parse(tool, { item_identifier: "IT-00042", cost: 35 });
    expect(result.success).toBe(true);
  });

  it("accepts full input", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      cost: 60,
      hours: 1.5,
      note: "Replaced keyboard and palmrest",
    });
    expect(result.success).toBe(true);
  });

  it("accepts zero cost (volunteer labour)", () => {
    const result = parse(tool, { item_identifier: "IT-00042", cost: 0 });
    expect(result.success).toBe(true);
  });

  it("rejects negative cost", () => {
    const result = parse(tool, { item_identifier: "IT-00042", cost: -5 });
    expect(result.success).toBe(false);
  });

  it("rejects negative hours", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      cost: 0,
      hours: -1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts zero hours", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      cost: 10,
      hours: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects note longer than 500 chars", () => {
    const result = parse(tool, {
      item_identifier: "IT-00042",
      cost: 10,
      note: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing cost", () => {
    const result = parse(tool, { item_identifier: "IT-00042" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// return_inventory_item
// ============================================================================

describe("return_inventory_item schema", () => {
  const tool = "return_inventory_item";

  it("accepts item number identifier", () => {
    const result = parse(tool, { item_identifier: "IT-00042" });
    expect(result.success).toBe(true);
  });

  it("accepts UUID identifier", () => {
    const result = parse(tool, {
      item_identifier: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing item_identifier", () => {
    const result = parse(tool, {});
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// create_price_list
// ============================================================================

describe("create_price_list schema", () => {
  const tool = "create_price_list";

  it("accepts minimal valid input", () => {
    const result = parse(tool, { name: "Wholesale" });
    expect(result.success).toBe(true);
  });

  it("accepts full input", () => {
    const result = parse(tool, {
      name: "Student Discount",
      currency: "EUR",
      is_default: true,
    });
    expect(result.success).toBe(true);
  });

  it("defaults currency to CHF when omitted", () => {
    const result = parse(tool, { name: "Test" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe("CHF");
    }
  });

  it("rejects currency that is not exactly 3 characters", () => {
    expect(parse(tool, { name: "Test", currency: "CH" }).success).toBe(false);
    expect(parse(tool, { name: "Test", currency: "EURO" }).success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = parse(tool, { name: "" });
    expect(result.success).toBe(false);
  });

  it("defaults is_default to false when omitted", () => {
    const result = parse(tool, { name: "Test" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_default).toBe(false);
    }
  });
});
