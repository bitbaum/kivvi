import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import type { Database } from "@kivvi/database";
import {
  createConsignmentSettlementJournalEntry,
  createConsignorPayoutJournalEntry,
} from "../domain/accounting-integration";
import { validateJournalBalance } from "../domain/accounting";

/**
 * Consignment settlement accounting (principal model).
 *
 * These tests exercise the real entry-builder functions against a mock
 * Database that models createAutoJournalEntry's shape:
 *   1. resolve account codes → ids (db.select)
 *   2. insert the journal entry (tx.insert(...).values(...).returning())
 *   3. insert the journal lines (await tx.insert(...).values(rows))
 *
 * We capture the posted entry + lines so we can assert the EXACT debit/credit
 * amounts and account codes (Ground Truth #2 — money is not approximate).
 */

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";
const SALE_DOC_ID = "11111111-1111-4111-8111-111111111111";

// Account code ⇄ id fixtures for every account these entries can touch.
const ACCOUNT_IDS: Record<string, string> = {
  "4200": "id-4200",
  "2140": "id-2140",
  "1020": "id-1020",
};
const ID_TO_CODE = new Map(Object.entries(ACCOUNT_IDS).map(([code, id]) => [id, code]));

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
    limit: () => b,
    for: () => b,
    then: (resolve: (v: unknown[]) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
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
    // Immutable posting (A1) reads fiscal periods + the ledger head and writes
    // ledger_heads / audit_log. The mock returns [] for reads (open period, no
    // head → seq 1 / GENESIS) and no-ops those writes.
    select: () => thenable([]),
    update: () => ({ set: () => ({ where: async () => undefined }) }),
    insert: () => ({
      values: (v: Record<string, unknown> | Record<string, unknown>[]) => ({
        // journalEntries insert path
        returning: async () => {
          const entry = { id: "entry-1", ...(v as Record<string, unknown>) };
          captured.entries.push(entry);
          return [entry];
        },
        // ledger_heads upsert path
        onConflictDoNothing: async () => undefined,
        // journalLines insert path (awaited directly)
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
          const rows = Array.isArray(v) ? v : [v];
          for (const row of rows) {
            // Only capture real journal lines (they carry accountId); skip the
            // ledger-head / audit-log rows introduced by immutable posting.
            if (!row.accountId) continue;
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

// ============================================================================
// Consignment settlement: Dr 4200 / Cr 2140
// ============================================================================

describe("createConsignmentSettlementJournalEntry", () => {
  it("posts Dr 4200 / Cr 2140 for the exact consignor share and balances", async () => {
    const { db, captured } = makeMockDb();

    // Sold price net 100.00, consignment rate 70.00% → consignor share 70.00.
    const consignorShare = new Decimal("100.00").times("70.00").div(100).toFixed(2);
    expect(consignorShare).toBe("70.00");

    const entry = await createConsignmentSettlementJournalEntry(db, COMPANY_ID, {
      saleDocId: SALE_DOC_ID,
      reference: "RE-2026-00001",
      date: new Date("2026-04-13"),
      consignorShare,
      itemNumbers: ["IT-00001"],
    });

    expect(entry).toBeDefined();
    expect(captured.entries).toHaveLength(1);
    expect(captured.entries[0]).toMatchObject({
      sourceType: "consignment_settlement",
      sourceId: SALE_DOC_ID,
      reference: "RE-2026-00001",
    });

    expect(captured.lines).toHaveLength(2);
    const debitLine = captured.lines.find((l) => l.debit);
    const creditLine = captured.lines.find((l) => l.credit);
    expect(debitLine).toMatchObject({ accountCode: "4200", debit: "70.00" });
    expect(creditLine).toMatchObject({ accountCode: "2140", credit: "70.00" });

    expect(validateJournalBalance(captured.lines).valid).toBe(true);
  });

  it("creates NO entry when consignor share is 0 (non-consigned sale)", async () => {
    const { db, captured } = makeMockDb();

    const entry = await createConsignmentSettlementJournalEntry(db, COMPANY_ID, {
      saleDocId: SALE_DOC_ID,
      reference: "RE-2026-00002",
      date: new Date("2026-04-13"),
      consignorShare: "0.00",
      itemNumbers: [],
    });

    expect(entry).toBeUndefined();
    expect(captured.entries).toHaveLength(0);
    expect(captured.lines).toHaveLength(0);
  });

  it("creates NO entry for a negative share (defensive)", async () => {
    const { db, captured } = makeMockDb();
    const entry = await createConsignmentSettlementJournalEntry(db, COMPANY_ID, {
      saleDocId: SALE_DOC_ID,
      reference: "RE-2026-00003",
      date: new Date("2026-04-13"),
      consignorShare: "-5.00",
      itemNumbers: [],
    });
    expect(entry).toBeUndefined();
    expect(captured.entries).toHaveLength(0);
  });

  it("posts the correctly rounded share for an odd rate (99.95 × 33.33%)", async () => {
    const { db, captured } = makeMockDb();

    // net 99.95 × 33.33% = 33.3133... → rounds to 33.31 (Swiss 2dp per line).
    const share = new Decimal("99.95").times("33.33").div(100).toDecimalPlaces(2).toFixed(2);
    expect(share).toBe("33.31");

    await createConsignmentSettlementJournalEntry(db, COMPANY_ID, {
      saleDocId: SALE_DOC_ID,
      reference: "RE-2026-00004",
      date: new Date("2026-04-13"),
      consignorShare: share,
      itemNumbers: ["IT-00007"],
    });

    const debitLine = captured.lines.find((l) => l.debit);
    const creditLine = captured.lines.find((l) => l.credit);
    expect(debitLine).toMatchObject({ accountCode: "4200", debit: "33.31" });
    expect(creditLine).toMatchObject({ accountCode: "2140", credit: "33.31" });
    expect(validateJournalBalance(captured.lines).valid).toBe(true);
  });
});

// ============================================================================
// Consignor payout: Dr 2140 / Cr 1020
// ============================================================================

describe("createConsignorPayoutJournalEntry", () => {
  it("posts Dr 2140 / Cr 1020 for the exact amount and balances", async () => {
    const { db, captured } = makeMockDb();

    const entry = await createConsignorPayoutJournalEntry(db, COMPANY_ID, {
      reference: "PAYOUT-2026-04",
      date: new Date("2026-04-30"),
      amount: "70.00",
      description: "April consignor payout",
    });

    expect(entry).toBeDefined();
    expect(captured.entries[0]).toMatchObject({
      sourceType: "consignor_payout",
      reference: "PAYOUT-2026-04",
    });

    expect(captured.lines).toHaveLength(2);
    const debitLine = captured.lines.find((l) => l.debit);
    const creditLine = captured.lines.find((l) => l.credit);
    expect(debitLine).toMatchObject({ accountCode: "2140", debit: "70.00" });
    expect(creditLine).toMatchObject({ accountCode: "1020", credit: "70.00" });

    expect(validateJournalBalance(captured.lines).valid).toBe(true);
  });
});
