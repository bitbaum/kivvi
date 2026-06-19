import { describe, it, expect } from "vitest";
import { retryDelayMs } from "../domain/webhooks";

// Webhook delivery retries with a fixed backoff schedule (1m, 5m, 30m, 2h, 8h
// tiers) and abandons after MAX_ATTEMPTS. `retryDelayMs(attempt)` is the pure
// core of that schedule: the delay to wait AFTER a 1-indexed attempt, or null
// when the delivery should be abandoned.
//
// Regression guard: the retry loop previously indexed RETRY_DELAYS_MS[attempt]
// (0-indexed) while the initial dispatch used RETRY_DELAYS_MS[0] for attempt 1.
// That skipped the 5m tier entirely and waited one tier too long on every
// retry (realized 1m→30m→2h→8h instead of 1m→5m→30m→2h). These tests pin the
// corrected sequential schedule.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

describe("retryDelayMs", () => {
  it("waits 1 minute after the initial attempt (attempt 1)", () => {
    expect(retryDelayMs(1)).toBe(1 * MINUTE);
  });

  it("waits 5 minutes after attempt 2 (the tier the old code skipped)", () => {
    expect(retryDelayMs(2)).toBe(5 * MINUTE);
  });

  it("waits 30 minutes after attempt 3", () => {
    expect(retryDelayMs(3)).toBe(30 * MINUTE);
  });

  it("waits 2 hours after attempt 4", () => {
    expect(retryDelayMs(4)).toBe(2 * HOUR);
  });

  it("abandons after the final attempt (attempt 5 → null)", () => {
    expect(retryDelayMs(5)).toBeNull();
  });

  it("never returns a delay beyond the final attempt", () => {
    expect(retryDelayMs(6)).toBeNull();
    expect(retryDelayMs(100)).toBeNull();
  });

  it("guards against non-positive attempt numbers", () => {
    expect(retryDelayMs(0)).toBeNull();
    expect(retryDelayMs(-1)).toBeNull();
  });

  it("produces a strictly increasing backoff across the reachable attempts", () => {
    const delays = [1, 2, 3, 4].map((a) => retryDelayMs(a) as number);
    const sorted = [...delays].sort((a, b) => a - b);
    expect(delays).toEqual(sorted);
    // Each step is strictly longer than the previous (monotonic backoff).
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1]);
    }
  });
});
