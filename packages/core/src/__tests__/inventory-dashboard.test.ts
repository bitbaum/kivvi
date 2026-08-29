import { describe, it, expect } from "vitest";
import { getInventoryDashboard } from "../domain/inventory-dashboard";
import type { Database } from "@kivvi/database";

// getInventoryDashboard turns raw inventory rows into the refurbisher's
// headline KPIs — the heart of the secondhand-ERP story. The valuable logic is
// all post-query JS: true margin (revenue − (acquisition + repair)), average
// margin %, average days-to-sale, sell-through rate (sold / sold+recycled+
// donated), and per-item top-margin ranking. Each ratio guards its denominator.
// We drive it with a mock Database returning the seven queries in call order:
//   statusCounts → conditionCounts → unsoldValue → soldItems →
//   periodIntake → periodSold → recentSalesWithMargin

function selectBuilder(rows: unknown[]) {
  const b: Record<string, unknown> = {
    from: () => b,
    where: () => b,
    groupBy: () => b,
    orderBy: () => b,
    limit: () => b,
    then: (resolve: (v: unknown[]) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  };
  return b;
}

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";

type SoldItem = {
  soldPrice: string | null;
  estimatedValue: string | null;
  repairCost: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};
type TopRow = {
  itemNumber: string;
  description: string;
  estimatedValue: string | null;
  repairCost: string | null;
  soldPrice: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};
type Q = {
  status?: { status: string; count: number }[];
  condition?: { condition: string; count: number }[];
  unsoldValue?: { total: string; count: number };
  soldItems?: SoldItem[];
  intake?: { count: number };
  sold?: { count: number };
  recent?: TopRow[];
};

function makeDb(q: Q) {
  const reads: unknown[][] = [
    q.status ?? [],
    q.condition ?? [],
    q.unsoldValue ? [q.unsoldValue] : [],
    q.soldItems ?? [],
    q.intake ? [q.intake] : [],
    q.sold ? [q.sold] : [],
    q.recent ?? [],
  ];
  let idx = 0;
  return {
    select: () => selectBuilder(reads[idx++] ?? []),
  } as unknown as Database;
}

const day = (n: number) => new Date(2026, 0, n);

describe("getInventoryDashboard", () => {
  it("computes true margin and average margin % over sold items", async () => {
    const db = makeDb({
      soldItems: [
        // revenue 100, cost 40+10=50
        {
          soldPrice: "100",
          estimatedValue: "40",
          repairCost: "10",
          createdAt: null,
          updatedAt: null,
        },
        // revenue 200, cost 50+0=50
        {
          soldPrice: "200",
          estimatedValue: "50",
          repairCost: null,
          createdAt: null,
          updatedAt: null,
        },
      ],
    });
    const d = await getInventoryDashboard(db, COMPANY_ID);
    // revenue 300, cost 100 → profit 200, margin 200/300*100 = 66.7
    expect(d.totalProfit).toBe("200.00");
    expect(d.averageMarginPercent).toBe(66.7);
  });

  it("computes average days-to-sale, flooring and ignoring negatives", async () => {
    const db = makeDb({
      soldItems: [
        {
          soldPrice: "10",
          estimatedValue: "0",
          repairCost: "0",
          createdAt: day(1),
          updatedAt: day(11), // 10 days
        },
        {
          soldPrice: "10",
          estimatedValue: "0",
          repairCost: "0",
          createdAt: day(1),
          updatedAt: day(5), // 4 days
        },
      ],
    });
    const d = await getInventoryDashboard(db, COMPANY_ID);
    expect(d.avgDaysToSale).toBe(7); // round((10+4)/2)
  });

  it("computes sell-through rate as sold / (sold + recycled + donated)", async () => {
    const db = makeDb({
      status: [
        { status: "sold", count: 8 },
        { status: "recycled", count: 1 },
        { status: "donated", count: 1 },
        { status: "available", count: 5 }, // not terminal → excluded
      ],
    });
    const d = await getInventoryDashboard(db, COMPANY_ID);
    expect(d.sellThroughRate).toBe(80); // 8 / (8+1+1) * 100
    expect(d.byStatus).toMatchObject({ sold: 8, available: 5 });
  });

  it("ranks top items by margin and gives a free-acquisition item a 100% margin", async () => {
    const db = makeDb({
      recent: [
        // margin 50, %50
        {
          itemNumber: "INV-1",
          description: "Laptop",
          estimatedValue: "40",
          repairCost: "10",
          soldPrice: "100",
          createdAt: null,
          updatedAt: null,
        },
        // donated (free) sold at 80 → margin 80, 100%
        {
          itemNumber: "INV-2",
          description: "Monitor",
          estimatedValue: "0",
          repairCost: "0",
          soldPrice: "80",
          createdAt: null,
          updatedAt: null,
        },
      ],
    });
    const d = await getInventoryDashboard(db, COMPANY_ID);
    // Sorted by absolute margin desc: INV-2 (80) before INV-1 (50).
    expect(d.topItems.map((i) => i.itemNumber)).toEqual(["INV-2", "INV-1"]);
    expect(d.topItems[0]).toMatchObject({
      itemNumber: "INV-2",
      acquisitionCost: "0.00",
      soldPrice: "80.00",
      margin: "80.00",
      marginPercent: 100,
    });
    expect(d.topItems[1].marginPercent).toBe(50);
  });

  it("returns safe zeros for a company with no sold inventory", async () => {
    const db = makeDb({
      unsoldValue: { total: "1234.50", count: 7 },
    });
    const d = await getInventoryDashboard(db, COMPANY_ID);
    expect(d.averageMarginPercent).toBe(0);
    expect(d.totalProfit).toBe("0.00");
    expect(d.avgDaysToSale).toBe(0);
    expect(d.sellThroughRate).toBe(0);
    expect(d.topItems).toEqual([]);
    // Passthrough values still surface.
    expect(d.inventoryValue).toBe("1234.50");
    expect(d.unsoldCount).toBe(7);
  });

  it("passes period intake/sold counts through", async () => {
    const db = makeDb({
      intake: { count: 12 },
      sold: { count: 5 },
    });
    const d = await getInventoryDashboard(db, COMPANY_ID);
    expect(d.intakeCount).toBe(12);
    expect(d.soldCount).toBe(5);
  });
});
