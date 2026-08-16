/**
 * The fallback chain must never silently start spending money.
 *
 * This is pinned as a test rather than trusted to review because the paid path
 * is invisible in normal operation: it is only reached when the free providers
 * are gone, which is exactly when nobody is watching. The chain previously
 * ENDED at Anthropic with a paid model, and its OpenRouter link defaulted to
 * `google/gemini-2.0-flash-001` — the paid twin of a free id, one token apart.
 *
 * A fallback is a reliability mechanism; paying is a business decision. Wiring
 * the second to the first lets an outage make the decision.
 */
import { describe, it, expect } from "vitest";

import {
  createProviderWithFallback,
  OPENROUTER_FALLBACK_MODEL,
} from "../providers";

describe("free-first fallback chain", () => {
  it("does NOT reach Anthropic when only its key is present", async () => {
    // The shape that used to bill: no free provider configured, an Anthropic key
    // sitting in the environment "just in case". That must now be a refusal, not
    // an invoice.
    await expect(
      createProviderWithFallback({ ANTHROPIC_API_KEY: "sk-ant-test" }),
    ).rejects.toThrow();
  });

  it("names WHY the paid link was skipped, so the refusal is diagnosable", async () => {
    // "No provider available" with no reason sends the reader hunting for a
    // missing key that is in fact present and deliberately unused.
    let message = "";
    try {
      await createProviderWithFallback({ ANTHROPIC_API_KEY: "sk-ant-test" });
    } catch (e) {
      message = e instanceof Error ? e.message : String(e);
    }
    expect(message).toMatch(/ALLOW_PAID_AI/);
  });

  it("still allows Anthropic when it is explicitly opted into", async () => {
    // Refusing to spend is the default, not a prohibition — the escape hatch has
    // to work or someone will hardcode around it.
    let message = "";
    try {
      await createProviderWithFallback({
        ANTHROPIC_API_KEY: "sk-ant-test",
        ALLOW_PAID_AI: "1",
      });
    } catch (e) {
      message = e instanceof Error ? e.message : String(e);
    }
    // It may still fail (the key is fake and validateConnection runs), but it
    // must NOT have been skipped for being paid.
    expect(message).not.toMatch(/skipped \(paid/);
  });

  it("lands on a FREE OpenRouter id, not its paid twin", () => {
    // Asserted against the VALUE, not this file's source text. The first
    // version of this test grepped the function body and failed on the COMMENT
    // naming the old paid id — a guard that reads source instead of behaviour
    // reports on prose, which is how one ends up vouching for nothing.
    expect(OPENROUTER_FALLBACK_MODEL).toMatch(/:free$/);
  });
});
