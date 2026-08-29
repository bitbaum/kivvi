import { describe, it, expect } from "vitest";
import { findUninvoicedRepairLabor } from "../domain/revenue-leakage";
import type { Database } from "@kivvi/database";

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";
const ITEM_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ITEM_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

/**
 * Mock Database: `select()` returns queued result sets in call order —
 * 1st: candidate items, 2nd: existing labor invoices, 3rd: company settings.
 * The builder is awaitable (candidates/invoices) and exposes `.limit()`
 * (company lookup), both resolving to the same queued rows.
 */
function makeDb(queue: unknown[][]): Database {
  let call = 0;
  const db = {
    select: () => {
      const rows = queue[call++] ?? [];
      const b: Record<string, unknown> = {
        from: () => b,
        where: () => b,
        limit: () => Promise.resolve(rows),
        then: (resolve: (v: unknown[]) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(rows).then(resolve, reject),
      };
      return b;
    },
  };
  return db as unknown as Database;
}

describe("findUninvoicedRepairLabor", () => {
  it("lists items with logged hours and no labor invoice, with suggested amounts", async () => {
    const db = makeDb([
      [
        {
          itemId: ITEM_A,
          itemNumber: "IT-00001",
          description: "ThinkPad T480",
          status: "ready_for_sale",
          repairHours: "3.00",
        },
        {
          itemId: ITEM_B,
          itemNumber: "IT-00002",
          description: "Dell OptiPlex",
          status: "repair",
          repairHours: "1.50",
        },
      ],
      // Item B already billed — internalNotes marker links back to its id
      [
        {
          internalNotes: `Repair labor for inventory item IT-00002 (${ITEM_B}); amount CHF 120.00`,
        },
      ],
      [{ settings: { defaultRepairHourlyRate: "80.00" } }],
    ]);

    const report = await findUninvoicedRepairLabor(db, COMPANY_ID);

    expect(report.hourlyRate).toBe("80.00");
    expect(report.items).toHaveLength(1);
    expect(report.items[0]).toMatchObject({
      itemId: ITEM_A,
      itemNumber: "IT-00001",
      repairHours: "3.00",
      suggestedAmount: "240.00",
    });
    expect(report.totalHours).toBe("3.00");
    expect(report.totalSuggestedAmount).toBe("240.00");
  });

  it("returns null suggested amounts when no default rate is configured", async () => {
    const db = makeDb([
      [
        {
          itemId: ITEM_A,
          itemNumber: "IT-00001",
          description: "ThinkPad",
          status: "ready_for_sale",
          repairHours: "2.00",
        },
      ],
      [],
      [{ settings: {} }],
    ]);

    const report = await findUninvoicedRepairLabor(db, COMPANY_ID);
    expect(report.hourlyRate).toBeNull();
    expect(report.items[0].suggestedAmount).toBeNull();
    expect(report.totalSuggestedAmount).toBeNull();
    expect(report.totalHours).toBe("2.00");
  });
});
