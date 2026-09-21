import { describe, it, expect, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { mergeCompanySettings, splitSettingsPatch } from "../domain/companies";
import type { Database } from "@kivvi/database";

// `companies.settings` is a JSONB blob that several writers touch independently
// — the billing action saves `stripeCustomerId` while Stripe's webhooks write
// `plan` / `subscriptionStatus` / `stripeSubscriptionId` for the same company,
// milliseconds apart and in concurrent requests.
//
// The old shape (SELECT settings → spread the patch in JS → UPDATE the whole
// column) is a lost update: whichever writer commits last erases every field the
// other one added. On the billing path that means a customer who has already
// been charged can be left on the free plan.
//
// These tests pin the invariant that rules that out: the merge is ONE UPDATE
// carrying a `jsonb ||` expression evaluated against the row's current value,
// with no prior read.

const COMPANY_ID = "550e8400-e29b-41d4-a716-446655440000";

/** Mock Database that records what `update().set()` was handed. */
function makeMockDb() {
  const updates: Record<string, unknown>[] = [];
  const select = vi.fn();
  const findFirst = vi.fn();

  const db = {
    select,
    query: { companies: { findFirst } },
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          updates.push(values);
        },
      }),
    }),
  } as unknown as Database;

  return { db, updates, select, findFirst };
}

/** Render the captured `settings` expression to real SQL + bound params. */
function renderSettings(values: Record<string, unknown>) {
  return new PgDialect().sqlToQuery(values.settings as SQL);
}

describe("splitSettingsPatch", () => {
  it("routes defined values to set and undefined values to remove", () => {
    expect(
      splitSettingsPatch({
        plan: "free",
        subscriptionStatus: "cancelled",
        stripeSubscriptionId: undefined,
      }),
    ).toEqual({
      set: { plan: "free", subscriptionStatus: "cancelled" },
      remove: ["stripeSubscriptionId"],
    });
  });

  it("treats an explicit undefined as a key removal, not a value write", () => {
    expect(splitSettingsPatch({ stripeSubscriptionId: undefined })).toEqual({
      set: {},
      remove: ["stripeSubscriptionId"],
    });
  });

  it("keeps falsy-but-defined values as writes", () => {
    expect(splitSettingsPatch({ plan: "free", trialEndsAt: "" })).toEqual({
      set: { plan: "free", trialEndsAt: "" },
      remove: [],
    });
  });
});

describe("mergeCompanySettings", () => {
  it("never reads the current settings before writing", async () => {
    const { db, select, findFirst } = makeMockDb();

    await mergeCompanySettings(db, COMPANY_ID, { plan: "premium" });

    // A read here would reintroduce the read-modify-write race.
    expect(select).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("merges the patch in Postgres, in a single UPDATE", async () => {
    const { db, updates } = makeMockDb();

    await mergeCompanySettings(db, COMPANY_ID, {
      plan: "premium",
      subscriptionStatus: "active",
    });

    expect(updates).toHaveLength(1);

    const { sql, params } = renderSettings(updates[0]);
    // `||` against the column's CURRENT value — not a replacement blob.
    expect(sql).toContain('"settings"');
    expect(sql).toContain("||");
    expect(sql).toContain("::jsonb");
    // Only the patch crosses the wire, so a concurrent writer's disjoint keys
    // survive the merge.
    expect(params).toEqual([JSON.stringify({ plan: "premium", subscriptionStatus: "active" })]);
    expect(updates[0].updatedAt).toBeInstanceOf(Date);
  });

  it("removes a key with `jsonb - key` instead of writing undefined", async () => {
    const { db, updates } = makeMockDb();

    // What handleSubscriptionDeleted sends when a subscription ends.
    await mergeCompanySettings(db, COMPANY_ID, {
      subscriptionStatus: "cancelled",
      plan: "free",
      stripeSubscriptionId: undefined,
    });

    const { sql, params } = renderSettings(updates[0]);
    expect(sql).toContain("- $2::text");
    expect(params).toEqual([
      JSON.stringify({ subscriptionStatus: "cancelled", plan: "free" }),
      "stripeSubscriptionId",
    ]);
  });

  it("is a no-op when the patch is empty", async () => {
    const { db, updates } = makeMockDb();

    await mergeCompanySettings(db, COMPANY_ID, {});

    expect(updates).toHaveLength(0);
  });
});
