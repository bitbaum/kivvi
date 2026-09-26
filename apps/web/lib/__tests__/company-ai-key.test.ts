import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { probeByokKey } from "@bitbaum/ai-kit/byok-probe";
import { checkCompanyAiKey, openCompanyAiKey, sealCompanyAiKey } from "../company-ai-key";

type Probe = typeof probeByokKey;
const KEY = "gsk_not_a_real_key_abcd1234";

const probeSaying = (result: Awaited<ReturnType<Probe>>): Probe => vi.fn(async () => result);
const works = (models: string[] = [], suggested: string | null = null) =>
  probeSaying({ ok: true, status: 200, message: "Works.", models, suggested });

/**
 * The company AI key: a key the provider refuses is never saved, and a saved
 * key is not the key in the clear.
 */
describe("checkCompanyAiKey", () => {
  it("refuses a key the provider rejects, in the provider's words", async () => {
    const probe = probeSaying({
      ok: false,
      status: 401,
      message: "Groq says: Invalid API Key.",
      models: [],
      suggested: null,
    });
    expect(await checkCompanyAiKey("groq", KEY, null, probe)).toEqual({
      ok: false,
      message: "Groq says: Invalid API Key.",
    });
  });

  it("refuses a model the key cannot use, and names one it can", async () => {
    const verdict = await checkCompanyAiKey(
      "groq",
      KEY,
      "made-up-model",
      works(["openai/gpt-oss-120b"], "openai/gpt-oss-120b"),
    );
    expect(verdict.ok).toBe(false);
    expect(!verdict.ok && verdict.message).toContain("openai/gpt-oss-120b");
  });

  it("accepts a working key and a model it lists", async () => {
    expect(
      await checkCompanyAiKey("groq", KEY, "openai/gpt-oss-120b", works(["openai/gpt-oss-120b"])),
    ).toEqual({ ok: true });
  });

  it("needs to know whose key it is", async () => {
    const probe = works();
    expect((await checkCompanyAiKey(null, KEY, null, probe)).ok).toBe(false);
    expect(probe).not.toHaveBeenCalled();
  });

  it("does not probe Ollama, which takes no key", async () => {
    const probe = works();
    expect(await checkCompanyAiKey("ollama", KEY, null, probe)).toEqual({ ok: true });
    expect(probe).not.toHaveBeenCalled();
  });
});

describe("company AI key at rest", () => {
  beforeEach(() => vi.stubEnv("INTEGRATION_SECRET", "test-integration-secret-0123"));
  afterEach(() => vi.unstubAllEnvs());

  it("stores the key encrypted and reads it back", () => {
    const stored = sealCompanyAiKey(KEY);
    expect(stored).not.toContain(KEY);
    expect(openCompanyAiKey(stored)).toBe(KEY);
  });

  it("still reads a key saved before encryption", () => {
    expect(openCompanyAiKey(KEY)).toBe(KEY);
  });

  it("reads an undecryptable key as no key", () => {
    const stored = sealCompanyAiKey(KEY);
    vi.stubEnv("INTEGRATION_SECRET", "a-different-secret-987654");
    expect(openCompanyAiKey(stored)).toBeUndefined();
  });
});
