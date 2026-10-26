import { clientIp, slidingWindow, type LimitRule, type Limiter } from "limitkit";

export type RateLimitConfig = LimitRule;

// Limits and route policy stay Kivvi-owned; limitkit owns the shared window
// algorithm, bounded in-memory store, and trusted-proxy parsing.
export const RATE_LIMITS = {
  auth: { limit: 5, windowMs: 60_000 },
  login: { limit: 10, windowMs: 60_000 },
  chat: { limit: 30, windowMs: 60_000 },
  default: { limit: 100, windowMs: 60_000 },
} satisfies Record<string, RateLimitConfig>;

const limiters = new Map<string, Limiter>();

function limiterFor(config: RateLimitConfig): Limiter {
  const key = `${config.limit}:${config.windowMs}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = slidingWindow(config);
    limiters.set(key, limiter);
  }
  return limiter;
}

/** Package-backed, bounded sliding-window decision for Kivvi's route limits. */
export function checkRateLimit(key: string, config: RateLimitConfig, now = Date.now()) {
  return limiterFor(config).check(key, now);
}

/** Caddy appends the trusted peer hop; limitkit selects that hop safely. */
export function getClientIp(req: { headers: Headers }): string {
  return clientIp(req.headers, { trustedProxies: 1 });
}

/** Route classes and their numeric budgets remain product policy. */
export function getRateLimitConfig(pathname: string): RateLimitConfig {
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
