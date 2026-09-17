import { slidingWindow, clientIp, MemoryStore, toHeaders, type Limiter } from "limitkit";

/**
 * Rate limiting — the algorithm is owned by `limitkit` (see fleet/SHARED.md),
 * the numbers are ours.
 *
 * The hand-rolled token bucket this replaced kept an unbounded Map keyed by
 * client IP: every stranger who ever hit the site left an entry until the
 * process restarted. limitkit's MemoryStore is bounded (LRU past 5 000 keys),
 * so that leak is impossible by construction.
 *
 * Keep this a shim. A local re-implementation "just for one tweak" is how the
 * shared version becomes the stale version.
 */

export type { LimitResult } from "limitkit";

const MINUTE_MS = 60_000;

export interface RateLimitRule {
  /** Max requests inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/**
 * How many requests each surface allows. App semantics — deliberately local;
 * limitkit ships no limit values.
 */
export const RATE_LIMITS = {
  /** Registration and password reset: they send email, so they stay tight. */
  auth: { limit: 5, windowMs: MINUTE_MS } satisfies RateLimitRule,
  login: { limit: 10, windowMs: MINUTE_MS } satisfies RateLimitRule,
  chat: { limit: 30, windowMs: MINUTE_MS } satisfies RateLimitRule,
  default: { limit: 100, windowMs: MINUTE_MS } satisfies RateLimitRule,
};

const store = new MemoryStore();

/** One limiter per distinct rule; the rules are a handful of constants. */
const limiters = new Map<string, Limiter>();

function limiterFor(rule: RateLimitRule): Limiter {
  const ruleKey = `${rule.limit}/${rule.windowMs}`;
  let limiter = limiters.get(ruleKey);
  if (!limiter) {
    limiter = slidingWindow(rule, store);
    limiters.set(ruleKey, limiter);
  }
  return limiter;
}

/**
 * Count a request against `key` and say whether it may proceed.
 * The key is namespaced by the caller (`"<ip>:<pathname>"`).
 */
export function checkRateLimit(key: string, rule: RateLimitRule) {
  return limiterFor(rule).check(key);
}

/** The rule that applies to a pathname. */
export function getRateLimitConfig(pathname: string): RateLimitRule {
  // Strict auth limits: registration and password-reset trigger side-effects (email)
  if (pathname === "/register" || pathname === "/forgot-password") {
    return RATE_LIMITS.auth;
  }
  if (pathname === "/login" || pathname.startsWith("/api/auth/callback")) {
    return RATE_LIMITS.login;
  }
  if (pathname.startsWith("/api/chat")) {
    return RATE_LIMITS.chat;
  }
  return RATE_LIMITS.default;
}

/**
 * Who to count this request against.
 *
 * A reverse proxy APPENDS to `X-Forwarded-For`, so the header reads
 * `<what the client sent>, <what the proxy saw>` and only the LAST hop is
 * unforgeable. This used to read the first one, which meant a caller could
 * send a random `X-Forwarded-For` per request, mint a fresh bucket every time
 * and never trip the limit at all. One proxy (Caddy) sits in front of this
 * app, which is limitkit's default `trustedProxies: 1`.
 */
export function getClientIp(headers: Headers): string {
  return clientIp(headers);
}

export { toHeaders };
