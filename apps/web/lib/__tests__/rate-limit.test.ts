import { describe, expect, it } from "vitest";
import { RATE_LIMITS, checkRateLimit, getClientIp, getRateLimitConfig } from "../rate-limit";

const reqWith = (headers: Record<string, string>) => ({ headers: new Headers(headers) });

/**
 * The middleware throttle is only as good as its key. Caddy APPENDS the real
 * peer address to X-Forwarded-For, so the rightmost hop is the only one we
 * wrote; everything to its left is caller-supplied. Keying on the first hop
 * handed an attacker a fresh bucket per request.
 */
describe("getClientIp", () => {
  it("takes the last hop, not the caller-supplied first one", () => {
    expect(getClientIp(reqWith({ "x-forwarded-for": "192.0.2.10, 198.51.100.9" }))).toBe(
      "198.51.100.9",
    );
  });

  it("ignores a spoofed leading value: every variation keys the same bucket", () => {
    const keys = ["1.1.1.1", "2.2.2.2", "3.3.3.3"].map((spoofed) =>
      getClientIp(reqWith({ "x-forwarded-for": `${spoofed}, 198.51.100.9` })),
    );

    expect(new Set(keys)).toEqual(new Set(["198.51.100.9"]));
  });

  it("trims whitespace around the trusted hop", () => {
    expect(getClientIp(reqWith({ "x-forwarded-for": "192.0.2.10 ,  198.51.100.9  " }))).toBe(
      "198.51.100.9",
    );
  });

  it("uses a single hop as-is", () => {
    expect(getClientIp(reqWith({ "x-forwarded-for": "198.51.100.9" }))).toBe("198.51.100.9");
  });

  it("falls back to x-real-ip, then to 'unknown'", () => {
    expect(getClientIp(reqWith({ "x-real-ip": "172.16.0.1" }))).toBe("172.16.0.1");
    expect(getClientIp(reqWith({}))).toBe("unknown");
  });
});

/**
 * The bug end-to-end: a caller rotating the leading hop must still exhaust one
 * bucket. Without the fix each request opened a new one and the limit never
 * tripped.
 */
describe("a spoofed leading hop cannot buy extra login attempts", () => {
  it("exhausts the login bucket despite a different leading hop each time", () => {
    const peer = `198.51.100.${Math.floor(Math.random() * 200) + 20}`;
    const config = getRateLimitConfig("/login");
    const verdicts: boolean[] = [];

    for (let i = 0; i <= RATE_LIMITS.login.maxTokens; i++) {
      const ip = getClientIp(reqWith({ "x-forwarded-for": `10.0.0.${i}, ${peer}` }));
      verdicts.push(checkRateLimit(ip, config).allowed);
    }

    expect(verdicts.slice(0, RATE_LIMITS.login.maxTokens)).toEqual(
      Array(RATE_LIMITS.login.maxTokens).fill(true),
    );
    expect(verdicts.at(-1)).toBe(false);
  });
});
