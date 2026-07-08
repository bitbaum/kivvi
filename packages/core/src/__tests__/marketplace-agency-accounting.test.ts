import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import type { Database } from "@kivvi/database";
import {
  createMarketplaceAgencySaleJournalEntry,
  createMarketplacePayoutJournalEntry,
  recordMarketplaceAgencySaleSchema,
} from "../domain/accounting-integration";
import { validateJournalBalance } from "../domain/accounting";

/**
 * Marketplace agency (P2P) accounting.
 *
 * A facilitated sale is NOT the tenant's own revenue. Kivvi books only the
 * platform economics:
 *   Dr 1020 Bank        gross
 *   Cr 2140 Liability   sellerPayout (gross − commission − VAT)
 *   Cr 3200 Revenue     commission
 *   Cr 2200 MWST        commission VAT
 *
 * These tests assert EXACT amounts (Ground Truth #2 — money is not approximate)
 * and that every entry balances.
 */

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";

const ACCOUNT_IDS: Record<string, string> = {
  "1020": "id-1020",
  "2140": "id-2140",
  "2200": "id-2200",
  "3200": "id-3200",
};
const ID_TO_CODE = new Map(
  Object.entries(ACCOUNT_IDS).map(([code, id]) => [id, code]),
);

interface CapturedLine {
  accountCode: string;
  debit: string | null;
  credit: string | null;
}

function thenable(rows: unknown[]) {
  const b: Record<string, unknown> = {
    from: () => b,
    where: () => b,
    innerJoin: () => b,
    then: (
      resolve: (v: unknown[]) => unknown,
      reject?: (e: unknown) => unknown,
    ) => Promise.resolve(rows).then(resolve, reject),
  };
  return b;
}

function makeMockDb() {
  const accountRows = Object.entries(ACCOUNT_IDS).map(([code, id]) => ({
    id,
    code,
  }));
  const captured: {
    entries: Record<string, unknown>[];
    lines: CapturedLine[];
  } = { entries: [], lines: [] };

  const tx = {
    insert: () => ({
      values: (v: Record<string, unknown> | Record<string, unknown>[]) => ({
        returning: async () => {
          const entry = { id: "entry-1", ...(v as Record<string, unknown>) };
          captured.entries.push(entry);
          return [entry];
        },
        then: (
          resolve: (v: unknown) => unknown,
          reject?: (e: unknown) => unknown,
        ) => {
          const rows = Array.isArray(v) ? v : [v];
          for (const row of rows) {
            captured.lines.push({
              accountCode: ID_TO_CODE.get(row.accountId as string) ?? "?",
              debit: (row.debit as string) ?? null,
              credit: (row.credit as string) ?? null,
            });
          }
          return Promise.resolve(undefined).then(resolve, reject);
        },
      }),
    }),
  };

  const db = {
    select: () => thenable(accountRows),
    transaction: async (cb: (t: unknown) => Promise<unknown>) => cb(tx),
  };

  return { db: db as unknown as Database, captured };
}

