import { describe, it, expect, vi, afterEach } from "vitest";
import {
  isPlanActive,
  isTrialing,
  getTrialDaysRemaining,
  getDefaultTrialEnd,
} from "../domain/billing";
import type { CompanySettings } from "@kivvi/database";

// ============================================================================
// HELPERS
// ============================================================================

function makeSettings(
  overrides: Partial<CompanySettings> = {},
): CompanySettings {
  return {
    ...overrides,
  };
}

function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

// ============================================================================
// isPlanActive
// ============================================================================

describe("isPlanActive", () => {
  it("returns true for premium plan with active subscription", () => {
    const settings = makeSettings({
      plan: "premium",
      subscriptionStatus: "active",
    });
    expect(isPlanActive(settings)).toBe(true);
  });

  it("returns false for premium plan with cancelled subscription", () => {
    const settings = makeSettings({
      plan: "premium",
      subscriptionStatus: "cancelled",
    });
    expect(isPlanActive(settings)).toBe(false);
  });

  it("returns false for premium plan without subscription status", () => {
    const settings = makeSettings({
      plan: "premium",
    });
    expect(isPlanActive(settings)).toBe(false);
  });

  it("returns true for free plan with valid trial", () => {
    const settings = makeSettings({
      plan: "free",
      trialEndsAt: daysFromNow(15),
    });
    expect(isPlanActive(settings)).toBe(true);
  });

  it("returns false for free plan with expired trial", () => {
    const settings = makeSettings({
      plan: "free",
      trialEndsAt: daysFromNow(-1),
    });
    expect(isPlanActive(settings)).toBe(false);
  });

  it("returns false for free plan without trial", () => {
    const settings = makeSettings({
      plan: "free",
    });
    expect(isPlanActive(settings)).toBe(false);
  });

  it("returns true when only trial is active (no plan set)", () => {
    const settings = makeSettings({
      trialEndsAt: daysFromNow(10),
    });
    expect(isPlanActive(settings)).toBe(true);
  });

  it("returns false for empty settings", () => {
    const settings = makeSettings({});
    expect(isPlanActive(settings)).toBe(false);
  });

  it("returns true for premium active even if trial is expired", () => {
    const settings = makeSettings({
      plan: "premium",
      subscriptionStatus: "active",
      trialEndsAt: daysFromNow(-30),
    });
    expect(isPlanActive(settings)).toBe(true);
  });
});

// ============================================================================
// isTrialing
// ============================================================================

describe("isTrialing", () => {
  it("returns true when trial end date is in the future", () => {
    const settings = makeSettings({
      trialEndsAt: daysFromNow(15),
    });
    expect(isTrialing(settings)).toBe(true);
  });

  it("returns false when trial end date is in the past", () => {
    const settings = makeSettings({
      trialEndsAt: daysFromNow(-1),
    });
    expect(isTrialing(settings)).toBe(false);
  });

  it("returns false when trialEndsAt is not set", () => {
    const settings = makeSettings({});
    expect(isTrialing(settings)).toBe(false);
  });

  it("returns false when trialEndsAt is undefined", () => {
    const settings = makeSettings({ trialEndsAt: undefined });
    expect(isTrialing(settings)).toBe(false);
  });

  it("returns true for trial ending far in the future", () => {
    const settings = makeSettings({
      trialEndsAt: daysFromNow(365),
    });
    expect(isTrialing(settings)).toBe(true);
  });
});

// ============================================================================
// getTrialDaysRemaining
// ============================================================================

describe("getTrialDaysRemaining", () => {
  it("returns positive number for future trial end", () => {
    const settings = makeSettings({
      trialEndsAt: daysFromNow(15),
    });
    const remaining = getTrialDaysRemaining(settings);
    expect(remaining).toBeGreaterThanOrEqual(14);
    expect(remaining).toBeLessThanOrEqual(16);
  });

  it("returns 0 for expired trial", () => {
    const settings = makeSettings({
      trialEndsAt: daysFromNow(-5),
    });
    expect(getTrialDaysRemaining(settings)).toBe(0);
  });

  it("returns 0 when trialEndsAt is not set", () => {
    const settings = makeSettings({});
    expect(getTrialDaysRemaining(settings)).toBe(0);
  });

  it("returns approximately 30 for trial ending in 30 days", () => {
    const settings = makeSettings({
      trialEndsAt: daysFromNow(30),
    });
    const remaining = getTrialDaysRemaining(settings);
    expect(remaining).toBeGreaterThanOrEqual(29);
    expect(remaining).toBeLessThanOrEqual(31);
  });

  it("returns 1 for trial ending tomorrow", () => {
    const settings = makeSettings({
      trialEndsAt: daysFromNow(1),
    });
    const remaining = getTrialDaysRemaining(settings);
    expect(remaining).toBeGreaterThanOrEqual(0);
    expect(remaining).toBeLessThanOrEqual(1);
  });

  it("never returns negative values", () => {
    const settings = makeSettings({
      trialEndsAt: daysFromNow(-100),
    });
    expect(getTrialDaysRemaining(settings)).toBe(0);
  });
});

// ============================================================================
// getDefaultTrialEnd
// ============================================================================

describe("getDefaultTrialEnd", () => {
  it("returns a valid ISO date string", () => {
    const result = getDefaultTrialEnd();
    expect(() => new Date(result)).not.toThrow();
    expect(new Date(result).toISOString()).toBe(result);
  });

  it("returns a date approximately 30 days from now", () => {
    const result = getDefaultTrialEnd();
    const resultDate = new Date(result);
    const now = new Date();
    const diffMs = resultDate.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    expect(diffDays).toBeGreaterThanOrEqual(29.9);
    expect(diffDays).toBeLessThanOrEqual(30.1);
  });

  it("returns a date in the future", () => {
    const result = getDefaultTrialEnd();
    expect(new Date(result).getTime()).toBeGreaterThan(Date.now());
  });
});
