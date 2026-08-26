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
  GROQ_DEFAULT_MODEL,
  GroqProvider,
  OpenRouterProvider,
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

  it("is free by its COST, not merely by its spelling", () => {
    // The suffix can be typed; a zero has to be meant. A `:free` id whose cost
    // fields are non-zero is either a mislabelled entry or a paid twin renamed,
    // and both bill the same way.
    const model = new OpenRouterProvider("").models.find(
      (m) => m.id === OPENROUTER_FALLBACK_MODEL,
    );
    expect(model).toBeDefined();
    expect(model!.costPer1kInput).toBe(0);
    expect(model!.costPer1kOutput).toBe(0);
  });

  it("can actually call tools, which is what the assistant does", () => {
    // The retired free id here, `meta-llama/llama-3.2-3b-instruct:free`, was
    // ALSO `supportsTools: false`. Kivvi's assistant is a tool loop, so the
    // free tier was doubly unusable: gone, and useless if it came back.
    const model = new OpenRouterProvider("").models.find(
      (m) => m.id === OPENROUTER_FALLBACK_MODEL,
    );
    expect(model!.supportsTools).toBe(true);
  });
});

/**
 * One registry, and no id written down twice.
 *
 * Both halves of this repo carried their own copies of Groq and OpenRouter
 * model ids — `packages/ai` in the provider classes, `apps/web` inline in the
 * request bodies of `call-provider.ts`. Every copy was retired by its vendor
 * and none was updated, because a duplicate is only ever noticed by whoever
 * edits the other one.
 */
describe("the model registry is the only source of ids", () => {
  it("exports a Groq default that the Groq provider actually offers", () => {
    const ids = new GroqProvider("").models.map((m) => m.id);
    expect(ids).toContain(GROQ_DEFAULT_MODEL);
  });

  it("exports an OpenRouter fallback that the OpenRouter provider offers", () => {
    const ids = new OpenRouterProvider("").models.map((m) => m.id);
    expect(ids).toContain(OPENROUTER_FALLBACK_MODEL);
  });

  it("carries no id from the llama-3.x family Groq retired", () => {
    // Every id this repo had from that family is now dead. Naming the family
    // rather than the individual ids is deliberate: the failure was a whole
    // lineage being withdrawn at once, not one model being deprecated.
    const ids = [
      ...new GroqProvider("").models.map((m) => m.id),
      ...new OpenRouterProvider("").models.map((m) => m.id),
    ];
    const retired = ids.filter((id) => /llama-3\.\d/i.test(id));
    expect(retired).toEqual([]);
  });

  it("offers at least one free model per free-tier vendor", () => {
    // A vendor listed with nothing free is not a free-tier fallback, it is a
    // bill waiting for the tier above it to run out.
    for (const provider of [new GroqProvider(""), new OpenRouterProvider("")]) {
      const free = provider.models.filter(
        (m) => m.costPer1kInput === 0 && m.costPer1kOutput === 0,
      );
      expect(free.length).toBeGreaterThan(0);
    }
  });
});
