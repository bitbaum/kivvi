import { describe, it, expect } from "vitest";
import {
  claimIdempotencyKey,
  completeIdempotencyKey,
  releaseIdempotencyKey,
} from "../domain/idempotency";
import type { Database } from "@kivvi/database";

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";
const KEY = "payrexx-tx-42";

/** Thenable select builder resolving to `rows` (mirrors Drizzle's lazy shape). */
function selectBuilder(rows: unknown[]) {
  const b: Record<string, unknown> = {
    from: () => b,
    where: () => b,
    limit: () => b,
    then: (
      resolve: (v: unknown[]) => unknown,
      reject?: (e: unknown) => unknown,
    ) => Promise.resolve(rows).then(resolve, reject),
  };
  return b;
}

/**
 * Mock Database for the idempotency table.
 * - `insertReturns`: rows the `insert(...).onConflictDoNothing().returning()`
 *   chain resolves to ([] = conflict/lost the race, [row] = won the claim).
 * - `existingRow`: the row a follow-up select finds (or null).
 * Records update/delete calls so tests can assert persistence behaviour.
 */
function makeMockDb(opts: { insertReturns: unknown[]; existingRow?: unknown }) {
  const calls = {
    updates: [] as Record<string, unknown>[],
    deletes: 0,
  };
  const db = {
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => ({
          returning: async () => opts.insertReturns,
        }),
      }),
    }),
    select: () => selectBuilder(opts.existingRow ? [opts.existingRow] : []),
    update: () => ({
      set: (s: Record<string, unknown>) => ({
        where: async () => {
          calls.updates.push(s);
          return undefined;
        },
      }),
    }),
    delete: () => ({
      where: async () => {
        calls.deletes += 1;
        return undefined;
      },
    }),
  };
  return { db: db as unknown as Database, calls };
}

describe("claimIdempotencyKey", () => {
  it("returns 'claimed' when the insert wins the race", async () => {
    const { db } = makeMockDb({ insertReturns: [{ id: "row-1" }] });
    const result = await claimIdempotencyKey(
      db,
      COMPANY_ID,
      KEY,
      "POST",
      "/api/v1/documents",
    );
    expect(result).toEqual({ outcome: "claimed" });
  });

  it("returns 'replay' with the stored response when key is completed", async () => {
    const { db } = makeMockDb({
      insertReturns: [], // conflict — key already exists
      existingRow: {
        status: "completed",
        responseStatus: 201,
        responseBody: { success: true, data: { id: "doc-1" } },
      },
    });
    const result = await claimIdempotencyKey(
      db,
      COMPANY_ID,
      KEY,
      "POST",
      "/api/v1/documents",
    );
    expect(result).toEqual({
      outcome: "replay",
      responseStatus: 201,
      responseBody: { success: true, data: { id: "doc-1" } },
    });
  });

  it("returns 'in_progress' when a concurrent request holds a pending row", async () => {
    const { db } = makeMockDb({
      insertReturns: [],
      existingRow: {
        status: "pending",
        responseStatus: null,
        responseBody: null,
      },
    });
    const result = await claimIdempotencyKey(
      db,
      COMPANY_ID,
      KEY,
      "POST",
      "/api/v1/documents",
    );
    expect(result).toEqual({ outcome: "in_progress" });
  });

  it("treats a completed row with no stored status as still in progress", async () => {
    // Defensive: a 'completed' row must carry a responseStatus to be replayable.
    const { db } = makeMockDb({
      insertReturns: [],
      existingRow: {
        status: "completed",
        responseStatus: null,
        responseBody: null,
      },
    });
    const result = await claimIdempotencyKey(
      db,
      COMPANY_ID,
      KEY,
      "POST",
      "/api/v1/documents",
    );
    expect(result).toEqual({ outcome: "in_progress" });
  });
});

describe("completeIdempotencyKey", () => {
  it("persists status=completed with the response status + body", async () => {
    const { db, calls } = makeMockDb({ insertReturns: [] });
    await completeIdempotencyKey(db, COMPANY_ID, KEY, 201, {
      success: true,
      data: { id: "doc-1" },
    });
    expect(calls.updates).toHaveLength(1);
    expect(calls.updates[0]).toMatchObject({
      status: "completed",
      responseStatus: 201,
      responseBody: { success: true, data: { id: "doc-1" } },
    });
  });
});

describe("releaseIdempotencyKey", () => {
  it("deletes the claim so the client can retry", async () => {
    const { db, calls } = makeMockDb({ insertReturns: [] });
    await releaseIdempotencyKey(db, COMPANY_ID, KEY);
    expect(calls.deletes).toBe(1);
  });
});
