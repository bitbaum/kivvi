import { describe, it, expect } from "vitest";
import { analyzeInventoryImportRows, type WarehouseOption } from "../domain/inventory-import";

const SHOP: WarehouseOption = { id: "wh-shop", name: "Shop", isDefault: true };
const STORAGE_A: WarehouseOption = { id: "wh-a", name: "Lager A" };
const STORAGE_B: WarehouseOption = { id: "wh-b", name: "Lager B" };

describe("analyzeInventoryImportRows", () => {
  it("marks a complete, located, non-duplicate row as ready", () => {
    const { rows } = analyzeInventoryImportRows(
      [
        {
          description: "ThinkPad X260",
          condition: "good",
          serialNumber: "SN-001",
          askingPrice: "250.00",
          warehouse: "Shop",
          location: "Regal 3",
        },
      ],
      { warehouses: [SHOP, STORAGE_A] },
    );

    const row = rows[0];
    expect(row.resolvedWarehouseId).toBe("wh-shop");
    expect(row.decision).toBe("ready");
    expect(row.completeness.score).toBe(100);
    // Presence still unconfirmed until a human ticks it.
    expect(row.presenceConfirmed).toBe(false);
  });

  it("blocks a row with no description", () => {
    const { rows, summary } = analyzeInventoryImportRows([{ warehouse: "Shop" }], {
      warehouses: [SHOP],
    });
    expect(rows[0].decision).toBe("blocked");
    expect(rows[0].issues.some((i) => i.code === "MISSING_DESCRIPTION")).toBe(true);
    expect(summary.blocked).toBe(1);
  });

  it("blocks a row whose location can't be resolved and has no fallback", () => {
    const { rows, summary } = analyzeInventoryImportRows(
      [{ description: "Monitor", warehouse: "Nirgendwo" }],
      { warehouses: [SHOP, STORAGE_A] },
    );
    expect(rows[0].resolvedWarehouseId).toBeNull();
    expect(rows[0].issues.some((i) => i.code === "LOCATION_UNRESOLVED")).toBe(true);
    expect(summary.missingLocation).toBe(1);
  });

  it("uses the fallback warehouse when no hint is present", () => {
    const { rows } = analyzeInventoryImportRows(
      [{ description: "Keyboard", condition: "good", askingPrice: "20.00" }],
      { warehouses: [SHOP, STORAGE_A], fallbackWarehouseId: "wh-shop" },
    );
    expect(rows[0].resolvedWarehouseId).toBe("wh-shop");
  });

  it("flags an ambiguous warehouse hint instead of guessing", () => {
    const { rows } = analyzeInventoryImportRows([{ description: "Cable", warehouse: "Lager" }], {
      warehouses: [STORAGE_A, STORAGE_B],
    });
    expect(rows[0].resolvedWarehouseId).toBeNull();
    expect(rows[0].issues.some((i) => i.code === "LOCATION_AMBIGUOUS")).toBe(true);
  });

  it("detects duplicates within the file and against existing serials", () => {
    const { rows, summary } = analyzeInventoryImportRows(
      [
        { description: "A", warehouse: "Shop", serialNumber: "DUP" },
        { description: "B", warehouse: "Shop", serialNumber: "DUP" },
        { description: "C", warehouse: "Shop", serialNumber: "EXIST" },
      ],
      {
        warehouses: [SHOP],
        existingSerialNumbers: new Set(["exist"]),
      },
    );

    expect(rows[0].issues.some((i) => i.code === "DUPLICATE_SERIAL_IN_FILE")).toBe(true);
    expect(rows[2].issues.some((i) => i.code === "DUPLICATE_SERIAL_EXISTING")).toBe(true);
    expect(summary.duplicates).toBe(3);
  });

  it("normalizes Swiss-formatted prices and synonymed conditions", () => {
    const { rows } = analyzeInventoryImportRows(
      [
        {
          description: "Server",
          warehouse: "Shop",
          askingPrice: "1'250.50",
          condition: "neuwertig",
        },
      ],
      { warehouses: [SHOP] },
    );
    expect(rows[0].normalized.askingPrice).toBe("1250.50");
    expect(rows[0].normalized.condition).toBe("like_new");
  });

  it("always flags presence as unconfirmed so a human must verify", () => {
    const { rows } = analyzeInventoryImportRows([{ description: "X", warehouse: "Shop" }], {
      warehouses: [SHOP],
    });
    expect(rows[0].issues.some((i) => i.code === "PRESENCE_UNCONFIRMED")).toBe(true);
  });
});
