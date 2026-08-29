import { describe, it, expect } from "vitest";
import { getRecentActivity } from "../domain/dashboard-activity";
import type { Database } from "@kivvi/database";

// getRecentActivity builds the unified dashboard feed: recent document events +
// recent inventory status changes, mapped to a common shape, merged, sorted by
// recency, and capped at `limit`. The testable JS: per-document-type deep-link
// routing, the inventory amount fallback chain
// (soldPrice ?? askingPrice ?? estimatedValue ?? "0"), null contact handling,
// and the merge/sort/slice. It uses the relational query API, so the mock just
// supplies findMany() results for documents and inventoryItems.

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";

function makeDb(docs: unknown[], items: unknown[]) {
  return {
    query: {
      documents: { findMany: async () => docs },
      inventoryItems: { findMany: async () => items },
    },
  } as unknown as Database;
}

const doc = (over: Record<string, unknown> = {}) => ({
  id: "d1",
  type: "invoice",
  number: "RE-2026-00001",
  total: "100.00",
  status: "sent",
  updatedAt: new Date("2026-06-10T12:00:00Z"),
  contact: { id: "c1", name: "ACME AG" },
  ...over,
});

const item = (over: Record<string, unknown> = {}) => ({
  id: "i1",
  status: "sold",
  itemNumber: "INV-00001",
  soldPrice: null,
  askingPrice: null,
  estimatedValue: null,
  statusUpdatedAt: new Date("2026-06-11T12:00:00Z"),
  donorContact: { id: "k1", name: "Donor" },
  ...over,
});

describe("getRecentActivity", () => {
  it("routes each document type to its detail page", async () => {
    const cases: Array<[string, string]> = [
      ["invoice", "/sales/invoices/d1"],
      ["quote", "/sales/quotes/d1"],
      ["order", "/sales/orders/d1"],
      ["credit_note", "/sales/credit-notes/d1"],
      ["dunning", "/sales/dunning/d1"],
      ["purchase_order", "/purchasing/purchase-orders/d1"],
      ["purchase_invoice", "/purchasing/purchase-invoices/d1"],
    ];
    for (const [type, linkTo] of cases) {
      const db = makeDb([doc({ type })], []);
      const feed = await getRecentActivity(db, COMPANY_ID);
      expect(feed[0].linkTo).toBe(linkTo);
      expect(feed[0].entityType).toBe("document");
    }
  });

  it("maps a document's total to a numeric amount and carries its contact", async () => {
    const db = makeDb([doc({ total: "249.95" })], []);
    const [a] = await getRecentActivity(db, COMPANY_ID);
    expect(a.amount).toBe(249.95);
    expect(a.contactName).toBe("ACME AG");
    expect(a.actionKey).toBe("activity.invoice.sent");
  });

  it("uses the inventory amount fallback chain soldPrice → askingPrice → estimatedValue → 0", async () => {
    const sold = makeDb([], [item({ soldPrice: "300", askingPrice: "350", estimatedValue: "50" })]);
    const asking = makeDb(
      [],
      [item({ soldPrice: null, askingPrice: "350", estimatedValue: "50" })],
    );
    const estimated = makeDb(
      [],
      [item({ soldPrice: null, askingPrice: null, estimatedValue: "50" })],
    );
    const none = makeDb([], [item({ soldPrice: null, askingPrice: null, estimatedValue: null })]);

    expect((await getRecentActivity(sold, COMPANY_ID))[0].amount).toBe(300);
    expect((await getRecentActivity(asking, COMPANY_ID))[0].amount).toBe(350);
    expect((await getRecentActivity(estimated, COMPANY_ID))[0].amount).toBe(50);
    expect((await getRecentActivity(none, COMPANY_ID))[0].amount).toBe(0);
  });

  it("links inventory activity to the intake item page with a null donor tolerated", async () => {
    const db = makeDb([], [item({ donorContact: null })]);
    const [a] = await getRecentActivity(db, COMPANY_ID);
    expect(a.entityType).toBe("inventory_item");
    expect(a.linkTo).toBe("/intake/items/i1");
    expect(a.contactName).toBeNull();
    expect(a.actionKey).toBe("activity.inventory.sold");
  });

  it("merges documents and inventory items sorted by most recent first", async () => {
    const db = makeDb(
      [doc({ id: "d1", updatedAt: new Date("2026-06-10T00:00:00Z") })],
      [item({ id: "i1", statusUpdatedAt: new Date("2026-06-12T00:00:00Z") })],
    );
    const feed = await getRecentActivity(db, COMPANY_ID);
    // Inventory item is newer → comes first.
    expect(feed.map((f) => f.id)).toEqual(["i1", "d1"]);
  });

  it("caps the merged feed at the requested limit", async () => {
    const docs = Array.from({ length: 5 }, (_, n) =>
      doc({ id: `d${n}`, updatedAt: new Date(2026, 5, 20 - n) }),
    );
    const items = Array.from({ length: 5 }, (_, n) =>
      item({ id: `i${n}`, statusUpdatedAt: new Date(2026, 5, 10 - n) }),
    );
    const feed = await getRecentActivity(makeDb(docs, items), COMPANY_ID, 3);
    expect(feed).toHaveLength(3);
    // The three most recent are the newest documents.
    expect(feed.map((f) => f.id)).toEqual(["d0", "d1", "d2"]);
  });
});
