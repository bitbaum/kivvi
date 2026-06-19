import { describe, it, expect } from "vitest";
import {
  findDuplicateContacts,
  findDocumentIssues,
  findProductIssues,
} from "../domain/data-quality";
import type { Database } from "@kivvi/database";

// The data-quality detectors power the post-migration "clean your data" report
// that kivitendo migrators rely on. Each detector is read-only branching logic
// over a fixed sequence of queries. We isolate that logic with a mock Database
// that returns queued read results in call order — no real DB, just the
// classification rules under test:
//   - findProductIssues: zero_price takes precedence over no_category (else-if)
//   - findDocumentIssues: ONE issue per doc, priority
//     zero_total > no_contact > no_items > stale_draft, with intake /
//     delivery_note exemptions
//   - findDuplicateContacts: case/whitespace-insensitive name grouping, only
//     groups of 2+, annotated with each member's document count

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";

/**
 * A thenable query builder: every chain method returns the builder, awaiting
 * it resolves to the queued rows for the current select() call. Supports every
 * chain shape the detectors use (from/where/innerJoin/leftJoin/groupBy).
 */
function makeDb(reads: unknown[][]) {
  let idx = 0;
  function builder(rows: unknown[]) {
    const b: Record<string, unknown> = {
      from: () => b,
      where: () => b,
      innerJoin: () => b,
      leftJoin: () => b,
      groupBy: () => b,
      then: (
        resolve: (v: unknown[]) => unknown,
        reject?: (e: unknown) => unknown,
      ) => Promise.resolve(rows).then(resolve, reject),
    };
    return b;
  }
  const db = {
    select: () => builder(reads[idx++] ?? []),
  };
  return db as unknown as Database;
}

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

// ============================================================================
// findProductIssues
// ============================================================================

describe("findProductIssues", () => {
  it("flags a fixed-price product priced at zero as zero_price", async () => {
    const db = makeDb([
      [
        {
          id: "p1",
          name: "Mystery box",
          articleNumber: "ART-00001",
          unitPrice: "0",
          isPriceFlexible: false,
          productGroupId: "g1",
        },
      ],
    ]);
    const issues = await findProductIssues(db, COMPANY_ID);
    expect(issues).toEqual([
      {
        id: "p1",
        name: "Mystery box",
        articleNumber: "ART-00001",
        unitPrice: "0",
        issue: "zero_price",
      },
    ]);
  });

  it("does NOT flag a zero-price product when pricing is flexible", async () => {
    // Secondhand goods are often individually priced — zero is intentional.
    const db = makeDb([
      [
        {
          id: "p1",
          name: "Donated laptop",
          articleNumber: "ART-00002",
          unitPrice: "0",
          isPriceFlexible: true,
          productGroupId: "g1",
        },
      ],
    ]);
    expect(await findProductIssues(db, COMPANY_ID)).toEqual([]);
  });

  it("flags an uncategorized priced product as no_category", async () => {
    const db = makeDb([
      [
        {
          id: "p1",
          name: "Cable",
          articleNumber: "ART-00003",
          unitPrice: "5.00",
          isPriceFlexible: false,
          productGroupId: null,
        },
      ],
    ]);
    const issues = await findProductIssues(db, COMPANY_ID);
    expect(issues).toHaveLength(1);
    expect(issues[0].issue).toBe("no_category");
  });

  it("reports only zero_price (not no_category) for a zero-price uncategorized product", async () => {
    // else-if precedence: the more severe pricing issue wins.
    const db = makeDb([
      [
        {
          id: "p1",
          name: "Broken thing",
          articleNumber: "ART-00004",
          unitPrice: "0",
          isPriceFlexible: false,
          productGroupId: null,
        },
      ],
    ]);
    const issues = await findProductIssues(db, COMPANY_ID);
    expect(issues).toHaveLength(1);
    expect(issues[0].issue).toBe("zero_price");
  });

  it("returns no issues for a well-formed product", async () => {
    const db = makeDb([
      [
        {
          id: "p1",
          name: "Refurb ThinkPad",
          articleNumber: "ART-00005",
          unitPrice: "299.00",
          isPriceFlexible: false,
          productGroupId: "g1",
        },
      ],
    ]);
    expect(await findProductIssues(db, COMPANY_ID)).toEqual([]);
  });
});

// ============================================================================
// findDocumentIssues
// ============================================================================

