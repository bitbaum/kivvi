import { describe, it, expect, vi, beforeEach } from "vitest";

// Part 1 of DURABLE_SYNC_SPEC: outbound webhook emission now lives INSIDE the
// domain functions that own each state change — not in the Server Action layer.
// This guarantees every caller (dashboard action, /api/v1 route, AI tool) emits
// the same event. These tests pin that behaviour: each domain function must call
// dispatchWebhookEvent exactly once, with the right event name, AFTER its write.
//
// We partial-mock ../domain/webhooks so no real HTTP/DB happens, and drive each
// function with a minimal mock Database modelled on record-payment-atomicity.test.ts.
vi.mock("../domain/webhooks", async (importActual) => {
  const actual = await importActual<typeof import("../domain/webhooks")>();
  return {
    ...actual,
    dispatchWebhookEvent: vi.fn(() => Promise.resolve()),
  };
});

// recordPayment auto-creates a journal entry inside its transaction; stub it out
// so the payment path resolves without a real accounting DB.
vi.mock("../domain/accounting-integration", async (importActual) => {
  const actual = await importActual<typeof import("../domain/accounting-integration")>();
  return {
    ...actual,
    createPaymentReceivedJournalEntry: vi.fn(() => Promise.resolve()),
  };
});

import { dispatchWebhookEvent } from "../domain/webhooks";
import { createDocument, updateDocumentStatus, recordPayment } from "../domain/documents";
import {
  createInventoryItem,
  updateInventoryItem,
  updateItemStatus,
} from "../domain/inventory-items";
import type { Database } from "@kivvi/database";

const dispatchMock = vi.mocked(dispatchWebhookEvent);

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";
const USER_ID = "660e8400-e29b-41d4-a716-446655440000";

/**
 * A thenable query builder: chain methods return the same builder, awaiting it
 * resolves to `rows`. Matches Drizzle's lazy awaitable builder closely enough.
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

/** getNextNumber issues `db.update(numberSequences)...returning(cols)` — feed it a row. */
function sequenceUpdate() {
  return {
    set: () => ({
      where: () => ({
        returning: async () => [{ usedNumber: 1, prefix: "XX", format: "{prefix}-{number:5}" }],
      }),
    }),
  };
}

beforeEach(() => {
  dispatchMock.mockReset();
  dispatchMock.mockImplementation(() => Promise.resolve());
});

// ============================================================================
// documents.ts
// ============================================================================

describe("createDocument emits document.created", () => {
  const DOC = {
    id: "doc-1",
    number: "RE-2026-00001",
    type: "invoice",
    status: "draft",
    contactId: null,
    total: "108.10",
  };

  function makeDb() {
    const tx = {
      update: () => sequenceUpdate(), // getNextNumber
      insert: () => ({
        values: () => ({
          // documents insert reads .returning(); documentItems insert is awaited
          returning: async () => [DOC],
          then: (r: (v: unknown) => unknown) => Promise.resolve(undefined).then(r),
        }),
      }),
      select: () => selectBuilder([]),
    };
    return {
      transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb(tx),
    } as unknown as Database;
  }

  // createDocument re-parses via Zod internally, so a minimal shape is fine;
  // cast to the parsed param type to satisfy the compiler.
  const INPUT = {
    type: "invoice" as const,
    items: [
      {
        position: 0,
        description: "Consulting",
        quantity: "1",
        unitPrice: "100.00",
        discount: "0",
        vatRate: "8.1",
      },
    ],
  } as unknown as Parameters<typeof createDocument>[3];

  it("dispatches document.created once after the transaction commits", async () => {
    const db = makeDb();
    const doc = await createDocument(db, COMPANY_ID, USER_ID, INPUT);

    expect(doc).toMatchObject({ id: "doc-1" });
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    const [dbArg, companyArg, event, payload] = dispatchMock.mock.calls[0];
    expect(dbArg).toBe(db);
    expect(companyArg).toBe(COMPANY_ID);
    expect(event).toBe("document.created");
    expect(payload).toMatchObject({ id: "doc-1", type: "invoice" });
  });

  it("still creates the document when dispatch rejects (best-effort)", async () => {
    dispatchMock.mockImplementation(() => {
      const p = Promise.reject(new Error("webhook boom"));
      p.catch(() => {}); // fire-and-forget: rejection must not surface
      return p;
    });
    const db = makeDb();
    const doc = await createDocument(db, COMPANY_ID, USER_ID, INPUT);
    expect(doc).toMatchObject({ id: "doc-1" });
    expect(dispatchMock).toHaveBeenCalledTimes(1);
  });
});

describe("updateDocumentStatus emits document.status_changed", () => {
  // A quote draft→sent transition triggers no journal/stock side-effects.
  const QUOTE = {
    id: "q1",
    type: "quote",
    status: "draft",
    number: "AN-2026-00001",
    total: "0",
    subtotal: "0",
    vatAmount: "0",
    currency: "CHF",
    contactId: null,
    issueDate: new Date("2026-04-01"),
  };
  const UPDATED = { ...QUOTE, status: "sent" };

  function makeDb() {
    const tx = {
      update: () => ({
        set: () => ({ where: () => ({ returning: async () => [UPDATED] }) }),
      }),
      select: () => selectBuilder([]),
      insert: () => ({
        values: () => ({
          then: (r: (v: unknown) => unknown) => Promise.resolve(undefined).then(r),
          returning: async () => [],
        }),
      }),
    };
    return {
      select: () => selectBuilder([QUOTE]), // outer existing-document lookup
      transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb(tx),
    } as unknown as Database;
  }

  it("dispatches document.status_changed once after commit", async () => {
    const db = makeDb();
    const updated = await updateDocumentStatus(db, COMPANY_ID, "q1", "sent");

    expect(updated).toMatchObject({ id: "q1", status: "sent" });
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    const [, , event, payload] = dispatchMock.mock.calls[0];
    expect(event).toBe("document.status_changed");
    expect(payload).toMatchObject({ id: "q1", status: "sent" });
  });
});

