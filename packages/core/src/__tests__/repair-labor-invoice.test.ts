import { describe, it, expect } from "vitest";
import {
  companies,
  contacts,
  documentItems,
  documents,
  inventoryItems,
  numberSequences,
  products,
} from "@kivvi/database";
import type { Database } from "@kivvi/database";
import { createRepairLaborInvoice } from "../domain/documents";

// createRepairLaborInvoice bills tracked repair hours as a *service* invoice
// line. It must NOT reference the inventory item on the line, so billing labor
// never marks the repaired device as sold (Ground Truth #5 — one source of
// truth: the item's lifecycle is decided by its sale, not by a labor invoice).
// It reuses a per-company "repair-labor" service product (creating it once),
// falls back to the item's tracked hours when none are passed, and refuses to
// bill when there are no hours.
//
// These drive it against a mock Database that disambiguates reads/writes by
// Drizzle table identity and models createDocument's inner transaction.

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";
const USER_ID = "550e8400-e29b-41d4-a716-446655440009";
const ITEM_ID = "11111111-1111-4111-8111-111111111111";
const CONTACT_ID = "22222222-2222-4222-8222-222222222222";
const EXISTING_PRODUCT_ID = "33333333-3333-4333-8333-333333333333";
const NEW_PRODUCT_ID = "44444444-4444-4444-8444-444444444444";
const DOC_ID = "55555555-5555-4555-8555-555555555555";

interface Captured {
  productInsert?: Record<string, unknown>;
  documentInsert?: Record<string, unknown>;
  documentItemsInsert?: Record<string, unknown>[];
  updates: { table: unknown; set: Record<string, unknown> }[];
  ranTransaction: boolean;
}

function selectBuilder(getRows: (table: unknown) => unknown[]) {
  const b: Record<string, unknown> = {
    _table: undefined,
    from(table: unknown) {
      b._table = table;
      return b;
    },
    where: () => b,
    limit: () => b,
    leftJoin: () => b,
    innerJoin: () => b,
    then: (resolve: (v: unknown[]) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(getRows(b._table)).then(resolve, reject),
  };
  return b;
}

function makeDb(opts: {
  item?: {
    id: string;
    itemNumber: string;
    description: string;
    repairHours: string | null;
  } | null;
  existingProduct?: { id: string } | null;
  contactTerms?: { paymentTermsDays: number } | null;
  companySettings?: Record<string, unknown> | null;
}) {
  const captured: Captured = { updates: [], ranTransaction: false };

  function getRows(table: unknown): unknown[] {
    if (table === inventoryItems) return opts.item ? [opts.item] : [];
    if (table === products) return opts.existingProduct ? [opts.existingProduct] : [];
    if (table === contacts) return opts.contactTerms ? [opts.contactTerms] : [];
    if (table === companies)
      return opts.companySettings !== undefined
        ? [{ settings: opts.companySettings }]
        : [{ settings: {} }];
    return [];
  }

  function makeInsert(table: unknown) {
    return {
      values: (v: Record<string, unknown> | Record<string, unknown>[]) => {
        if (table === products) {
          captured.productInsert = v as Record<string, unknown>;
          return { returning: async () => [{ id: NEW_PRODUCT_ID }] };
        }
        if (table === documents) {
          captured.documentInsert = v as Record<string, unknown>;
          const doc = {
            id: DOC_ID,
            number: "RE-2026-00001",
            status: "draft",
            type: (v as Record<string, unknown>).type,
            contactId: (v as Record<string, unknown>).contactId,
            total: (v as Record<string, unknown>).total,
            currency: (v as Record<string, unknown>).currency,
          };
          return { returning: async () => [doc] };
        }
        if (table === documentItems) {
          captured.documentItemsInsert = v as Record<string, unknown>[];
          return Promise.resolve(undefined);
        }
        if (table === numberSequences) {
          return { onConflictDoNothing: async () => undefined };
        }
        return { returning: async () => [] };
      },
    };
  }

  function makeUpdate(table: unknown) {
    return {
      set: (s: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            captured.updates.push({ table, set: s });
            if (table === numberSequences) {
              return [
                {
                  usedNumber: 1,
                  prefix: "RE",
                  format: "{prefix}-{year}-{number:5}",
                },
              ];
            }
            return [];
          },
        }),
      }),
    };
  }

  const handle = {
    select: () => selectBuilder(getRows),
    insert: makeInsert,
    update: makeUpdate,
  };

  const db = {
    ...handle,
    transaction: async (cb: (tx: unknown) => Promise<unknown>) => {
      captured.ranTransaction = true;
      return cb(handle);
    },
  };

  return { db: db as unknown as Database, captured };
}

