import { describe, it, expect } from "vitest";
import { transferStock } from "../domain/inventory";
import { DomainError } from "../domain-error";
import type { Database } from "@kivvi/database";

// transferStock moves stock between two warehouses. It must conserve quantity
// (one outbound −qty movement + one inbound +qty movement, net zero on the
// product), refuse a same-warehouse transfer, refuse transferring more than is
// on hand at the source, and do all writes in a single db.transaction so a
// failure can never leave stock half-moved (Ground Truth #1). These tests drive
// it against a mock Database that models transaction semantics and captures
// every movement insert.

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";
const FROM_WH = "11111111-1111-4111-8111-111111111111";
const TO_WH = "22222222-2222-4222-8222-222222222222";
const PRODUCT = "33333333-3333-4333-8333-333333333333";

type Insert = { values: Record<string, unknown> };

function selectBuilder(rows: unknown[]) {
  const b: Record<string, unknown> = {
    from: () => b,
    where: () => b,
    innerJoin: () => b,
    leftJoin: () => b,
    limit: () => b,
    then: (
      resolve: (v: unknown[]) => unknown,
      reject?: (e: unknown) => unknown,
    ) => Promise.resolve(rows).then(resolve, reject),
  };
  return b;
}

/**
 * Mock Database. Outer reads (warehouse lookups + product) come from
 * `outerReads` in call order; reads inside the transaction (source stock level,
 * then the stock recalc) come from `txReads`. Movement inserts inside the
 * transaction are captured and echoed back from `.returning()`.
 */
function makeDb(outerReads: unknown[][], txReads: unknown[][]) {
  let outerIdx = 0;
  let txIdx = 0;
  const movementInserts: Insert[] = [];
  const stockLevelInserts: Insert[] = [];
  let transactionRan = false;

  function makeTx() {
    return {
      select: () => selectBuilder(txReads[txIdx++] ?? []),
      insert: () => ({
        values: (v: Record<string, unknown>) => ({
          // movements use .returning(); the stock-level upsert uses
          // .onConflictDoUpdate(); the bare form is awaited directly.
          returning: async () => {
            movementInserts.push({ values: v });
            return [{ id: `mov-${movementInserts.length}`, ...v }];
          },
          onConflictDoUpdate: async () => {
            stockLevelInserts.push({ values: v });
            return undefined;
          },
          then: (resolve: (x: unknown) => unknown) =>
            Promise.resolve(undefined).then(resolve),
        }),
      }),
      update: () => ({
        set: () => ({ where: async () => undefined }),
      }),
    };
  }

  const db = {
    select: () => selectBuilder(outerReads[outerIdx++] ?? []),
    transaction: async (cb: (tx: unknown) => Promise<unknown>) => {
      transactionRan = true;
      return cb(makeTx());
    },
  };

  return {
    db: db as unknown as Database,
    movementInserts,
    stockLevelInserts,
    ranTransaction: () => transactionRan,
  };
}

const WH = (id: string, name: string) => ({ id, name, companyId: COMPANY_ID });
const baseInput = {
  fromWarehouseId: FROM_WH,
  toWarehouseId: TO_WH,
  productId: PRODUCT,
  quantity: "5",
};

