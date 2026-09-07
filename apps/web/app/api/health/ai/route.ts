import { aiLivenessHandler } from "@kivvi/ai";

export const dynamic = "force-dynamic";

/**
 * Can the AI answer RIGHT NOW?
 *
 *   GET /api/health/ai            free. What the last real call did.
 *   GET /api/health/ai?probe=1    a real call. Needs AI_PROBE_SECRET, via the
 *                                 `x-probe-secret` header or `?secret=`.
 *
 * Separate from /api/health on purpose, because the two have OPPOSITE
 * contracts. That route feeds load balancers and restart decisions, so a dead
 * provider key must never fail it — a restart cannot fix a key. This one is 200
 * only when a model actually answered and 503 when the chain could not, so an
 * uptime monitor can watch this URL and page on a real AI outage without paging
 * on every deploy.
 *
 * Why it exists at all: every AI route in this app is behind a session — chat,
 * form assist, extraction — so checking whether the provider chain worked meant
 * signing in as a real user and typing at it. A deploy was either exercised by
 * a customer or it was not checked.
 *
 * The probe calls `chatWithFallback`, the same function those features use, so
 * it cannot drift away from the path it vouches for.
 */
export const GET = aiLivenessHandler;
