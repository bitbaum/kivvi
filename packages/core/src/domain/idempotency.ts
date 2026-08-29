/**
 * Idempotency for external `/api/v1` writes.
 *
 * A client (e.g. revamp-it's Payrexx webhook handler) sends an `Idempotency-Key`
 * header. Payment gateways retry webhooks by design, so without this a retried
 * `POST /api/v1/documents` or `.../payments` would create a DUPLICATE invoice and
 * duplicate GL entries — corrupted books (Ground Truth #1: a transaction either
 * happened or it didn't).
 *
 * Flow (per company + key):
 *  1. `claimIdempotencyKey` inserts a 'pending' row with `ON CONFLICT DO NOTHING`.
 *     - Insert won → outcome "claimed": the caller runs the real handler.
 *     - Insert lost + existing row 'completed' → outcome "replay": return the
 *       stored response verbatim, never re-executing the handler.
 *     - Insert lost + existing row 'pending' → outcome "in_progress": a concurrent
 *       retry is mid-flight; the caller returns 409 rather than risk a double write.
 *  2. On success the caller stores the response via `completeIdempotencyKey`.
 *  3. On handler error / 5xx the caller calls `releaseIdempotencyKey` so the client
 *     can safely retry (transient failures must not be cached).
 *
 * Pure domain logic: takes a `Database`/tx handle, no HTTP types — the thin
 * NextResponse wrapper lives in apps/web/lib/api-idempotency.ts.
 */

import { and, eq } from "drizzle-orm";
import { apiIdempotencyKeys } from "@kivvi/database";
import type { Database } from "@kivvi/database";

/** Default retention for idempotency keys before they may be pruned. */
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export type IdempotencyClaim =
  | { outcome: "claimed" }
  | { outcome: "replay"; responseStatus: number; responseBody: unknown }
  | { outcome: "in_progress" };

/**
 * Atomically claim `key` for `companyId`, or report that it already exists.
 * Relies on the unique `(company_id, key)` index to close the concurrent-retry
 * race: exactly one caller wins the insert and gets "claimed".
 */
export async function claimIdempotencyKey(
  db: Database,
  companyId: string,
  key: string,
  method: string,
  path: string,
  ttlMs: number = IDEMPOTENCY_TTL_MS,
): Promise<IdempotencyClaim> {
  const expiresAt = new Date(Date.now() + ttlMs);

  const inserted = await db
    .insert(apiIdempotencyKeys)
    .values({ companyId, key, method, path, status: "pending", expiresAt })
    .onConflictDoNothing({
      target: [apiIdempotencyKeys.companyId, apiIdempotencyKeys.key],
    })
    .returning({ id: apiIdempotencyKeys.id });

  if (inserted.length > 0) {
    return { outcome: "claimed" };
  }

  // Lost the race — a row already exists. Read its state.
  const [existing] = await db
    .select()
    .from(apiIdempotencyKeys)
    .where(and(eq(apiIdempotencyKeys.companyId, companyId), eq(apiIdempotencyKeys.key, key)))
    .limit(1);

  if (existing && existing.status === "completed" && existing.responseStatus != null) {
    return {
      outcome: "replay",
      responseStatus: existing.responseStatus,
      responseBody: existing.responseBody,
    };
  }

  // Row exists but isn't a usable completed response → still in flight.
  return { outcome: "in_progress" };
}

/** Store the first response for a claimed key so future replays return it. */
export async function completeIdempotencyKey(
  db: Database,
  companyId: string,
  key: string,
  responseStatus: number,
  responseBody: unknown,
): Promise<void> {
  await db
    .update(apiIdempotencyKeys)
    .set({ status: "completed", responseStatus, responseBody })
    .where(and(eq(apiIdempotencyKeys.companyId, companyId), eq(apiIdempotencyKeys.key, key)));
}

/**
 * Release a claimed key so the client can retry. Used when the handler throws
 * or returns a 5xx — transient failures must not be cached as the final answer.
 */
export async function releaseIdempotencyKey(
  db: Database,
  companyId: string,
  key: string,
): Promise<void> {
  await db
    .delete(apiIdempotencyKeys)
    .where(and(eq(apiIdempotencyKeys.companyId, companyId), eq(apiIdempotencyKeys.key, key)));
}
