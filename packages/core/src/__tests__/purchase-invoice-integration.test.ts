import { describe, it, expect, vi, beforeEach } from "vitest";

// createInventoryItemsFromPurchaseInvoice bridges a confirmed purchase invoice
// to individually tracked inventory items: every line whose product has
// `serialNumberTracking: true` materialises one inventory item per unit (or a
// single bulk-lot row above MAX_INDIVIDUAL_ITEMS). This closes the double-entry
// gap where buying tracked goods increased stock quantity but created zero
// trackable items (Ground Truth #5 — one source of truth).
//
// The function is DB orchestration around real decision logic: quantity
// flooring, the tracked-product filter, the individual-vs-bulk threshold, and
// unit-cost mapping. We isolate it with a mock Database that returns queued
// read results and records every inventory insert, plus a stubbed
// getNextNumber so item numbers are deterministic.
vi.mock("../domain/number-sequences", () => ({
  getNextNumber: vi.fn(),
}));

import { createInventoryItemsFromPurchaseInvoice } from "../domain/purchase-invoice-integration";
import { getNextNumber } from "../domain/number-sequences";
import type { Database } from "@kivvi/database";

const nextNumberMock = vi.mocked(getNextNumber);

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";
const DOC_ID = "11111111-1111-4111-8111-111111111111";
const CONTACT_ID = "22222222-2222-4222-8222-222222222222";
const TRACKED_PRODUCT = "33333333-3333-4333-8333-333333333333";
const UNTRACKED_PRODUCT = "44444444-4444-4444-8444-444444444444";

type LineItem = {
  productId: string | null;
  unitPrice: string | null;
  quantity: string | null;
  description: string | null;
};

type ProductRow = { id: string; serialNumberTracking: boolean };

/**
 * A thenable query builder: chain methods return the builder, awaiting it
 * resolves to `rows`. Mirrors Drizzle's lazy awaitable builder shape for the
 * two read shapes this function uses (documentItems, then products).
 */
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

/**
 * Mock Database. `select()` returns queued read results in call order
 * (1st: line items, 2nd: products). Every inventoryItems insert is captured.
 */
function makeMockDb(items: LineItem[], products: ProductRow[]) {
  const reads = [
    // The function selects a projection of documentItems; shape mirrors it.
    items.map((i) => ({
      item: i,
      productId: i.productId,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      description: i.description,
    })),
    products,
  ];
  let readIdx = 0;
  const inserted: Record<string, unknown>[] = [];

  const db = {
    select: () => selectBuilder(reads[readIdx++] ?? []),
    insert: () => ({
      values: async (v: Record<string, unknown>) => {
        inserted.push(v);
        return undefined;
      },
    }),
  };

  return { db: db as unknown as Database, inserted };
}

const DOC = { id: DOC_ID, contactId: CONTACT_ID };