describe("findDocumentIssues", () => {
  // allDocs row factory — sensible defaults for a clean sent invoice.
  const doc = (over: Record<string, unknown> = {}) => ({
    id: "d1",
    number: "RE-2026-00001",
    type: "invoice",
    status: "sent",
    total: "100.00",
    issueDate: daysAgo(1),
    contactId: "c1",
    contactName: "ACME AG",
    ...over,
  });

  it("flags a non-draft zero-total invoice as zero_total", async () => {
    const db = makeDb([[doc({ total: "0" })], [{ documentId: "d1" }]]);
    const issues = await findDocumentIssues(db, COMPANY_ID);
    expect(issues).toHaveLength(1);
    expect(issues[0].issue).toBe("zero_total");
  });

  it("does NOT flag an intake document with zero total", async () => {
    // Intake legitimately has zero monetary total (donated goods).
    const db = makeDb([
      [doc({ type: "intake", total: "0", contactId: "c1" })],
      [{ documentId: "d1" }],
    ]);
    expect(await findDocumentIssues(db, COMPANY_ID)).toEqual([]);
  });

  it("does NOT flag a delivery note with zero total", async () => {
    const db = makeDb([
      [doc({ type: "delivery_note", total: "0" })],
      [{ documentId: "d1" }],
    ]);
    expect(await findDocumentIssues(db, COMPANY_ID)).toEqual([]);
  });

  it("flags a non-draft invoice with no contact as no_contact", async () => {
    const db = makeDb([
      [doc({ contactId: null, contactName: null })],
      [{ documentId: "d1" }],
    ]);
    const issues = await findDocumentIssues(db, COMPANY_ID);
    expect(issues).toHaveLength(1);
    expect(issues[0].issue).toBe("no_contact");
  });

  it("flags a non-draft document with no line items as no_items", async () => {
    // docsWithItems is empty → d1 has no items.
    const db = makeDb([[doc()], []]);
    const issues = await findDocumentIssues(db, COMPANY_ID);
    expect(issues).toHaveLength(1);
    expect(issues[0].issue).toBe("no_items");
  });

  it("flags a draft older than the stale threshold as stale_draft", async () => {
    const db = makeDb([
      [doc({ status: "draft", issueDate: daysAgo(120) })],
      [{ documentId: "d1" }],
    ]);
    const issues = await findDocumentIssues(db, COMPANY_ID);
    expect(issues).toHaveLength(1);
    expect(issues[0].issue).toBe("stale_draft");
  });

  it("does NOT flag a recent draft", async () => {
    const db = makeDb([
      [doc({ status: "draft", issueDate: daysAgo(10) })],
      [{ documentId: "d1" }],
    ]);
    expect(await findDocumentIssues(db, COMPANY_ID)).toEqual([]);
  });

  it("emits exactly one issue per document, highest priority first", async () => {
    // A zero-total invoice that ALSO has no contact and no items: only the
    // highest-priority issue (zero_total) is reported.
    const db = makeDb([
      [doc({ total: "0", contactId: null, contactName: null })],
      [], // no items either
    ]);
    const issues = await findDocumentIssues(db, COMPANY_ID);
    expect(issues).toHaveLength(1);
    expect(issues[0].issue).toBe("zero_total");
  });

  it("returns no issues for a well-formed sent invoice", async () => {
    const db = makeDb([[doc()], [{ documentId: "d1" }]]);
    expect(await findDocumentIssues(db, COMPANY_ID)).toEqual([]);
  });
});

// ============================================================================
// findDuplicateContacts
// ============================================================================

describe("findDuplicateContacts", () => {
  const contact = (over: Record<string, unknown> = {}) => ({
    id: "c1",
    name: "ACME AG",
    contactNumber: "K-00001",
    email: "info@acme.ch",
    type: "customer",
    ...over,
  });

  it("groups contacts whose names differ only in case and whitespace", async () => {
    const db = makeDb([
      [
        contact({ id: "c1", name: "ACME AG", contactNumber: "K-00001" }),
        contact({ id: "c2", name: "acme  ag", contactNumber: "K-00002" }),
      ],
      [
        { contactId: "c1", count: 3 },
        { contactId: "c2", count: 1 },
      ],
    ]);
    const groups = await findDuplicateContacts(db, COMPANY_ID);
    expect(groups).toHaveLength(1);
    expect(groups[0].normalizedName).toBe("acme ag");
    expect(groups[0].contacts).toHaveLength(2);
    // Each member is annotated with its document count.
    const byId = Object.fromEntries(
      groups[0].contacts.map((c) => [c.id, c.documentCount]),
    );
    expect(byId).toEqual({ c1: 3, c2: 1 });
  });

  it("returns no groups when every contact name is unique", async () => {
    const db = makeDb([
      [
        contact({ id: "c1", name: "ACME AG" }),
        contact({ id: "c2", name: "Globex GmbH" }),
      ],
    ]);
    expect(await findDuplicateContacts(db, COMPANY_ID)).toEqual([]);
  });

  it("defaults document count to zero for a member with no documents", async () => {
    const db = makeDb([
      [contact({ id: "c1", name: "Dup" }), contact({ id: "c2", name: "dup" })],
      [{ contactId: "c1", count: 2 }], // c2 absent from the count rows
    ]);
    const groups = await findDuplicateContacts(db, COMPANY_ID);
    const c2 = groups[0].contacts.find((c) => c.id === "c2");
    expect(c2?.documentCount).toBe(0);
  });
});
