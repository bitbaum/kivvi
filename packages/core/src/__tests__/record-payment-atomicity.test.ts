import { describe, it, expect, vi, beforeEach } from "vitest";

// recordPayment auto-creates a journal entry for the payment. The two writes
// (payment row + journal entry) MUST be one atomic db.transaction: if the
// journal step throws, the payment must roll back so the books never hold a
// payment without its matching journal entry (Ground Truth #1 — a transaction
// either happened or it didn't).
//
// We isolate the journal step by mocking accounting-integration, then drive
// recordPayment with a mock Database that models transaction semantics:
// writes are staged inside the transaction callback and only promoted to the
// committed store if the callback resolves. A throw discards the staged writes
// — exactly what a real ROLLBACK does.
vi.mock("../domain/accounting-integration", async (importActual) => {
  const actual = await importActual<typeof import("../domain/accounting-integration")>();
  return { ...actual, createPaymentReceivedJournalEntry: vi.fn() };
});

import { recordPayment } from "../domain/documents";
import { createPaymentReceivedJournalEntry } from "../domain/accounting-integration";
import type { Database } from "@kivvi/database";

const journalMock = vi.mocked(createPaymentReceivedJournalEntry);

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";
const DOC_ID = "11111111-1111-4111-8111-111111111111";

// A payable, payment-eligible document (invoice, status "sent").
const DOC = {
  id: DOC_ID,
  companyId: COMPANY_ID,
  type: "invoice",
  status: "sent",
  total: "100.00",
};

type Committed = {
  payments: Record<string, unknown>[];
  documentUpdates: Record<string, unknown>[];
};

/**
 * A thenable query builder: every chain method returns the same builder, and
 * awaiting it (after .where(...) or .limit(...)) resolves to `rows`. This
 * matches Drizzle's lazy, awaitable builder shape closely enough for the two
 * read shapes recordPayment uses.
 */
function selectBuilder(rows: unknown[]) {
  const b: Record<string, unknown> = {
    from: () => b,
    where: () => b,
    limit: () => b,
    innerJoin: () => b,
    then: (resolve: (v: unknown[]) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  };
  return b;
}

/** Build a mock Database that records committed vs rolled-back writes. */
function makeMockDb() {
  const committed: Committed = { payments: [], documentUpdates: [] };
  // Track the transaction object handed to the insert, so we can prove the
  // journal entry runs against the SAME transaction.
  let txForInsert: unknown;

  function makeTx(staged: Committed) {
    const tx = {
      // totalPaid lookup inside the transaction → no prior payments
      select: () => selectBuilder([{ totalPaid: "0" }]),
      insert: () => ({
        values: (v: Record<string, unknown>) => ({
          returning: async () => {
            txForInsert = tx;
            const row = { id: "payment-1", ...v };
            staged.payments.push(row);
            return [row];
          },
        }),
      }),
      update: () => ({
        set: (s: Record<string, unknown>) => ({
          where: async () => {
            staged.documentUpdates.push(s);
            return undefined;
          },
        }),
      }),
    };
    return tx;
  }

  const db = {
    // outer read: load the document
    select: () => selectBuilder([DOC]),
    transaction: async (cb: (tx: unknown) => Promise<unknown>) => {
      const staged: Committed = { payments: [], documentUpdates: [] };
      const tx = makeTx(staged);
      const result = await cb(tx); // throws here ⇒ staged writes discarded
      // commit only on success
      committed.payments.push(...staged.payments);
      committed.documentUpdates.push(...staged.documentUpdates);
      return result;
    },
  };

  return {
    db: db as unknown as Database,
    committed,
    getTxForInsert: () => txForInsert,
  };
}

const PAYMENT_INPUT = { amount: "100.00", date: "2026-04-13" };

describe("recordPayment — atomicity of payment + journal entry", () => {
  beforeEach(() => {
    journalMock.mockReset();
  });

  it("commits the payment and journal entry together on success", async () => {
    journalMock.mockResolvedValue(undefined as never);
    const { db, committed, getTxForInsert } = makeMockDb();

    const payment = await recordPayment(db, COMPANY_ID, DOC_ID, PAYMENT_INPUT);

    expect(payment).toMatchObject({ id: "payment-1", amount: "100.00" });
    // Both writes were committed.
    expect(committed.payments).toHaveLength(1);
    expect(committed.documentUpdates).toHaveLength(1);
    // Full payment → status promoted to "paid".
    expect(committed.documentUpdates[0]).toMatchObject({ status: "paid" });

    // The journal entry ran inside the SAME transaction as the payment insert.
    expect(journalMock).toHaveBeenCalledTimes(1);
    expect(journalMock.mock.calls[0][0]).toBe(getTxForInsert());
  });

  it("rolls back the payment when the journal entry step throws", async () => {
    journalMock.mockRejectedValue(new Error("journal entry failed"));
    const { db, committed } = makeMockDb();

    await expect(recordPayment(db, COMPANY_ID, DOC_ID, PAYMENT_INPUT)).rejects.toThrow(
      "journal entry failed",
    );

    // Nothing committed — the staged payment + status update were discarded.
    expect(committed.payments).toHaveLength(0);
    expect(committed.documentUpdates).toHaveLength(0);
    // The journal step was reached (it is part of the transaction).
    expect(journalMock).toHaveBeenCalledTimes(1);
  });
});
