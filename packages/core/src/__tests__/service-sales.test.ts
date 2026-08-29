import { describe, it, expect, vi, beforeEach } from "vitest";

// recordServiceSale bridges a PAID revamp-it service flow into Kivvi as one
// service invoice + one payment. The real DB work lives in createDocument /
// updateDocumentStatus / recordPayment (tested elsewhere); here we isolate the
// orchestration that matters: schema validation, durable idempotency by
// (source, sourceId), service-line construction, and the send→pay sequence.
vi.mock("../domain/documents", () => ({
  getOrCreateServiceProduct: vi.fn(),
  createDocument: vi.fn(),
  updateDocumentStatus: vi.fn(),
  recordPayment: vi.fn(),
}));
vi.mock("../domain/contacts", () => ({
  resolveOrCreateContact: vi.fn(),
}));
vi.mock("../domain/idempotency", () => ({
  claimIdempotencyKey: vi.fn(),
  completeIdempotencyKey: vi.fn(),
  releaseIdempotencyKey: vi.fn(),
}));

import { recordServiceSale, serviceSaleKey } from "../domain/service-sales";
import {
  getOrCreateServiceProduct,
  createDocument,
  updateDocumentStatus,
  recordPayment,
} from "../domain/documents";
import { resolveOrCreateContact } from "../domain/contacts";
import {
  claimIdempotencyKey,
  completeIdempotencyKey,
  releaseIdempotencyKey,
} from "../domain/idempotency";
import type { Database } from "@kivvi/database";

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const CONTACT_ID = "22222222-2222-4222-8222-222222222222";

const createDocumentMock = vi.mocked(createDocument);
const updateStatusMock = vi.mocked(updateDocumentStatus);
const recordPaymentMock = vi.mocked(recordPayment);
const getProductMock = vi.mocked(getOrCreateServiceProduct);
const resolveContactMock = vi.mocked(resolveOrCreateContact);
const claimMock = vi.mocked(claimIdempotencyKey);
const completeMock = vi.mocked(completeIdempotencyKey);
const releaseMock = vi.mocked(releaseIdempotencyKey);

/** Thenable select builder resolving to `rows` — matches Drizzle's lazy shape. */
function selectBuilder(rows: unknown[]) {
  const b: Record<string, unknown> = {
    from: () => b,
    where: () => b,
    limit: () => Promise.resolve(rows),
  };
  return b;
}

/**
 * Mock Database. Each `select()` returns the next queued marker-lookup result
 * set (repeating the last), so a test can differ the up-front lookup from the
 * concurrency re-check. `transaction(cb)` runs the callback with the same
 * handle (savepoint-free).
 */
function makeDb(...markerLookups: unknown[][]): Database {
  const queue = markerLookups.length > 0 ? markerLookups : [[]];
  let call = 0;
  const db = {
    select: () => {
      const rows = queue[Math.min(call++, queue.length - 1)];
      return selectBuilder(rows);
    },
    transaction: (cb: (tx: Database) => unknown) => cb(db as unknown as Database),
  };
  return db as unknown as Database;
}

beforeEach(() => {
  vi.clearAllMocks();
  claimMock.mockResolvedValue({ outcome: "claimed" });
  completeMock.mockResolvedValue(undefined);
  releaseMock.mockResolvedValue(undefined);
  getProductMock.mockResolvedValue("prod-service-id");
  resolveContactMock.mockResolvedValue(CONTACT_ID);
  createDocumentMock.mockResolvedValue({
    id: "invoice-1",
    number: "RE-2026-00001",
    total: "86.48",
    currency: "CHF",
  } as never);
  updateStatusMock.mockResolvedValue({} as never);
  recordPaymentMock.mockResolvedValue({} as never);
});

describe("serviceSaleKey", () => {
  it("builds a stable natural key", () => {
    expect(serviceSaleKey("workshop", "reg-42")).toBe("service-sale:workshop:reg-42");
  });
});