describe("createMarketplaceAgencySaleJournalEntry", () => {
  it("splits a fee-bearing sale into pass-through + commission + VAT and balances", async () => {
    const { db, captured } = makeMockDb();

    // Buyer paid 108.10 gross: 100.00 to seller, 8.10 commission, no VAT here.
    await createMarketplaceAgencySaleJournalEntry(db, COMPANY_ID, {
      orderReference: "MO-2026-00001",
      date: new Date("2026-04-13"),
      grossAmount: "108.10",
      commissionAmount: "8.10",
      commissionVatAmount: "0",
      sourceId: "order-1",
      description: undefined,
    });

    expect(captured.entries[0]).toMatchObject({
      sourceType: "marketplace_agency_sale",
      sourceId: "order-1",
      reference: "MO-2026-00001",
    });

    const bank = captured.lines.find((l) => l.accountCode === "1020");
    const liability = captured.lines.find((l) => l.accountCode === "2140");
    const revenue = captured.lines.find((l) => l.accountCode === "3200");
    expect(bank).toMatchObject({ debit: "108.10" });
    expect(liability).toMatchObject({ credit: "100.00" });
    expect(revenue).toMatchObject({ credit: "8.10" });
    expect(validateJournalBalance(captured.lines).valid).toBe(true);
  });

  it("books commission VAT to 2200 on the fee only, never on the gross", async () => {
    const { db, captured } = makeMockDb();

    // Fee 10.00 + 8.1% VAT = 0.81. Gross 110.81 → seller 100.00.
    await createMarketplaceAgencySaleJournalEntry(db, COMPANY_ID, {
      orderReference: "MO-2026-00002",
      date: new Date("2026-04-13"),
      grossAmount: "110.81",
      commissionAmount: "10.00",
      commissionVatAmount: "0.81",
      sourceId: "order-2",
    });

    const bank = captured.lines.find((l) => l.accountCode === "1020");
    const liability = captured.lines.find((l) => l.accountCode === "2140");
    const revenue = captured.lines.find((l) => l.accountCode === "3200");
    const vat = captured.lines.find((l) => l.accountCode === "2200");
    expect(bank).toMatchObject({ debit: "110.81" });
    expect(liability).toMatchObject({ credit: "100.00" });
    expect(revenue).toMatchObject({ credit: "10.00" });
    expect(vat).toMatchObject({ credit: "0.81" });
    expect(validateJournalBalance(captured.lines).valid).toBe(true);
  });

  it("collapses to pure pass-through at 0% commission (Dr 1020 / Cr 2140)", async () => {
    const { db, captured } = makeMockDb();

    await createMarketplaceAgencySaleJournalEntry(db, COMPANY_ID, {
      orderReference: "MO-2026-00003",
      date: new Date("2026-04-13"),
      grossAmount: "350.00",
      commissionAmount: "0",
      commissionVatAmount: "0",
      sourceId: "order-3",
    });

    expect(captured.lines).toHaveLength(2);
    const bank = captured.lines.find((l) => l.accountCode === "1020");
    const liability = captured.lines.find((l) => l.accountCode === "2140");
    expect(bank).toMatchObject({ debit: "350.00" });
    expect(liability).toMatchObject({ credit: "350.00" });
    expect(validateJournalBalance(captured.lines).valid).toBe(true);
  });
});

describe("createMarketplacePayoutJournalEntry", () => {
  it("posts Dr 2140 / Cr 1020 for the exact amount and balances", async () => {
    const { db, captured } = makeMockDb();

    await createMarketplacePayoutJournalEntry(db, COMPANY_ID, {
      reference: "PAYOUT-MO-2026-00001",
      date: new Date("2026-04-30"),
      amount: "100.00",
    });

    expect(captured.entries[0]).toMatchObject({
      sourceType: "marketplace_payout",
    });
    const debit = captured.lines.find((l) => l.debit);
    const credit = captured.lines.find((l) => l.credit);
    expect(debit).toMatchObject({ accountCode: "2140", debit: "100.00" });
    expect(credit).toMatchObject({ accountCode: "1020", credit: "100.00" });
    expect(validateJournalBalance(captured.lines).valid).toBe(true);
  });
});

describe("recordMarketplaceAgencySaleSchema", () => {
  it("rejects when commission + VAT exceed the gross", () => {
    const result = recordMarketplaceAgencySaleSchema.safeParse({
      orderReference: "MO-X",
      date: "2026-04-13",
      grossAmount: "10.00",
      commissionAmount: "9.00",
      commissionVatAmount: "5.00",
    });
    expect(result.success).toBe(false);
  });

  it("defaults commission and VAT to 0 (non-profit 0% path)", () => {
    const result = recordMarketplaceAgencySaleSchema.safeParse({
      orderReference: "MO-Y",
      date: "2026-04-13",
      grossAmount: "50.00",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.commissionAmount).toBe("0");
      expect(result.data.commissionVatAmount).toBe("0");
      // sellerPayout would be the full gross.
      expect(
        new Decimal(result.data.grossAmount)
          .minus(result.data.commissionAmount)
          .minus(result.data.commissionVatAmount)
          .toFixed(2),
      ).toBe("50.00");
    }
  });
});
