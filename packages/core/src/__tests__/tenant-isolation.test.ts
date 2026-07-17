import { describe, it, expect } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { Database } from "@kivvi/database";
import { listDocuments, getDocument } from "../domain/documents";
import {
  listAccounts,
  getAccount,
  listJournalEntries,
  getJournalEntry,
} from "../domain/accounting";
import {
  listInventoryItems,
  getInventoryItem,
} from "../domain/inventory-items";

// ============================================================================
// TENANT ISOLATION — the most fatal invariant in the system.
//
// Kivvi is a multi-tenant financial system of record. Every read of documents,
// accounting data, or inventory MUST be scoped by companyId; a single missing
// `eq(table.companyId, companyId)` condition leaks one company's financial
// data to another. This suite is a regression net: it drives the core domain
// read paths against a mock Database that captures every WHERE clause they
// build, renders each clause to SQL via drizzle's PgDialect, and asserts the
// clause filters `"<table>"."company_id"` bound to the caller's companyId.
// If anyone removes (or mis-binds) a companyId filter, these tests fail.
// ============================================================================

const COMPANY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
// An id belonging to "company B" — the caller from company A must still only
// ever query with company A's id bound to company_id.
const FOREIGN_RECORD_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

/**
 * Mock Database that captures every WHERE clause passed to a select chain or
 * to the relational query API (db.query.<table>.findMany/findFirst).
 * Select results come from `reads` in call order (default: empty result).
 */
function makeDb(reads: unknown[][] = []) {
  let readIdx = 0;
  const wheres: (SQL | undefined)[] = [];

  function selectBuilder(rows: unknown[]) {
    const b: Record<string, unknown> = {
      from: () => b,
      leftJoin: () => b,
      innerJoin: () => b,
      groupBy: () => b,
      orderBy: () => b,
      limit: () => b,
      offset: () => b,
      where: (clause: SQL | undefined) => {
        wheres.push(clause);
        return b;
      },
      then: (
        resolve: (v: unknown[]) => unknown,
        reject?: (e: unknown) => unknown,
      ) => Promise.resolve(rows).then(resolve, reject),
    };
    return b;
  }

  const relationalTable = {
    findMany: async (opts?: { where?: SQL }) => {
      wheres.push(opts?.where);
      return [];
    },
    findFirst: async (opts?: { where?: SQL }) => {
      wheres.push(opts?.where);
      return undefined;
    },
  };

  const db = {
    select: () => selectBuilder(reads[readIdx++] ?? []),
    query: { documents: relationalTable },
  };

  return { db: db as unknown as Database, wheres };
}

const dialect = new PgDialect();

/**
 * Assert that a captured WHERE clause contains `"<table>"."company_id" = $n`
 * AND that the bound parameter $n is exactly the caller's companyId.
 * Both halves matter: dropping the filter fails the first check; binding the
 * wrong value (e.g. a hardcoded or foreign id) fails the second.
 */
function expectCompanyScoped(
  where: SQL | undefined,
  table: string,
  companyId: string,
) {
  expect(where, "query was built with no WHERE clause at all").toBeDefined();
  const { sql: sqlText, params } = dialect.sqlToQuery(where!);
  const match = sqlText.match(
    new RegExp(`"${table}"\\."company_id" = \\$(\\d+)`),
  );
  expect(
    match,
    `WHERE clause does not filter "${table}"."company_id" — tenant isolation broken.\nRendered: ${sqlText}`,
  ).not.toBeNull();
  const boundValue = params[Number(match![1]) - 1];
  expect(
    boundValue,
    `"${table}"."company_id" is bound to ${JSON.stringify(boundValue)} instead of the caller's companyId`,
  ).toBe(companyId);
}

// ============================================================================
// Documents (documents.ts) — invoices, quotes, credit notes
// ============================================================================

