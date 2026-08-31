/**
 * Observed health of `createProviderWithFallback` — the chain `/api/chat`
 * actually uses (see `call-provider.ts`'s docstring for the other,
 * deliberately non-chaining picker this does NOT cover).
 *
 * `apps/web/app/api/health` only ever checked the database. This fleet has
 * already lost an AI feature to exactly that blind spot once — a friendly
 * fallback answer and a database-only health check that kept reporting
 * "healthy" the whole time an app's only key was dead. `/api/chat` already
 * has good behaviour when every provider fails (`buildProviderFailureFallback`
 * degrades to live business metrics instead of a bare error) — what it
 * lacked was anything recording that this happened, for `/api/health` to see.
 *
 * Deliberately in-process — apps/web runs as a single Next.js service, so
 * module state is shared by every request. If it is ever scaled
 * horizontally this becomes per-instance and wants a shared store.
 */

import { createHealthTracker } from "ai-kit";

const tracker = createHealthTracker({ downAfter: 3 });

/** Call after a chat turn that got a real answer from a provider. */
export function recordAIHealthSuccess(): void {
  tracker.recordSuccess();
}

/** Call when provider selection failed, or the stream errored before completion. */
export function recordAIHealthFailure(error: unknown): void {
  tracker.recordFailure(error);
}

export function getAIHealth() {
  const health = tracker.getHealth();
  return {
    status: health.status,
    consecutiveFailures: health.consecutiveFailures,
    lastError: health.lastError,
    lastSuccessAt: health.lastSuccessAt ? new Date(health.lastSuccessAt).toISOString() : null,
    lastFailureAt: health.lastFailureAt ? new Date(health.lastFailureAt).toISOString() : null,
  };
}

/** Test seam. */
export function resetAIHealth(): void {
  tracker.reset();
}
