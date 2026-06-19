import { describe, it, expect } from "vitest";
import { stockMovements, stockLevels, products } from "@kivvi/database";
import {
  createStockMovementsForDocument,
  updateStockReservationsForDocument,
} from "../domain/inventory-integration";
import type { Database, DocumentStatus } from "@kivvi/database";

// Stock-movement direction is a correctness invariant (Ground Truth #1): a sale
// must DECREASE stock (negative signed quantity), a purchase must INCREASE it,
// a credit note returns goods, and a cancellation reverses prior movements. A
// sign error here silently corrupts inventory. These tests drive
// createStockMovementsForDocument / updateStockReservationsForDocument against a
// mock Database, capturing every write so the signed quantity and movement type
// are pinned per document-type × status transition.

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";
const WAREHOUSE = { id: "warehouse-1" };

type Insert = { table: string; values: Record<string, unknown> };
type Update = { table: string; set: Record<string, unknown> };

const TABLE_NAMES = new Map<unknown, string>([
  [stockMovements, "stockMovements"],
  [stockLevels, "stockLevels"],
  [products, "products"],
]);

/**
 * Mock Database. `select()` yields queued read results in call order. Every
 * insert/update is captured with its target table so assertions can target a
 * specific write (e.g. only stockMovements rows).
 */
function makeDb(reads: unknown[][]) {
  let idx = 0;
  const inserts: Insert[] = [];
  const updates: Update[] = [];

  function selectBuilder(rows: unknown[]) {
    const b: Record<string, unknown> = {
      from: () => b,
      where: () => b,
      leftJoin: () => b,
      groupBy: () => b,
      limit: () => b,
      then: (
        resolve: (v: unknown[]) => unknown,
        reject?: (e: unknown) => unknown,
      ) => Promise.resolve(rows).then(resolve, reject),
    };
    return b;
  }

  const db = {
    select: () => selectBuilder(reads[idx++] ?? []),
    insert: (table: unknown) => ({
      values: (v: Record<string, unknown>) => {
        inserts.push({ table: TABLE_NAMES.get(table) ?? "unknown", values: v });
        // Thenable (for bare `await insert().values()`) that also exposes
        // onConflictDoUpdate (for upserts).
        return {
          onConflictDoUpdate: async () => undefined,
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve(undefined).then(resolve),
        };
      },
    }),
    update: (table: unknown) => ({
      set: (s: Record<string, unknown>) => ({
        where: async () => {
          updates.push({ table: TABLE_NAMES.get(table) ?? "unknown", set: s });
          return undefined;
        },
      }),
    }),
  };

  return {
    db: db as unknown as Database,
    inserts,
    updates,
    movements: () => inserts.filter((i) => i.table === "stockMovements"),
  };
}

const productItem = (quantity: string, productType = "product") => ({
  productId: "product-1",
  quantity,
  productType,
});