describe("tenant isolation: documents", () => {
  it("listDocuments scopes both the count and the page query by companyId", async () => {
    const { db, wheres } = makeDb([[{ total: 0 }]]);

    await listDocuments(db, COMPANY_A);

    // 1 count select + 1 relational findMany — both must carry the filter
    expect(wheres.length).toBe(2);
    for (const where of wheres) {
      expectCompanyScoped(where, "documents", COMPANY_A);
    }
  });

  it("listDocuments keeps the companyId filter when other filters are active", async () => {
    const { db, wheres } = makeDb([[{ total: 0 }]]);

    await listDocuments(db, COMPANY_A, {
      type: "invoice",
      status: "overdue",
      search: "RE-2026",
      page: 3,
    });

    expect(wheres.length).toBe(2);
    for (const where of wheres) {
      expectCompanyScoped(where, "documents", COMPANY_A);
    }
  });

  it("getDocument for a foreign document id still binds the caller's companyId (and finds nothing)", async () => {
    const { db, wheres } = makeDb();

    const result = await getDocument(db, COMPANY_A, FOREIGN_RECORD_ID);

    expect(result).toBeNull();
    expect(wheres.length).toBe(1);
    expectCompanyScoped(wheres[0], "documents", COMPANY_A);
    // The foreign id may be queried — but only ever inside company A's scope
    const { params } = dialect.sqlToQuery(wheres[0]!);
    expect(params).toContain(COMPANY_A);
  });
});

// ============================================================================
// Accounting (accounting.ts) — chart of accounts, journal
// ============================================================================

describe("tenant isolation: accounting", () => {
  it("listAccounts scopes the query by companyId", async () => {
    const { db, wheres } = makeDb([[]]);

    await listAccounts(db, COMPANY_A);

    expect(wheres.length).toBe(1);
    expectCompanyScoped(wheres[0], "accounts", COMPANY_A);
  });

  it("getAccount for a foreign account id still binds the caller's companyId", async () => {
    const { db, wheres } = makeDb([[]]);

    const result = await getAccount(db, COMPANY_A, FOREIGN_RECORD_ID);

    expect(result).toBeNull();
    expect(wheres.length).toBe(1);
    expectCompanyScoped(wheres[0], "accounts", COMPANY_A);
  });

  it("listJournalEntries scopes both the count and the page query by companyId", async () => {
    const { db, wheres } = makeDb([[{ count: 0 }], []]);

    await listJournalEntries(db, COMPANY_A);

    expect(wheres.length).toBe(2);
    for (const where of wheres) {
      expectCompanyScoped(where, "journal_entries", COMPANY_A);
    }
  });

  it("getJournalEntry for a foreign entry id still binds the caller's companyId", async () => {
    const { db, wheres } = makeDb([[]]);

    const result = await getJournalEntry(db, COMPANY_A, FOREIGN_RECORD_ID);

    expect(result).toBeNull();
    expect(wheres.length).toBe(1);
    expectCompanyScoped(wheres[0], "journal_entries", COMPANY_A);
  });
});

// ============================================================================
// Inventory (inventory-items.ts) — serialized items
// ============================================================================

describe("tenant isolation: inventory items", () => {
  it("listInventoryItems scopes both the count and the page query by companyId", async () => {
    const { db, wheres } = makeDb([[{ total: 0 }], []]);

    await listInventoryItems(db, COMPANY_A);

    expect(wheres.length).toBe(2);
    for (const where of wheres) {
      expectCompanyScoped(where, "inventory_items", COMPANY_A);
    }
  });

  it("getInventoryItem for a foreign item id still binds the caller's companyId", async () => {
    const { db, wheres } = makeDb([[]]);

    const result = await getInventoryItem(db, COMPANY_A, FOREIGN_RECORD_ID);

    expect(result).toBeNull();
    expect(wheres.length).toBe(1);
    expectCompanyScoped(wheres[0], "inventory_items", COMPANY_A);
  });
});
