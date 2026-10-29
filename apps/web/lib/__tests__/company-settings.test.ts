import { describe, expect, it } from "vitest";
import { AI_KEY_MASK, redactCompanySettings } from "../security/company-settings";

describe("company settings sent to a client", () => {
  it("never carries the company's AI key, only that one is set", () => {
    const stored = { aiProvider: "openai", aiApiKey: "sk-synthetic-secret", defaultVatRate: 8.1 };
    const safe = redactCompanySettings(stored as never);
    expect(safe.aiApiKey).toBe(AI_KEY_MASK);
    expect(JSON.stringify(safe)).not.toContain("sk-synthetic-secret");
    expect(safe.defaultVatRate).toBe(8.1);
    expect(stored.aiApiKey).toBe("sk-synthetic-secret");
  });

  it("leaves settings without a key alone", () => {
    expect(redactCompanySettings({ aiProvider: "openai" } as never).aiApiKey).toBeUndefined();
    expect(redactCompanySettings(null)).toEqual({});
  });
});
