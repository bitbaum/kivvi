import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import type { Database } from "@kivvi/database";
import {
  describeSealCounts,
  sealCompanyAiKeys,
  sealCompanyAiKeysOnStart,
} from "../seal-company-ai-keys";
import { openCompanyAiKey, sealCompanyAiKey } from "../security/company-ai-key-crypto";

const PLAIN_A = "11111111-1111-4111-8111-111111111111";
const PLAIN_B = "22222222-2222-4222-8222-222222222222";
const SEALED = "33333333-3333-4333-8333-333333333333";
const LOST = "44444444-4444-4444-8444-444444444444";
const KEY_A = "gsk_not_a_real_key_aaaa1111";
const KEY_B = "sk-or-not-a-real-key-bbbb2222";
const KEY_C = "xai-not-a-real-key-cccc3333";

const dialect = new PgDialect();
const params = (fragment: unknown) => dialect.sqlToQuery(fragment as SQL).params;

/**
 * An in-memory `companies` table behind the two calls the sealing makes: the
 * SELECT of every row holding a key, and the guarded UPDATE. The UPDATE is
 * applied the way Postgres would: only to the row with that id, and only while
 * its key is still the value that was read. Never a real database.
 */
function fakeCompanies(initial: Record<string, string>, beforeUpdate?: (id: string) => void) {
  const table = new Map(Object.entries(initial));
  const writes: string[] = [];
  const db = {
    select: () => ({
      from: () => ({
        where: async () => [...table].map(([id, aiApiKey]) => ({ id, settings: { aiApiKey } })),
      }),
    }),
    update: () => ({
      set: (values: { settings: unknown }) => ({
        where: (guard: unknown) => ({
          returning: async () => {
            const [next] = params(values.settings) as [string];
            const [id, expected] = params(guard) as [string, string];
            beforeUpdate?.(id);
            if (table.get(id) !== expected) return [];
            table.set(id, next);
            writes.push(id);
            return [{ id }];
          },
        }),
      }),
    }),
  };
  return { db: db as unknown as Database, table, writes };
}

describe("sealing the company AI keys still in plaintext", () => {
  beforeEach(() => vi.stubEnv("INTEGRATION_SECRET", "test-integration-secret-0123"));
  afterEach(() => vi.unstubAllEnvs());

  it("seals plaintext rows and leaves sealed and unreadable ones alone", async () => {
    const sealed = sealCompanyAiKey(SEALED, KEY_C);
    const lost = sealCompanyAiKey(PLAIN_A, KEY_C); // bound to another company: does not open
    const { db, table, writes } = fakeCompanies({
      [PLAIN_A]: KEY_A,
      [PLAIN_B]: KEY_B,
      [SEALED]: sealed,
      [LOST]: lost,
    });

    expect(await sealCompanyAiKeys(db)).toEqual({
      sealed: 2,
      alreadySealed: 1,
      unreadable: 1,
      unchanged: 0,
    });
    expect(writes.sort()).toEqual([PLAIN_A, PLAIN_B].sort());
    expect(table.get(PLAIN_A)).not.toContain(KEY_A);
    expect(openCompanyAiKey(PLAIN_A, table.get(PLAIN_A))).toEqual({
      status: "sealed",
      key: KEY_A,
      stale: false,
    });
    expect(openCompanyAiKey(PLAIN_B, table.get(PLAIN_B))).toEqual({
      status: "sealed",
      key: KEY_B,
      stale: false,
    });
    expect(table.get(SEALED)).toBe(sealed);
    expect(table.get(LOST)).toBe(lost);
  });

  it("is idempotent: a second run writes nothing", async () => {
    const { db, writes } = fakeCompanies({ [PLAIN_A]: KEY_A, [PLAIN_B]: KEY_B });
    await sealCompanyAiKeys(db);
    writes.length = 0;
    expect(await sealCompanyAiKeys(db)).toEqual({
      sealed: 0,
      alreadySealed: 2,
      unreadable: 0,
      unchanged: 0,
    });
    expect(writes).toEqual([]);
  });

  it("does not overwrite a key someone changed between the read and the write", async () => {
    const replaced = sealCompanyAiKey(PLAIN_A, "a-key-an-admin-just-saved");
    const { db, table } = fakeCompanies({ [PLAIN_A]: KEY_A }, (id) => table.set(id, replaced));
    expect(await sealCompanyAiKeys(db)).toEqual({
      sealed: 0,
      alreadySealed: 0,
      unreadable: 0,
      unchanged: 1,
    });
    expect(table.get(PLAIN_A)).toBe(replaced);
  });

  it("at start-up, logs counts and never a key", async () => {
    const { db } = fakeCompanies({ [PLAIN_A]: KEY_A, [SEALED]: sealCompanyAiKey(SEALED, KEY_C) });
    const log = { info: vi.fn(), error: vi.fn() };
    const counts = await sealCompanyAiKeysOnStart(db, log);
    expect(counts).toEqual({ sealed: 1, alreadySealed: 1, unreadable: 0, unchanged: 0 });
    expect(log.info).toHaveBeenCalledWith(`[seal-company-ai-keys] ${describeSealCounts(counts!)}`);
    expect(log.error).not.toHaveBeenCalled();
    const logged = JSON.stringify(log.info.mock.calls);
    for (const key of [KEY_A, KEY_C]) expect(logged).not.toContain(key);
  });

  it("at start-up, catches and logs a failure instead of throwing, and writes nothing", async () => {
    const failing = {
      select: () => ({
        from: () => ({
          where: async () => {
            throw new Error("connection refused");
          },
        }),
      }),
    } as unknown as Database;
    const log = { info: vi.fn(), error: vi.fn() };
    await expect(sealCompanyAiKeysOnStart(failing, log)).resolves.toBeNull();
    expect(log.error).toHaveBeenCalledWith(
      "[seal-company-ai-keys] skipped at start-up: connection refused",
    );
  });

  it("at start-up, does not run without an app secret", async () => {
    vi.stubEnv("INTEGRATION_SECRET", "");
    vi.stubEnv("NEXTAUTH_SECRET", "");
    vi.stubEnv("AUTH_SECRET", "");
    const { db, writes } = fakeCompanies({ [PLAIN_A]: KEY_A });
    const log = { info: vi.fn(), error: vi.fn() };
    expect(await sealCompanyAiKeysOnStart(db, log)).toBeNull();
    expect(writes).toEqual([]);
    expect(log.error).toHaveBeenCalledTimes(1);
  });
});
