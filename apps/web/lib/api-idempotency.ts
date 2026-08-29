import { NextRequest, NextResponse } from "next/server";
import {
  claimIdempotencyKey,
  completeIdempotencyKey,
  releaseIdempotencyKey,
} from "@kivvi/core/src/domain/idempotency";
import { db } from "./db";

/**
 * Wrap an authenticated `/api/v1` write handler with idempotency keyed on the
 * `Idempotency-Key` request header. Opt-in: with no header the handler runs
 * unchanged.
 *
 * - New key  → claim, run handler, store the response, return it.
 * - Replay   → return the stored response verbatim (handler never re-runs), so a
 *              retried Payrexx webhook can't create a duplicate invoice/payment.
 * - Pending  → 409 (a concurrent retry is mid-flight).
 * - Error/5xx → release the claim so the client can safely retry.
 */
export async function withIdempotency(
  request: NextRequest,
  companyId: string,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key) return handler();

  const path = new URL(request.url).pathname;
  const claim = await claimIdempotencyKey(db, companyId, key, request.method, path);

  if (claim.outcome === "replay") {
    return NextResponse.json(claim.responseBody, {
      status: claim.responseStatus,
      headers: { "Idempotent-Replayed": "true" },
    });
  }

  if (claim.outcome === "in_progress") {
    return NextResponse.json(
      {
        success: false,
        error: "A request with this Idempotency-Key is already being processed.",
      },
      { status: 409 },
    );
  }

  // outcome === "claimed" — we own it. Run the handler, persist the response.
  let response: NextResponse;
  try {
    response = await handler();
  } catch (err) {
    // Transient/unknown failure — release so the client can retry.
    await releaseIdempotencyKey(db, companyId, key);
    throw err;
  }

  if (response.status >= 500) {
    // Don't cache server errors; let the client retry.
    await releaseIdempotencyKey(db, companyId, key);
    return response;
  }

  // Deterministic outcome (2xx/4xx) — store the exact body + status for replay.
  const bodyText = await response.clone().text();
  let body: unknown = null;
  if (bodyText) {
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = bodyText;
    }
  }
  await completeIdempotencyKey(db, companyId, key, response.status, body);

  return response;
}