const ITEM = {
  id: ITEM_ID,
  itemNumber: "IT-00001",
  description: "ThinkPad T480",
  repairHours: "3.50",
};

describe("createRepairLaborInvoice", () => {
  it("creates a draft invoice from tracked hours using a service product line", async () => {
    const { db, captured } = makeDb({ item: ITEM, existingProduct: null });

    const doc = await createRepairLaborInvoice(db, COMPANY_ID, USER_ID, {
      itemId: ITEM_ID,
      contactId: CONTACT_ID,
      hourlyRate: "95.00",
    });

    expect(doc).toMatchObject({ id: DOC_ID, type: "invoice", status: "draft" });
    expect(captured.ranTransaction).toBe(true);

    // A service product was created (none existed) and marked type=service.
    expect(captured.productInsert).toMatchObject({
      sku: "repair-labor",
      type: "service",
    });

    // The single line bills the tracked 3.5h at CHF 95 and points at the
    // service product — NOT the inventory item.
    const items = captured.documentItemsInsert!;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      productId: NEW_PRODUCT_ID,
      quantity: "3.50",
      unitPrice: "95.00",
      total: "332.50",
    });
    expect(items[0].inventoryItemId).toBeNull();
  });

  it("never marks the repaired item as sold (no inventoryItems update)", async () => {
    const { db, captured } = makeDb({ item: ITEM });
    await createRepairLaborInvoice(db, COMPANY_ID, USER_ID, {
      itemId: ITEM_ID,
      contactId: CONTACT_ID,
      hourlyRate: "95.00",
    });
    // The only update is the number-sequence increment; the item is untouched.
    expect(captured.updates.some((u) => u.table === inventoryItems)).toBe(false);
  });

  it("prefers explicitly provided hours over the item's tracked hours", async () => {
    const { db, captured } = makeDb({ item: ITEM });
    await createRepairLaborInvoice(db, COMPANY_ID, USER_ID, {
      itemId: ITEM_ID,
      contactId: CONTACT_ID,
      hours: "2.00",
      hourlyRate: "120.00",
    });
    const items = captured.documentItemsInsert!;
    expect(items[0]).toMatchObject({
      quantity: "2.00",
      unitPrice: "120.00",
      total: "240.00",
    });
  });

  it("falls back to the company default hourly rate when none is provided", async () => {
    const { db, captured } = makeDb({
      item: ITEM,
      companySettings: { defaultRepairHourlyRate: "80.00" },
    });
    await createRepairLaborInvoice(db, COMPANY_ID, USER_ID, {
      itemId: ITEM_ID,
      contactId: CONTACT_ID,
    });
    const items = captured.documentItemsInsert!;
    expect(items[0]).toMatchObject({
      quantity: "3.50",
      unitPrice: "80.00",
      total: "280.00",
    });
  });

  it("throws when no rate is provided and no company default is configured", async () => {
    const { db, captured } = makeDb({ item: ITEM, companySettings: {} });
    await expect(
      createRepairLaborInvoice(db, COMPANY_ID, USER_ID, {
        itemId: ITEM_ID,
        contactId: CONTACT_ID,
      }),
    ).rejects.toThrow("no default repair rate configured");
    expect(captured.documentInsert).toBeUndefined();
  });

  it("reuses an existing repair-labor service product", async () => {
    const { db, captured } = makeDb({
      item: ITEM,
      existingProduct: { id: EXISTING_PRODUCT_ID },
    });
    await createRepairLaborInvoice(db, COMPANY_ID, USER_ID, {
      itemId: ITEM_ID,
      contactId: CONTACT_ID,
      hourlyRate: "95.00",
    });
    expect(captured.productInsert).toBeUndefined();
    expect(captured.documentItemsInsert![0].productId).toBe(EXISTING_PRODUCT_ID);
  });

  it("throws when the inventory item does not exist", async () => {
    const { db, captured } = makeDb({ item: null });
    await expect(
      createRepairLaborInvoice(db, COMPANY_ID, USER_ID, {
        itemId: ITEM_ID,
        contactId: CONTACT_ID,
        hourlyRate: "95.00",
      }),
    ).rejects.toThrow("Inventory item not found");
    // Rejected before any document was created.
    expect(captured.documentInsert).toBeUndefined();
    expect(captured.ranTransaction).toBe(false);
  });

  it("refuses to bill when there are no repair hours", async () => {
    const { db, captured } = makeDb({
      item: { ...ITEM, repairHours: null },
    });
    await expect(
      createRepairLaborInvoice(db, COMPANY_ID, USER_ID, {
        itemId: ITEM_ID,
        contactId: CONTACT_ID,
        hourlyRate: "95.00",
      }),
    ).rejects.toThrow("No repair hours to invoice");
    expect(captured.documentInsert).toBeUndefined();
  });
});
