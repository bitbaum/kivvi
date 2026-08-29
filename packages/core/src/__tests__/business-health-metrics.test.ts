import { describe, it, expect } from "vitest";
import { getBusinessHealthMetrics } from "../domain/dashboard-stats";
import type { Database } from "@kivvi/database";

// getBusinessHealthMetrics derives the six KPIs shown on the dashboard from six
// aggregate queries. The arithmetic is the risk surface: every ratio guards its
// denominator so an empty company yields clean numbers instead of NaN/Infinity,
// and each result is rounded to a fixed precision. Note cashFlowRatio defaults
// to 100 (not 0) when there are no costs. We drive it with a mock Database that
// returns the six single-row query results in call order:
//   revenue → costs → conversion → payment → lastYear → thisYear

function selectBuilder(rows: unknown[]) {
  const b: Record<string, unknown> = {
    from: () => b,
    where: () => b,
    then: (resolve: (v: unknown[]) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  };
  return b;
}

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";

type Rows = {
  revenue?: { revenue: string; count: number };
  costs?: { costs: string };
  conversion?: { quotes: number; orders: number };
  payment?: { avgDays: number | null };
  lastYear?: { count: number };
  thisYear?: { count: number };
};

function makeDb(r: Rows) {
  // Each query is destructured as [row]; an empty array → undefined row.
  const reads: unknown[][] = [
    r.revenue ? [r.revenue] : [],
    r.costs ? [r.costs] : [],
    r.conversion ? [r.conversion] : [],
    r.payment ? [r.payment] : [],
    r.lastYear ? [r.lastYear] : [],
    r.thisYear ? [r.thisYear] : [],
  ];
  let idx = 0;
  return {
    select: () => selectBuilder(reads[idx++] ?? []),
  } as unknown as Database;
}

describe("getBusinessHealthMetrics", () => {
  it("computes every KPI for a company with real activity", async () => {
    const db = makeDb({
      revenue: { revenue: "10000", count: 5 },
      costs: { costs: "6000" },
      conversion: { quotes: 10, orders: 4 },
      payment: { avgDays: 12 },
      lastYear: { count: 8 },
      thisYear: { count: 10 },
    });
    const m = await getBusinessHealthMetrics(db, COMPANY_ID);
    expect(m.profitMargin).toBe(40); // (10000-6000)/10000*100
    expect(m.conversionRate).toBe(40); // 4/10*100
    expect(m.avgInvoiceValue).toBe(2000); // 10000/5
    expect(m.avgDaysToPayment).toBe(12);
    expect(m.cashFlowRatio).toBe(166.7); // 10000/6000*100, 1 dp
    expect(m.customerRetentionRate).toBe(125); // 10/8*100
  });

  it("returns clean zeros (and cashFlowRatio 100) for a company with no data", async () => {
    const db = makeDb({}); // every query yields no row
    const m = await getBusinessHealthMetrics(db, COMPANY_ID);
    expect(m.profitMargin).toBe(0);
    expect(m.conversionRate).toBe(0);
    expect(m.avgInvoiceValue).toBe(0);
    expect(m.avgDaysToPayment).toBe(0);
    // No costs → ratio is defined as 100, NOT 0 or Infinity.
    expect(m.cashFlowRatio).toBe(100);
    expect(m.customerRetentionRate).toBe(0);
    // Crucially, nothing is NaN.
    for (const v of Object.values(m)) expect(Number.isNaN(v)).toBe(false);
  });

  it("reports a negative profit margin when costs exceed revenue", async () => {
    const db = makeDb({
      revenue: { revenue: "1000", count: 1 },
      costs: { costs: "1500" },
    });
    const m = await getBusinessHealthMetrics(db, COMPANY_ID);
    expect(m.profitMargin).toBe(-50); // (1000-1500)/1000*100
  });

  it("rounds the conversion rate to one decimal place", async () => {
    const db = makeDb({
      conversion: { quotes: 3, orders: 1 }, // 33.333… %
    });
    const m = await getBusinessHealthMetrics(db, COMPANY_ID);
    expect(m.conversionRate).toBe(33.3);
  });

  it("rounds the average invoice value to two decimal places", async () => {
    const db = makeDb({
      revenue: { revenue: "100", count: 3 }, // 33.333…
    });
    const m = await getBusinessHealthMetrics(db, COMPANY_ID);
    expect(m.avgInvoiceValue).toBe(33.33);
  });

  it("treats a null average-days-to-payment as zero", async () => {
    const db = makeDb({
      payment: { avgDays: null }, // AVG over no rows → null
    });
    const m = await getBusinessHealthMetrics(db, COMPANY_ID);
    expect(m.avgDaysToPayment).toBe(0);
  });

  it("guards conversion and retention against zero denominators", async () => {
    const db = makeDb({
      conversion: { quotes: 0, orders: 5 }, // orders but no quotes
      lastYear: { count: 0 }, // no prior-year customers
      thisYear: { count: 7 },
    });
    const m = await getBusinessHealthMetrics(db, COMPANY_ID);
    expect(m.conversionRate).toBe(0);
    expect(m.customerRetentionRate).toBe(0);
    expect(Number.isFinite(m.conversionRate)).toBe(true);
    expect(Number.isFinite(m.customerRetentionRate)).toBe(true);
  });
});
