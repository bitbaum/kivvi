import { describe, it, expect } from "vitest";
import { getWorkflowSuggestions } from "../domain/dashboard-workflow";
import type { Database } from "@kivvi/database";

// getWorkflowSuggestions builds the dashboard's prioritized "next actions" queue
// from several document sources. The value is the priority assignment (1 =
// highest, escalating with age) and the final cross-source sort + cap. We focus
// on two representative sources — quotes-to-convert and invoices-for-dunning —
// plus the merge/sort/slice. The function mixes the relational query API
// (db.query.documents.findMany, called for quotes → delivery notes → invoices)
// with a builder query (orders); the mock supplies both.

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";
const DAY = 24 * 60 * 60 * 1000;
// Offsets sit comfortably inside each tier so floor() rounding near the
// boundary can never flip the result.
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

function selectBuilder(rows: unknown[]) {
  const b: Record<string, unknown> = {
    from: () => b,
    where: () => b,
    leftJoin: () => b,
    orderBy: () => b,
    limit: () => b,
    then: (resolve: (v: unknown[]) => unknown) =>
      Promise.resolve(rows).then(resolve),
  };
  return b;
}

type Quote = {
  id: string;
  number: string;
  total: string;
  issueDate: Date;
  contact: { id: string; name: string } | null;
};
type Dunning = {
  id: string;
  number: string;
  total: string;
  dueDate: Date;
  contact: { id: string; name: string } | null;
};

// findMany is called three times in order: quotes, delivery notes, invoices.
function makeDb(opts: { quotes?: Quote[]; invoices?: Dunning[] }) {
  const findManyQueue: unknown[][] = [
    opts.quotes ?? [],
    [], // delivery notes — unused here
    opts.invoices ?? [],
  ];
  let i = 0;
  return {
    query: {
      documents: { findMany: async () => findManyQueue[i++] ?? [] },
    },
    select: () => selectBuilder([]), // orders source — empty
  } as unknown as Database;
}

const quote = (id: string, ageDays: number): Quote => ({
  id,
  number: `AN-2026-${id}`,
  total: "500.00",
  issueDate: daysAgo(ageDays),
  contact: { id: "c1", name: "ACME AG" },
});
const overdue = (id: string, ageDays: number): Dunning => ({
  id,
  number: `RE-2026-${id}`,
  total: "800.00",
  dueDate: daysAgo(ageDays),
  contact: { id: "c1", name: "ACME AG" },
});

const byId = (s: { entityId: string; priority: number }[]) =>
  Object.fromEntries(s.map((x) => [x.entityId, x.priority]));

describe("getWorkflowSuggestions", () => {
  it("escalates convert-quote priority with the quote's age", async () => {
    const db = makeDb({
      quotes: [quote("old", 20), quote("mid", 10), quote("fresh", 5)],
    });
    const out = await getWorkflowSuggestions(db, COMPANY_ID);
    const p = byId(out);
    expect(p.old).toBe(1); // > 14 days
    expect(p.mid).toBe(2); // > 7 days
    expect(p.fresh).toBe(3); // <= 7 days
    expect(out.every((s) => s.type === "convert_quote")).toBe(true);
  });

  it("escalates dunning priority with how overdue the invoice is", async () => {
    const db = makeDb({
      invoices: [
        overdue("veryLate", 40),
        overdue("late", 20),
        overdue("recent", 10),
      ],
    });
    const p = byId(await getWorkflowSuggestions(db, COMPANY_ID));
    expect(p.veryLate).toBe(1); // > 30 days
    expect(p.late).toBe(2); // > 14 days
    expect(p.recent).toBe(3); // <= 14 days
  });

  it("carries amount, contact and a daysSince figure onto each suggestion", async () => {
    const db = makeDb({ quotes: [quote("q1", 20)] });
    const [s] = await getWorkflowSuggestions(db, COMPANY_ID);
    expect(s).toMatchObject({
      entityId: "q1",
      entityType: "quote",
      contactName: "ACME AG",
      amount: 500,
    });
    expect(s.daysSince).toBeGreaterThanOrEqual(20);
  });

  it("sorts the merged queue highest-priority first across sources", async () => {
    const db = makeDb({
      quotes: [quote("freshQuote", 5)], // priority 3
      invoices: [overdue("veryLate", 40)], // priority 1
    });
    const out = await getWorkflowSuggestions(db, COMPANY_ID);
    // The urgent dunning (1) must precede the low-priority quote (3).
    expect(out.map((s) => s.entityId)).toEqual(["veryLate", "freshQuote"]);
  });

  it("caps the queue at 20 suggestions", async () => {
    const quotes = Array.from({ length: 25 }, (_, n) => quote(`q${n}`, 20));
    const out = await getWorkflowSuggestions(makeDb({ quotes }), COMPANY_ID);
    expect(out).toHaveLength(20);
  });

  it("returns an empty queue when there is nothing to act on", async () => {
    const out = await getWorkflowSuggestions(makeDb({}), COMPANY_ID);
    expect(out).toEqual([]);
  });
});
