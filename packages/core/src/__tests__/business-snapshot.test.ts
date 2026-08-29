import { describe, it, expect, vi, beforeEach } from "vitest";

// fetchBusinessSnapshot assembles the metrics injected into the AI system
// prompt. Its non-trivial logic: a contact of type "both" counts as BOTH a
// customer AND a vendor; products vs services are split by type; bank balance /
// currency fall back to "0" / "CHF" when null. Wrong numbers here silently feed
// the AI bad context. We isolate it with a mock Database that returns the four
// aggregate queries in call order, and stub getFinancialSummary (the financial
// SSOT, tested separately).
vi.mock("../domain/documents", () => ({
  getFinancialSummary: vi.fn(),
}));

import { fetchBusinessSnapshot } from "../domain/business-snapshot";
import { getFinancialSummary } from "../domain/documents";

const financialsMock = vi.mocked(getFinancialSummary);

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";

const FINANCIALS = {
  revenueThisMonth: 1000,
  revenueThisMonthCount: 4,
  revenueThisYear: 12000,
  outstandingTotal: 500,
  outstandingCount: 2,
  overdueTotal: 200,
  overdueCount: 1,
  draftsTotal: 50,
  draftsCount: 1,
};

function selectBuilder(rows: unknown[]) {
  const b: Record<string, unknown> = {
    from: () => b,
    where: () => b,
    groupBy: () => b,
    leftJoin: () => b,
    orderBy: () => b,
    limit: () => b,
    then: (resolve: (v: unknown[]) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  };
  return b;
}

/**
 * Mock Database. The four db.select() calls inside the Promise.all resolve, in
 * order, to: contact counts, product counts, recent documents, bank balances.
 * (getFinancialSummary is mocked, so it issues no db.select.)
 */
function makeDb(reads: unknown[][]) {
  let idx = 0;
  return {
    select: () => selectBuilder(reads[idx++] ?? []),
  } as unknown as Parameters<typeof fetchBusinessSnapshot>[0];
}

beforeEach(() => {
  financialsMock.mockReset();
  financialsMock.mockResolvedValue(FINANCIALS as never);
});

describe("fetchBusinessSnapshot", () => {
  it("counts a 'both' contact as both a customer and a vendor", async () => {
    const db = makeDb([
      [
        { type: "customer", count: 3 },
        { type: "vendor", count: 2 },
        { type: "both", count: 1 },
      ],
      [{ type: "product", count: 10 }],
      [],
      [],
    ]);
    const snap = await fetchBusinessSnapshot(db, COMPANY_ID);
    // customers = customer(3) + both(1); vendors = vendor(2) + both(1)
    expect(snap.customers).toBe(4);
    expect(snap.vendors).toBe(3);
  });

  it("splits product and service counts by type", async () => {
    const db = makeDb([
      [{ type: "customer", count: 1 }],
      [
        { type: "product", count: 7 },
        { type: "service", count: 4 },
      ],
      [],
      [],
    ]);
    const snap = await fetchBusinessSnapshot(db, COMPANY_ID);
    expect(snap.productCount).toBe(7);
    expect(snap.serviceCount).toBe(4);
  });

  it("spreads the financial summary through unchanged", async () => {
    const db = makeDb([[], [], [], []]);
    const snap = await fetchBusinessSnapshot(db, COMPANY_ID);
    expect(snap).toMatchObject(FINANCIALS);
    expect(financialsMock).toHaveBeenCalledWith(db, COMPANY_ID);
  });

  it("maps recent documents to the snapshot shape", async () => {
    const due = new Date("2026-07-01T00:00:00Z");
    const db = makeDb([
      [],
      [],
      [
        {
          number: "RE-2026-00001",
          type: "invoice",
          status: "sent",
          total: "100.00",
          currency: "CHF",
          dueDate: due,
          contactName: "ACME AG",
        },
      ],
      [],
    ]);
    const snap = await fetchBusinessSnapshot(db, COMPANY_ID);
    expect(snap.recentDocuments).toEqual([
      {
        number: "RE-2026-00001",
        type: "invoice",
        status: "sent",
        total: "100.00",
        currency: "CHF",
        dueDate: due,
        contactName: "ACME AG",
      },
    ]);
  });

  it("falls back to '0' balance and 'CHF' currency for null bank fields", async () => {
    const db = makeDb([
      [],
      [],
      [],
      [
        { name: "PostFinance", iban: "CH...", balance: null, currency: null },
        { name: "UBS", iban: null, balance: "250.00", currency: "EUR" },
      ],
    ]);
    const snap = await fetchBusinessSnapshot(db, COMPANY_ID);
    expect(snap.bankBalances[0]).toEqual({
      name: "PostFinance",
      iban: "CH...",
      balance: "0",
      currency: "CHF",
    });
    expect(snap.bankBalances[1]).toMatchObject({
      balance: "250.00",
      currency: "EUR",
    });
  });

  it("returns zeros and empty arrays for a brand-new company", async () => {
    const db = makeDb([[], [], [], []]);
    const snap = await fetchBusinessSnapshot(db, COMPANY_ID);
    expect(snap.customers).toBe(0);
    expect(snap.vendors).toBe(0);
    expect(snap.productCount).toBe(0);
    expect(snap.serviceCount).toBe(0);
    expect(snap.recentDocuments).toEqual([]);
    expect(snap.bankBalances).toEqual([]);
  });
});