describe("recordPayment emits payment.received", () => {
  const DOC = {
    id: "inv-1",
    companyId: COMPANY_ID,
    type: "invoice",
    status: "sent",
    total: "100.00",
  };

  function makeDb() {
    const tx = {
      select: () => selectBuilder([{ totalPaid: "0" }]),
      insert: () => ({
        values: (v: Record<string, unknown>) => ({
          returning: async () => [{ id: "payment-1", ...v }],
        }),
      }),
      update: () => ({ set: () => ({ where: async () => undefined }) }),
    };
    return {
      select: () => selectBuilder([DOC]),
      transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb(tx),
    } as unknown as Database;
  }

  it("dispatches payment.received once after commit", async () => {
    const db = makeDb();
    const payment = await recordPayment(db, COMPANY_ID, "inv-1", {
      amount: "100.00",
      date: "2026-04-13",
    });

    expect(payment).toMatchObject({ id: "payment-1" });
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    const [, , event, payload] = dispatchMock.mock.calls[0];
    expect(event).toBe("payment.received");
    expect(payload).toMatchObject({
      paymentId: "payment-1",
      documentId: "inv-1",
      amount: "100.00",
      method: "bank_transfer",
    });
  });
});

// ============================================================================
// inventory-items.ts
// ============================================================================

describe("createInventoryItem emits inventory_item.created", () => {
  const ITEM = {
    id: "item-1",
    itemNumber: "INV-00001",
    description: "ThinkPad",
    condition: "untested",
    status: "intake",
    warehouseId: null,
    askingPrice: null,
  };

  function makeDb() {
    return {
      update: () => sequenceUpdate(), // getNextNumber
      insert: () => ({ values: () => ({ returning: async () => [ITEM] }) }),
    } as unknown as Database;
  }

  it("dispatches inventory_item.created once after the write", async () => {
    const db = makeDb();
    const item = await createInventoryItem(db, COMPANY_ID, {
      description: "ThinkPad",
      condition: "untested",
    });

    expect(item).toMatchObject({ id: "item-1" });
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    const [, , event, payload] = dispatchMock.mock.calls[0];
    expect(event).toBe("inventory_item.created");
    expect(payload).toMatchObject({ id: "item-1", itemNumber: "INV-00001" });
  });

  it("still creates the item when dispatch rejects (best-effort)", async () => {
    dispatchMock.mockImplementation(() => {
      const p = Promise.reject(new Error("webhook boom"));
      p.catch(() => {});
      return p;
    });
    const db = makeDb();
    const item = await createInventoryItem(db, COMPANY_ID, {
      description: "ThinkPad",
      condition: "untested",
    });
    expect(item).toMatchObject({ id: "item-1" });
    expect(dispatchMock).toHaveBeenCalledTimes(1);
  });
});

describe("updateInventoryItem emits inventory_item.updated", () => {
  const UPDATED = {
    id: "item-1",
    itemNumber: "INV-00001",
    description: "ThinkPad X1",
    condition: "good",
    status: "testing",
    warehouseId: null,
    askingPrice: "250.00",
  };

  function makeDb() {
    return {
      update: () => ({
        set: () => ({ where: () => ({ returning: async () => [UPDATED] }) }),
      }),
    } as unknown as Database;
  }

  it("dispatches inventory_item.updated once after the write", async () => {
    const db = makeDb();
    const item = await updateInventoryItem(db, COMPANY_ID, "item-1", {
      askingPrice: "250.00",
    });

    expect(item).toMatchObject({ id: "item-1", askingPrice: "250.00" });
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    const [, , event, payload] = dispatchMock.mock.calls[0];
    expect(event).toBe("inventory_item.updated");
    expect(payload).toMatchObject({ id: "item-1" });
  });
});

describe("updateItemStatus emits inventory_item.status_changed", () => {
  // intake → testing is a gate-free valid transition.
  const CURRENT = {
    id: "item-1",
    itemNumber: "INV-00001",
    status: "intake",
    condition: "good",
    askingPrice: "10.00",
    category: null,
    checklistData: null,
  };
  const UPDATED = { ...CURRENT, status: "testing" };

  function makeDb() {
    return {
      select: () => selectBuilder([CURRENT]),
      update: () => ({
        set: () => ({ where: () => ({ returning: async () => [UPDATED] }) }),
      }),
    } as unknown as Database;
  }

  it("dispatches inventory_item.status_changed once after the write", async () => {
    const db = makeDb();
    const item = await updateItemStatus(db, COMPANY_ID, "item-1", "testing", USER_ID);

    expect(item).toMatchObject({ id: "item-1", status: "testing" });
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    const [, , event, payload] = dispatchMock.mock.calls[0];
    expect(event).toBe("inventory_item.status_changed");
    expect(payload).toMatchObject({ id: "item-1", status: "testing" });
  });
});