describe("recordServiceSale", () => {
  const base = {
    source: "workshop" as const,
    sourceId: "reg-42",
    contactId: CONTACT_ID,
    description: "Löten für Einsteiger — Platz 1",
    amount: "80.00",
  };

  it("books one service invoice + one full payment routed as a service line", async () => {
    const db = makeDb([]);
    const result = await recordServiceSale(db, COMPANY_ID, USER_ID, base);

    // One service product, resolved (not a goods product)
    expect(getProductMock).toHaveBeenCalledTimes(1);
    expect(getProductMock.mock.calls[0][2]).toMatchObject({
      sku: "service-workshop",
      unitPrice: "80.00",
    });

    // One invoice, single service line at the NET unit price
    expect(createDocumentMock).toHaveBeenCalledTimes(1);
    const docInput = createDocumentMock.mock.calls[0][3];
    expect(docInput.type).toBe("invoice");
    expect(docInput.internalNotes).toBe("service-sale:workshop:reg-42");
    expect(docInput.items).toHaveLength(1);
    expect(docInput.items[0]).toMatchObject({
      productId: "prod-service-id",
      unitPrice: "80.00",
      quantity: "1",
    });

    // Sent (posts revenue journal), then paid in full for the gross total
    expect(updateStatusMock).toHaveBeenCalledWith(db, COMPANY_ID, "invoice-1", "sent");
    expect(recordPaymentMock).toHaveBeenCalledTimes(1);
    expect(recordPaymentMock.mock.calls[0][3]).toMatchObject({
      amount: "86.48",
      method: "card",
    });

    expect(result).toMatchObject({
      invoiceId: "invoice-1",
      number: "RE-2026-00001",
      status: "paid",
      replayed: false,
    });
  });

  it("is idempotent: a replayed source returns the existing invoice, no new booking", async () => {
    const db = makeDb([
      {
        id: "invoice-existing",
        number: "RE-2026-00009",
        status: "paid",
        total: "86.48",
        currency: "CHF",
      },
    ]);

    const result = await recordServiceSale(db, COMPANY_ID, USER_ID, base);

    expect(result).toMatchObject({
      invoiceId: "invoice-existing",
      number: "RE-2026-00009",
      replayed: true,
    });
    // Critically: no second invoice / payment / journal
    expect(createDocumentMock).not.toHaveBeenCalled();
    expect(recordPaymentMock).not.toHaveBeenCalled();
    expect(updateStatusMock).not.toHaveBeenCalled();
  });

  it("claims the concurrency lock and completes it on success", async () => {
    const db = makeDb([]);
    await recordServiceSale(db, COMPANY_ID, USER_ID, base);

    expect(claimMock).toHaveBeenCalledTimes(1);
    expect(claimMock.mock.calls[0][2]).toBe("service-sale-lock:workshop:reg-42");
    expect(completeMock).toHaveBeenCalledTimes(1);
    expect(releaseMock).not.toHaveBeenCalled();
  });

  it("does not double-book when a concurrent request already committed", async () => {
    claimMock.mockResolvedValue({ outcome: "in_progress" });
    // Up-front lookup empty, but the concurrency re-check finds the committed invoice.
    const db = makeDb(
      [],
      [
        {
          id: "invoice-concurrent",
          number: "RE-2026-00010",
          status: "paid",
          total: "86.48",
          currency: "CHF",
        },
      ],
    );

    const result = await recordServiceSale(db, COMPANY_ID, USER_ID, base);
    expect(result).toMatchObject({
      invoiceId: "invoice-concurrent",
      replayed: true,
    });
    expect(createDocumentMock).not.toHaveBeenCalled();
  });

  it("releases the lock if booking throws, so a retry can proceed", async () => {
    createDocumentMock.mockRejectedValue(new Error("db down"));
    const db = makeDb([]);
    await expect(recordServiceSale(db, COMPANY_ID, USER_ID, base)).rejects.toThrow(/db down/);
    expect(releaseMock).toHaveBeenCalledTimes(1);
    expect(completeMock).not.toHaveBeenCalled();
  });

  it("resolves a contact by name/email when no contactId is given", async () => {
    const db = makeDb([]);
    await recordServiceSale(db, COMPANY_ID, USER_ID, {
      source: "appointment",
      sourceId: "appt-7",
      contactName: "Anna Muster",
      contactEmail: "anna@example.ch",
      description: "Beratung",
      amount: "120.00",
    });

    expect(resolveContactMock).toHaveBeenCalledWith(
      db,
      COMPANY_ID,
      "Anna Muster",
      "anna@example.ch",
    );
    expect(createDocumentMock.mock.calls[0][3].contactId).toBe(CONTACT_ID);
    expect(getProductMock.mock.calls[0][2].sku).toBe("service-appointment");
  });

  it("rejects a sale with neither contactId nor contactName", async () => {
    const db = makeDb([]);
    await expect(
      recordServiceSale(db, COMPANY_ID, USER_ID, {
        source: "it_hilfe",
        sourceId: "x",
        description: "IT-Hilfe",
        amount: "50.00",
      }),
    ).rejects.toThrow(/contactId or contactName/i);
  });

  it("rejects a non-positive amount", async () => {
    const db = makeDb([]);
    await expect(
      recordServiceSale(db, COMPANY_ID, USER_ID, { ...base, amount: "0" }),
    ).rejects.toThrow(/greater than 0/i);
  });
});