describe("transferStock", () => {
  it("moves stock out of the source and into the destination, conserving quantity", async () => {
    const { db, movementInserts, stockLevelInserts, ranTransaction } = makeDb(
      [
        [WH(FROM_WH, "Hauptlager")], // getWarehouse(from)
        [WH(TO_WH, "Aussenlager")], // getWarehouse(to)
        [{ id: PRODUCT, companyId: COMPANY_ID }], // product lookup
      ],
      [
        [{ quantity: "20" }], // source stock level (enough)
        [{ total: "20" }], // product stock recalc
      ],
    );

    const { outMovement, inMovement } = await transferStock(
      db,
      COMPANY_ID,
      baseInput,
    );

    expect(ranTransaction()).toBe(true);
    // Outbound is negative, inbound positive, both typed "transfer".
    expect(outMovement).toMatchObject({
      warehouseId: FROM_WH,
      type: "transfer",
      quantity: "-5",
    });
    expect(inMovement).toMatchObject({
      warehouseId: TO_WH,
      type: "transfer",
      quantity: "5",
    });
    // Exactly two movements; they sum to zero (stock conserved).
    expect(movementInserts).toHaveLength(2);
    const sum =
      Number(movementInserts[0].values.quantity) +
      Number(movementInserts[1].values.quantity);
    expect(sum).toBe(0);
    // Destination stock level upserted once.
    expect(stockLevelInserts).toHaveLength(1);
    expect(stockLevelInserts[0].values).toMatchObject({ warehouseId: TO_WH });
  });

  it("uses a default reference describing the route when none is given", async () => {
    const { db, movementInserts } = makeDb(
      [
        [WH(FROM_WH, "Hauptlager")],
        [WH(TO_WH, "Aussenlager")],
        [{ id: PRODUCT, companyId: COMPANY_ID }],
      ],
      [[{ quantity: "20" }], [{ total: "20" }]],
    );
    await transferStock(db, COMPANY_ID, baseInput);
    expect(movementInserts[0].values.reference).toBe(
      "Transfer: Hauptlager → Aussenlager",
    );
  });

  it("refuses a transfer where source and destination are the same warehouse", async () => {
    const { db, ranTransaction } = makeDb([], []);
    await expect(
      transferStock(db, COMPANY_ID, {
        ...baseInput,
        toWarehouseId: FROM_WH,
      }),
    ).rejects.toMatchObject({ code: "warehouseSameSrcDst" });
    // Rejected before opening the transaction.
    expect(ranTransaction()).toBe(false);
  });

  it("throws when the source warehouse does not exist", async () => {
    const { db, ranTransaction } = makeDb(
      [[]], // getWarehouse(from) → none
      [],
    );
    await expect(transferStock(db, COMPANY_ID, baseInput)).rejects.toThrow(
      "Source warehouse not found",
    );
    expect(ranTransaction()).toBe(false);
  });

  it("throws when the destination warehouse does not exist", async () => {
    const { db } = makeDb(
      [[WH(FROM_WH, "Hauptlager")], []], // from ok, to missing
      [],
    );
    await expect(transferStock(db, COMPANY_ID, baseInput)).rejects.toThrow(
      "Destination warehouse not found",
    );
  });

  it("throws when the product does not exist", async () => {
    const { db } = makeDb(
      [[WH(FROM_WH, "Hauptlager")], [WH(TO_WH, "Aussenlager")], []],
      [],
    );
    await expect(transferStock(db, COMPANY_ID, baseInput)).rejects.toThrow(
      "Product not found",
    );
  });

  it("refuses to transfer more than the source holds, with available/requested", async () => {
    const { db, movementInserts } = makeDb(
      [
        [WH(FROM_WH, "Hauptlager")],
        [WH(TO_WH, "Aussenlager")],
        [{ id: PRODUCT, companyId: COMPANY_ID }],
      ],
      [
        [{ quantity: "3" }], // only 3 on hand, transferring 5
      ],
    );
    await expect(
      transferStock(db, COMPANY_ID, baseInput),
    ).rejects.toMatchObject({
      code: "insufficientStock",
      params: { available: "3", requested: "5" },
    });
    // No movement was written — the guard fires before any insert.
    expect(movementInserts).toHaveLength(0);
  });

  it("treats a source with no stock-level row as zero available", async () => {
    const { db } = makeDb(
      [
        [WH(FROM_WH, "Hauptlager")],
        [WH(TO_WH, "Aussenlager")],
        [{ id: PRODUCT, companyId: COMPANY_ID }],
      ],
      [
        [], // no stock level row for the source
      ],
    );
    await expect(
      transferStock(db, COMPANY_ID, baseInput),
    ).rejects.toMatchObject({
      code: "insufficientStock",
      params: { available: "0", requested: "5" },
    });
  });

  it("rejects invalid input before any DB access (Zod boundary)", async () => {
    const { db, ranTransaction } = makeDb([], []);
    await expect(
      transferStock(db, COMPANY_ID, {
        ...baseInput,
        fromWarehouseId: "not-a-uuid",
      }),
    ).rejects.toThrow();
    expect(ranTransaction()).toBe(false);
  });
});
