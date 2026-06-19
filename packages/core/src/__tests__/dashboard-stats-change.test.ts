import { describe, it, expect, vi, beforeEach } from "vitest";

// getDashboardStats assembles the eight headline dashboard tiles. Its non-SQL
// logic is the month-over-month change percentage: it is shown ONLY when both
// the current and the prior-month value are non-zero (a deliberate UX choice —
// "-100%" against a zero baseline is technically correct but useless), and is
// rounded to one decimal. We stub getFinancialSummary (the financial SSOT,
// tested separately) and feed the five dashboard-only queries.
vi.mock("../domain/documents", () => ({
  getFinancialSummary: vi.fn(),
}));

import { getDashboardStats } from "../domain/dashboard-stats";
import { getFinancialSummary } from "../domain/documents";
import type { Database } from "@kivvi/database";

const financialsMock = vi.mocked(getFinancialSummary);

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";

const BASE_FINANCIALS = {
  revenueThisMonth: 1200,
  revenueThisMonthCount: 6,
  revenueThisYear: 14000,
  outstandingTotal: 1100,
  outstandingCount: 3,
  overdueTotal: 400,
  overdueCount: 2,
  draftsTotal: 90,
  draftsCount: 2,
};

function selectBuilder(rows: unknown[]) {
  const b: Record<string, unknown> = {
    from: () => b,
    where: () => b,
    then: (
      resolve: (v: unknown[]) => unknown,
      reject?: (e: unknown) => unknown,
    ) => Promise.resolve(rows).then(resolve, reject),
  };
  return b;
}

// Dashboard-only queries, in Promise.all order after the (mocked) financials:
// bankBalance → contactCount → productCount → lastMonthRevenue → lastMonthOutstanding
type Q = {
  bank?: { total: string; count: number };
  contacts?: { count: number };
  products?: { count: number };
  lastMonthRevenue?: { total: string; count: number };
  lastMonthOutstanding?: { total: string; count: number };
};

function makeDb(q: Q) {
  const reads: unknown[][] = [
    q.bank ? [q.bank] : [],
    q.contacts ? [q.contacts] : [],
    q.products ? [q.products] : [],
    q.lastMonthRevenue ? [q.lastMonthRevenue] : [],
    q.lastMonthOutstanding ? [q.lastMonthOutstanding] : [],
  ];
  let idx = 0;
  return {
    select: () => selectBuilder(reads[idx++] ?? []),
  } as unknown as Database;
}

beforeEach(() => {
  financialsMock.mockReset();
  financialsMock.mockResolvedValue(BASE_FINANCIALS as never);
});

describe("getDashboardStats — month-over-month change", () => {
  it("shows revenue & outstanding change% when both current and prior are non-zero", async () => {
    const db = makeDb({
      lastMonthRevenue: { total: "1000", count: 5 }, // current 1200 → +20%
      lastMonthOutstanding: { total: "1000", count: 4 }, // current 1100 → +10%
    });
    const stats = await getDashboardStats(db, COMPANY_ID);
    expect(stats.revenueThisMonth.changePercent).toBe(20);
    expect(stats.outstandingInvoices.changePercent).toBe(10);
  });

  it("omits revenue change when the prior month was zero", async () => {
    const db = makeDb({
      lastMonthRevenue: { total: "0", count: 0 },
    });
    const stats = await getDashboardStats(db, COMPANY_ID);
    expect(stats.revenueThisMonth.changePercent).toBeUndefined();
  });

  it("omits revenue change when the current month is zero", async () => {
    financialsMock.mockResolvedValue({
      ...BASE_FINANCIALS,
      revenueThisMonth: 0,
    } as never);
    const db = makeDb({
      lastMonthRevenue: { total: "1000", count: 5 },
    });
    const stats = await getDashboardStats(db, COMPANY_ID);
    expect(stats.revenueThisMonth.changePercent).toBeUndefined();
  });

  it("rounds the change percentage to one decimal place", async () => {
    financialsMock.mockResolvedValue({
      ...BASE_FINANCIALS,
      revenueThisMonth: 1000,
    } as never);
    const db = makeDb({
      lastMonthRevenue: { total: "900", count: 5 }, // (1000-900)/900*100 = 11.11…
    });
    const stats = await getDashboardStats(db, COMPANY_ID);
    expect(stats.revenueThisMonth.changePercent).toBe(11.1);
  });

  it("reports a negative change when revenue fell month-over-month", async () => {
    financialsMock.mockResolvedValue({
      ...BASE_FINANCIALS,
      revenueThisMonth: 800,
    } as never);
    const db = makeDb({
      lastMonthRevenue: { total: "1000", count: 5 }, // -20%
    });
    const stats = await getDashboardStats(db, COMPANY_ID);
    expect(stats.revenueThisMonth.changePercent).toBe(-20);
  });
});

describe("getDashboardStats — tile values", () => {
  it("maps the financial summary onto the currency tiles", async () => {
    const db = makeDb({});
    const stats = await getDashboardStats(db, COMPANY_ID);
    expect(stats.revenueThisYear.value).toBe(14000);
    expect(stats.overdueInvoices).toMatchObject({ value: 400, count: 2 });
    expect(stats.draftDocuments).toMatchObject({ value: 90, count: 2 });
    expect(financialsMock).toHaveBeenCalledWith(db, COMPANY_ID, undefined);
  });

  it("reads bank balance and active counts from the dashboard queries", async () => {
    const db = makeDb({
      bank: { total: "5000.50", count: 2 },
      contacts: { count: 42 },
      products: { count: 17 },
    });
    const stats = await getDashboardStats(db, COMPANY_ID);
    expect(stats.bankBalance).toMatchObject({ value: 5000.5, count: 2 });
    expect(stats.activeContacts.value).toBe(42);
    expect(stats.activeProducts.value).toBe(17);
  });

  it("falls back to zero for bank balance and counts on a new company", async () => {
    const db = makeDb({});
    const stats = await getDashboardStats(db, COMPANY_ID);
    expect(stats.bankBalance.value).toBe(0);
    expect(stats.bankBalance.count).toBe(0);
    expect(stats.activeContacts.value).toBe(0);
    expect(stats.activeProducts.value).toBe(0);
  });
});