describe("createStockMovementsForDocument", () => {
  it("decreases stock on a delivered delivery note (sale, negative qty)", async () => {
    const { db, movements } = makeDb([
      [WAREHOUSE], // default warehouse
      [productItem("5")], // line items
      [{ total: "-5" }], // SUM recalc after the movement
    ]);
    await createStockMovementsForDocument(
      db,
      COMPANY_ID,
      {
        id: "d1",
        type: "delivery_note",
        number: "LS-2026-00001",
        status: "sent",
      },
      "delivered" as DocumentStatus,
    );
    const m = movements();
    expect(m).toHaveLength(1);
    expect(m[0].values).toMatchObject({ type: "sale", quantity: "-5" });
  });

  it("increases stock on a confirmed purchase invoice (purchase, positive qty)", async () => {
    const { db, movements } = makeDb([
      [WAREHOUSE],
      [productItem("3")],
      [{ total: "3" }],
    ]);
    await createStockMovementsForDocument(
      db,
      COMPANY_ID,
      {
        id: "d2",
        type: "purchase_invoice",
        number: "ER-2026-00001",
        status: "draft",
      },
      "confirmed" as DocumentStatus,
    );
    const m = movements();
    expect(m).toHaveLength(1);
    expect(m[0].values).toMatchObject({ type: "purchase", quantity: "3" });
  });

  it("returns stock on a sent credit note (return, positive qty)", async () => {
    const { db, movements } = makeDb([
      [WAREHOUSE],
      [productItem("2")],
      [{ total: "2" }],
    ]);
    await createStockMovementsForDocument(
      db,
      COMPANY_ID,
      {
        id: "d3",
        type: "credit_note",
        number: "GU-2026-00001",
        status: "draft",
      },
      "sent" as DocumentStatus,
    );
    expect(movements()[0].values).toMatchObject({
      type: "return",
      quantity: "2",
    });
  });

  it("deducts stock for a sent invoice with no prior delivery note", async () => {
    const { db, movements } = makeDb([
      [WAREHOUSE], // warehouse
      [], // hasDeliveryNoteDeduction: no direct delivery note
      [productItem("4")], // line items
      [{ total: "-4" }], // SUM
    ]);
    await createStockMovementsForDocument(
      db,
      COMPANY_ID,
      { id: "d4", type: "invoice", number: "RE-2026-00001", status: "draft" },
      "sent" as DocumentStatus,
    );
    expect(movements()).toHaveLength(1);
    expect(movements()[0].values).toMatchObject({
      type: "sale",
      quantity: "-4",
    });
  });

  it("does NOT double-deduct a sent invoice when a delivery note already shipped", async () => {
    const { db, inserts } = makeDb([
      [WAREHOUSE], // warehouse
      [{ id: "dn-1" }], // direct delivery note exists → already deducted
    ]);
    await createStockMovementsForDocument(
      db,
      COMPANY_ID,
      { id: "d5", type: "invoice", number: "RE-2026-00002", status: "draft" },
      "sent" as DocumentStatus,
    );
    expect(inserts).toHaveLength(0);
  });

  it("reverses prior movements as adjustments when a document is cancelled", async () => {
    const { db, movements } = makeDb([
      // existing movements linked to the document (a -5 sale)
      [
        {
          productId: "product-1",
          warehouseId: WAREHOUSE.id,
          quantity: "-5",
          type: "sale",
        },
      ],
      [{ total: "0" }], // SUM recalc after the reversal
    ]);
    await createStockMovementsForDocument(
      db,
      COMPANY_ID,
      { id: "d6", type: "invoice", number: "RE-2026-00003", status: "sent" },
      "cancelled" as DocumentStatus,
    );
    const m = movements();
    expect(m).toHaveLength(1);
    // Reversal negates the original (-5 → +5) and is booked as an adjustment.
    expect(m[0].values).toMatchObject({ type: "adjustment", quantity: "5" });
    expect(m[0].values.reference).toContain("Cancellation");
  });

  it("creates no movements for a transition with no stock semantics", async () => {
    // A quote moving to "sent" has no inventory effect — no warehouse lookup.
    const { db, inserts } = makeDb([]);
    await createStockMovementsForDocument(
      db,
      COMPANY_ID,
      { id: "d7", type: "quote", number: "AN-2026-00001", status: "draft" },
      "sent" as DocumentStatus,
    );
    expect(inserts).toHaveLength(0);
  });

  it("ignores service line items (only physical products move stock)", async () => {
    const { db, inserts } = makeDb([
      [WAREHOUSE],
      [productItem("5", "service")], // a service, not a product
    ]);
    await createStockMovementsForDocument(
      db,
      COMPANY_ID,
      {
        id: "d8",
        type: "delivery_note",
        number: "LS-2026-00002",
        status: "sent",
      },
      "delivered" as DocumentStatus,
    );
    expect(inserts).toHaveLength(0);
  });

  it("creates no movements when the company has no default warehouse", async () => {
    const { db, inserts } = makeDb([[]]); // no default warehouse
    await createStockMovementsForDocument(
      db,
      COMPANY_ID,
      {
        id: "d9",
        type: "delivery_note",
        number: "LS-2026-00003",
        status: "sent",
      },
      "delivered" as DocumentStatus,
    );
    expect(inserts).toHaveLength(0);
  });
});

describe("updateStockReservationsForDocument", () => {
  it("reserves stock when an order is confirmed", async () => {
    const { db, inserts } = makeDb([[WAREHOUSE], [productItem("7")]]);
    await updateStockReservationsForDocument(
      db,
      COMPANY_ID,
      { id: "o1", type: "order", status: "draft" },
      "confirmed" as DocumentStatus,
    );
    expect(inserts).toHaveLength(1);
    expect(inserts[0].table).toBe("stockLevels");
    expect(inserts[0].values).toMatchObject({ reservedQuantity: "7" });
  });

  it("releases the reservation when a confirmed order is delivered", async () => {
    const { db, inserts } = makeDb([[WAREHOUSE], [productItem("7")]]);
    await updateStockReservationsForDocument(
      db,
      COMPANY_ID,
      { id: "o2", type: "order", status: "confirmed" },
      "delivered" as DocumentStatus,
    );
    // Release inserts a zero reservation row; the upsert subtracts the delta.
    expect(inserts).toHaveLength(1);
    expect(inserts[0].values).toMatchObject({ reservedQuantity: "0" });
  });

  it("ignores non-order documents", async () => {
    const { db, inserts } = makeDb([]);
    await updateStockReservationsForDocument(
      db,
      COMPANY_ID,
      { id: "i1", type: "invoice", status: "draft" },
      "confirmed" as DocumentStatus,
    );
    expect(inserts).toHaveLength(0);
  });

  it("does nothing for an order transition that neither reserves nor releases", async () => {
    const { db, inserts } = makeDb([]);
    await updateStockReservationsForDocument(
      db,
      COMPANY_ID,
      { id: "o3", type: "order", status: "draft" },
      "sent" as DocumentStatus,
    );
    expect(inserts).toHaveLength(0);
  });
});
