import { describe, it, expect } from "vitest";
import { getClientIp, getRateLimitConfig, checkRateLimit, RATE_LIMITS } from "../rate-limit";

/**
 * The bug this file exists to prevent: keying the limiter on the FIRST
 * `X-Forwarded-For` hop. A reverse proxy appends, so the first entry is
 * whatever the client sent — vary it per request and every request gets a
 * fresh bucket, so the limit can never be reached. Four sibling repos shipped
 * that. The last hop is the one Caddy wrote, and the only one a caller cannot
 * forge.
 */
describe("getClientIp", () => {
  it("takes the last forwarded hop, not the client-controlled first one", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" });
    expect(getClientIp(headers)).toBe("203.0.113.9");
  });

  it("cannot be steered by a spoofed leading entry", () => {
    const spoofed = new Headers({
      "x-forwarded-for": "attacker-picked-value, 203.0.113.9",
    });
    const alsoSpoofed = new Headers({
      "x-forwarded-for": "another-random-value, 203.0.113.9",
    });
    expect(getClientIp(spoofed)).toBe(getClientIp(alsoSpoofed));
  });

  it("falls back to x-real-ip, then to a shared anonymous bucket", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});

describe("getRateLimitConfig", () => {
  it("keeps side-effecting auth routes on the tightest rule", () => {
    expect(getRateLimitConfig("/register")).toBe(RATE_LIMITS.auth);
    expect(getRateLimitConfig("/forgot-password")).toBe(RATE_LIMITS.auth);
  });

  it("routes login, chat and everything else to their own rules", () => {
    expect(getRateLimitConfig("/login")).toBe(RATE_LIMITS.login);
    expect(getRateLimitConfig("/api/auth/callback/credentials")).toBe(RATE_LIMITS.login);
    expect(getRateLimitConfig("/api/chat")).toBe(RATE_LIMITS.chat);
    expect(getRateLimitConfig("/dashboard")).toBe(RATE_LIMITS.default);
  });
});

describe("checkRateLimit", () => {
  it("allows up to the rule's limit and then refuses with an honest retry time", () => {
    const rule = { limit: 3, windowMs: 60_000 };
    const key = `test-${Math.random()}`;

    expect(checkRateLimit(key, rule).allowed).toBe(true);
    expect(checkRateLimit(key, rule).allowed).toBe(true);
    expect(checkRateLimit(key, rule).allowed).toBe(true);

    const refused = checkRateLimit(key, rule);
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBeGreaterThan(0);
    expect(refused.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("counts separate keys separately", () => {
    const rule = { limit: 1, windowMs: 60_000 };
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    expect(checkRateLimit(a, rule).allowed).toBe(true);
    expect(checkRateLimit(b, rule).allowed).toBe(true);
    expect(checkRateLimit(a, rule).allowed).toBe(false);
  });
});
