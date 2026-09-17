/**
 * Simple in-memory token bucket rate limiter.
 * No external dependencies (KISS/YAGNI). Swap for Redis-backed later if needed.
 */

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const staleThreshold = now - 60 * 1000;
  for (const [key, entry] of store) {
    if (entry.lastRefill < staleThreshold) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
}

export const RATE_LIMITS = {
  auth: { maxTokens: 5, refillRate: 5 / 60 } satisfies RateLimitConfig,
  login: { maxTokens: 10, refillRate: 10 / 60 } satisfies RateLimitConfig,
  chat: { maxTokens: 30, refillRate: 30 / 60 } satisfies RateLimitConfig,
  default: { maxTokens: 100, refillRate: 100 / 60 } satisfies RateLimitConfig,
};

/**
 * Check if a request should be rate limited.
 * Returns { allowed: true } or { allowed: false, retryAfterMs }.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  cleanup();

  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { tokens: config.maxTokens, lastRefill: now };
    store.set(key, entry);
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - entry.lastRefill) / 1000;
  entry.tokens = Math.min(config.maxTokens, entry.tokens + elapsed * config.refillRate);
  entry.lastRefill = now;

  if (entry.tokens >= 1) {
    entry.tokens -= 1;
    return { allowed: true };
  }

  const deficit = 1 - entry.tokens;
  const retryAfterMs = Math.ceil((deficit / config.refillRate) * 1000);
  return { allowed: false, retryAfterMs };
}

/**
 * The address every rate limit is counted against.
 *
 * Take the LAST `X-Forwarded-For` hop, never the first. Caddy sits in front and
 * APPENDS the real peer address to whatever header arrived, so the rightmost
 * entry is the only one we wrote — every entry to its left is a string the
 * caller typed. Reading `[0]` meant a caller could send a different leading
 * value on each request, land in a fresh bucket every time and never be
 * limited. It lives here rather than in middleware.ts so a test can reach it.
 */
export function getClientIp(req: { headers: Headers }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Get the rate limit config for a given pathname.
 */
export function getRateLimitConfig(pathname: string): RateLimitConfig {
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
