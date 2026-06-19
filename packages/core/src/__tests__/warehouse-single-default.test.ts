import { describe, it, expect } from "vitest";
import { createWarehouse, updateWarehouse } from "../domain/inventory";
import type { Database } from "@kivvi/database";

// A company may have at most ONE default warehouse (Ground Truth #5 — one
// source of truth for "the default"). createWarehouse / updateWarehouse enforce
// this in JS: when isDefault is true they open a transaction that first unsets
// every existing default, then insert/update the target. When isDefault is
// false they write directly with no transaction and leave existing defaults
// untouched. These tests pin that branching against a mock Database that
// records the "unset others" write and whether a transaction was opened.

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";
const WAREHOUSE_ID = "11111111-1111-4111-8111-111111111111";

type SetCall = { set: Record<string, unknown> };

/**
 * Mock Database. Captures every update().set() payload (so the "unset others"
 * step is observable) and whether db.transaction was opened. `updateReturning`
 * / `insertReturning` supply the rows echoed by .returning().
 */
function makeDb(opts: {
  updateReturning?: unknown[];
  insertReturning?: unknown[];
}) {
  const setCalls: SetCall[] = [];
  let transactionRan = false;

  const updateChain = () => ({
    set: (s: Record<string, unknown>) => {
      setCalls.push({ set: s });
      const whereResult = {
        returning: async () => opts.updateReturning ?? [],
        then: (resolve: (x: unknown) => unknown) =>
          Promise.resolve(undefined).then(resolve),
      };
      return { where: () => whereResult };
    },
  });

  const insertChain = () => ({
    values: () => ({
      returning: async () => opts.insertReturning ?? [],
    }),
  });

  const handle = {
    update: updateChain,
    insert: insertChain,
  };

  const db = {
    ...handle,
    transaction: async (cb: (tx: unknown) => Promise<unknown>) => {
      transactionRan = true;
      return cb(handle);
    },
  };

  return {
    db: db as unknown as Database,
    setCalls,
    ranTransaction: () => transactionRan,
    // The "unset others" step sets ONLY {isDefault: false}; the target
    // insert/update always also carries a `name`, so exclude those.
    unsetOthersCalls: () =>
      setCalls.filter((c) => c.set.isDefault === false && !("name" in c.set))
        .length,
  };
}

const NEW_DEFAULT = { id: WAREHOUSE_ID, name: "Hauptlager", isDefault: true };

describe("createWarehouse — single default invariant", () => {
  it("unsets existing defaults inside a transaction when creating a default", async () => {
    const { db, ranTransaction, unsetOthersCalls } = makeDb({
      insertReturning: [NEW_DEFAULT],
    });
    const wh = await createWarehouse(db, COMPANY_ID, {
      name: "Hauptlager",
      isDefault: true,
    });
    expect(wh).toEqual(NEW_DEFAULT);
    expect(ranTransaction()).toBe(true);
    // Exactly one "unset all current defaults" write precedes the insert.
    expect(unsetOthersCalls()).toBe(1);
  });

  it("does NOT open a transaction or touch other defaults for a non-default warehouse", async () => {
    const { db, ranTransaction, unsetOthersCalls } = makeDb({
      insertReturning: [
        { id: WAREHOUSE_ID, name: "Aussenlager", isDefault: false },
      ],
    });
    const wh = await createWarehouse(db, COMPANY_ID, {
      name: "Aussenlager",
      isDefault: false,
    });
    expect(wh).toMatchObject({ isDefault: false });
    expect(ranTransaction()).toBe(false);
    expect(unsetOthersCalls()).toBe(0);
  });

  it("rejects an empty name at the Zod boundary", async () => {
    const { db } = makeDb({});
    await expect(
      createWarehouse(db, COMPANY_ID, { name: "", isDefault: false }),
    ).rejects.toThrow();
  });
});

describe("updateWarehouse — single default invariant", () => {
  it("unsets existing defaults inside a transaction when promoting to default", async () => {
    const { db, ranTransaction, unsetOthersCalls } = makeDb({
      updateReturning: [NEW_DEFAULT],
    });
    const wh = await updateWarehouse(db, COMPANY_ID, WAREHOUSE_ID, {
      name: "Hauptlager",
      isDefault: true,
    });
    expect(wh).toEqual(NEW_DEFAULT);
    expect(ranTransaction()).toBe(true);
    // One unset-others write, plus the target update (also a set, but with
    // isDefault: true) — so exactly one set payload has isDefault === false.
    expect(unsetOthersCalls()).toBe(1);
  });

  it("updates directly without a transaction for a non-default warehouse", async () => {
    const { db, ranTransaction, unsetOthersCalls } = makeDb({
      updateReturning: [
        { id: WAREHOUSE_ID, name: "Aussenlager", isDefault: false },
      ],
    });
    await updateWarehouse(db, COMPANY_ID, WAREHOUSE_ID, {
      name: "Aussenlager",
      isDefault: false,
    });
    expect(ranTransaction()).toBe(false);
    expect(unsetOthersCalls()).toBe(0);
  });

  it("throws when the target warehouse is not found (default path)", async () => {
    const { db } = makeDb({ updateReturning: [] }); // update matched no row
    await expect(
      updateWarehouse(db, COMPANY_ID, WAREHOUSE_ID, {
        name: "Hauptlager",
        isDefault: true,
      }),
    ).rejects.toThrow("Warehouse not found");
  });

  it("throws when the target warehouse is not found (non-default path)", async () => {
    const { db } = makeDb({ updateReturning: [] });
    await expect(
      updateWarehouse(db, COMPANY_ID, WAREHOUSE_ID, {
        name: "Aussenlager",
        isDefault: false,
      }),
    ).rejects.toThrow("Warehouse not found");
  });
});