describe("createInventoryItemsFromPurchaseInvoice", () => {
  beforeEach(() => {
    nextNumberMock.mockReset();
    let n = 0;
    // Deterministic, unique item numbers: INV-00001, INV-00002, ...
    nextNumberMock.mockImplementation(async () => {
      n += 1;
      return `INV-${String(n).padStart(5, "0")}`;
    });
  });

  it("creates nothing when the document has no line items", async () => {
    const { db, inserted } = makeMockDb([], []);
    const result = await createInventoryItemsFromPurchaseInvoice(
      db,
      COMPANY_ID,
      DOC,
    );
    expect(result).toEqual({ created: 0 });
    expect(inserted).toHaveLength(0);
    // No product lookup needed when there are no items.
    expect(nextNumberMock).not.toHaveBeenCalled();
  });

  it("creates nothing when no line item references a product", async () => {
    const { db, inserted } = makeMockDb(
      [
        {
          productId: null,
          unitPrice: "10",
          quantity: "5",
          description: "Misc",
        },
      ],
      [],
    );
    const result = await createInventoryItemsFromPurchaseInvoice(
      db,
      COMPANY_ID,
      DOC,
    );
    expect(result).toEqual({ created: 0 });
    expect(inserted).toHaveLength(0);
  });

  it("creates nothing when no referenced product is serial-number tracked", async () => {
    const { db, inserted } = makeMockDb(
      [
        {
          productId: UNTRACKED_PRODUCT,
          unitPrice: "10",
          quantity: "5",
          description: "Cables",
        },
      ],
      [{ id: UNTRACKED_PRODUCT, serialNumberTracking: false }],
    );
    const result = await createInventoryItemsFromPurchaseInvoice(
      db,
      COMPANY_ID,
      DOC,
    );
    expect(result).toEqual({ created: 0 });
    expect(inserted).toHaveLength(0);
  });

  it("creates one inventory item per unit for a tracked product", async () => {
    const { db, inserted } = makeMockDb(
      [
        {
          productId: TRACKED_PRODUCT,
          unitPrice: "60.00",
          quantity: "3",
          description: "ThinkPad X230",
        },
      ],
      [{ id: TRACKED_PRODUCT, serialNumberTracking: true }],
    );
    const result = await createInventoryItemsFromPurchaseInvoice(
      db,
      COMPANY_ID,
      DOC,
    );
    expect(result).toEqual({ created: 3 });
    expect(inserted).toHaveLength(3);
    // Every item carries the intake provenance and per-unit cost.
    for (const row of inserted) {
      expect(row).toMatchObject({
        companyId: COMPANY_ID,
        productId: TRACKED_PRODUCT,
        description: "ThinkPad X230",
        condition: "untested",
        status: "intake",
        intakeDocumentId: DOC_ID,
        donorContactId: CONTACT_ID,
        estimatedValue: "60.00",
      });
    }
    // Item numbers are unique (one getNextNumber call per unit).
    const numbers = inserted.map((r) => r.itemNumber);
    expect(new Set(numbers).size).toBe(3);
  });

  it("floors fractional quantities to whole units", async () => {
    const { db, inserted } = makeMockDb(
      [
        {
          productId: TRACKED_PRODUCT,
          unitPrice: "5",
          quantity: "2.9",
          description: "Monitor",
        },
      ],
      [{ id: TRACKED_PRODUCT, serialNumberTracking: true }],
    );
    const result = await createInventoryItemsFromPurchaseInvoice(
      db,
      COMPANY_ID,
      DOC,
    );
    expect(result).toEqual({ created: 2 });
    expect(inserted).toHaveLength(2);
  });

  it("treats missing or zero quantity as at least one unit", async () => {
    const { db, inserted } = makeMockDb(
      [
        {
          productId: TRACKED_PRODUCT,
          unitPrice: "5",
          quantity: null,
          description: "Keyboard",
        },
      ],
      [{ id: TRACKED_PRODUCT, serialNumberTracking: true }],
    );
    const result = await createInventoryItemsFromPurchaseInvoice(
      db,
      COMPANY_ID,
      DOC,
    );
    expect(result).toEqual({ created: 1 });
    expect(inserted).toHaveLength(1);
  });

  it("maps a zero unit price to a null estimated value (donation)", async () => {
    const { db, inserted } = makeMockDb(
      [
        {
          productId: TRACKED_PRODUCT,
          unitPrice: "0",
          quantity: "1",
          description: "Donated laptop",
        },
      ],
      [{ id: TRACKED_PRODUCT, serialNumberTracking: true }],
    );
    await createInventoryItemsFromPurchaseInvoice(db, COMPANY_ID, DOC);
    expect(inserted[0]).toMatchObject({ estimatedValue: null });
  });

  it("collapses a quantity above the individual cap into a single bulk lot", async () => {
    const { db, inserted } = makeMockDb(
      [
        {
          productId: TRACKED_PRODUCT,
          unitPrice: "12.00",
          quantity: "250",
          description: "RAM module",
        },
      ],
      [{ id: TRACKED_PRODUCT, serialNumberTracking: true }],
    );
    const result = await createInventoryItemsFromPurchaseInvoice(
      db,
      COMPANY_ID,
      DOC,
    );
    // 250 > MAX_INDIVIDUAL_ITEMS (100) → one bulk-lot row, not 250 rows.
    expect(result).toEqual({ created: 1 });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      description: "RAM module (250 Stk.)",
      notes: "Bulk lot: 250 units",
      estimatedValue: "12.00",
    });
  });

  it("creates individual items only for tracked products in a mixed invoice", async () => {
    const { db, inserted } = makeMockDb(
      [
        {
          productId: TRACKED_PRODUCT,
          unitPrice: "60",
          quantity: "2",
          description: "Laptop",
        },
        {
          productId: UNTRACKED_PRODUCT,
          unitPrice: "3",
          quantity: "100",
          description: "Screws",
        },
      ],
      [
        { id: TRACKED_PRODUCT, serialNumberTracking: true },
        { id: UNTRACKED_PRODUCT, serialNumberTracking: false },
      ],
    );
    const result = await createInventoryItemsFromPurchaseInvoice(
      db,
      COMPANY_ID,
      DOC,
    );
    // Only the 2 tracked laptops materialise; the 100 screws stay quantity-only.
    expect(result).toEqual({ created: 2 });
    expect(inserted).toHaveLength(2);
    for (const row of inserted) {
      expect(row.productId).toBe(TRACKED_PRODUCT);
    }
  });

  it("records a null donor when the document has no contact", async () => {
    const { db, inserted } = makeMockDb(
      [
        {
          productId: TRACKED_PRODUCT,
          unitPrice: "60",
          quantity: "1",
          description: "Laptop",
        },
      ],
      [{ id: TRACKED_PRODUCT, serialNumberTracking: true }],
    );
    await createInventoryItemsFromPurchaseInvoice(db, COMPANY_ID, {
      id: DOC_ID,
      contactId: null,
    });
    expect(inserted[0]).toMatchObject({ donorContactId: null });
  });
});
