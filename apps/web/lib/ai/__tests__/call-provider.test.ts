/**
 * `callAIProvider` used to pick a single provider (first with a key present)
 * and throw on that provider's first failure — no retry to the next vendor,
 * and nothing recorded to the health tracker either way. That made
 * `form-assist` a single point of failure and `ai-extract` drop to its regex
 * fallback on one vendor's hiccup, both invisible to `/api/health`.
 *
 * This pins the replacement behaviour: `callAIProvider` delegates to
 * `chatWithFallback` and reports every outcome to the shared health tracker.
 *
 * It used to delegate to `createProviderWithFallback`, which advances on a
 * `GET /models` probe and then makes ONE `chat()` call — a chain in shape that
 * could not survive a 429, a retired model id, or a 200 with empty content.
 * These tests mock the walker, so what they hold is the WIRING; the walk itself
 * is tested in @kivvi/ai.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const chatWithFallback = vi.fn();
const recordAIHealthSuccess = vi.fn();
const recordAIHealthFailure = vi.fn();

vi.mock("@kivvi/ai", () => ({
  chatWithFallback: (...args: unknown[]) => chatWithFallback(...args),
  recordAIHealthSuccess: (...args: unknown[]) => recordAIHealthSuccess(...args),
  recordAIHealthFailure: (...args: unknown[]) => recordAIHealthFailure(...args),
}));

const ENV_KEYS = [
  "GROQ_API_KEY",
  "XAI_API_KEY",
  "OPENROUTER_API_KEY",
  "ANTHROPIC_API_KEY",
  "OLLAMA_BASE_URL",
  "ALLOW_PAID_AI",
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const key of ENV_KEYS) delete process.env[key];
  chatWithFallback.mockReset();
  recordAIHealthSuccess.mockReset();
  recordAIHealthFailure.mockReset();
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe("isAIConfigured", () => {
  it("is false with no keys and no Ollama URL", async () => {
    const { isAIConfigured } = await import("../call-provider");
    expect(isAIConfigured()).toBe(false);
  });

  it("is true once any free provider key is present", async () => {
    process.env.GROQ_API_KEY = "gsk_test";
    const { isAIConfigured } = await import("../call-provider");
    expect(isAIConfigured()).toBe(true);
  });

  it("ignores a bare Anthropic key — paid requires ALLOW_PAID_AI", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    const { isAIConfigured } = await import("../call-provider");
    expect(isAIConfigured()).toBe(false);
  });

  it("counts Anthropic once ALLOW_PAID_AI is set", async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.ALLOW_PAID_AI = "1";
    const { isAIConfigured } = await import("../call-provider");
    expect(isAIConfigured()).toBe(true);
  });
});

describe("callAIProvider", () => {
  it("returns null without calling the chain when nothing is configured", async () => {
    const { callAIProvider } = await import("../call-provider");
    const result = await callAIProvider("system", "user text");
    expect(result).toBeNull();
    expect(chatWithFallback).not.toHaveBeenCalled();
  });

  it("routes through chatWithFallback and returns the completion", async () => {
    process.env.GROQ_API_KEY = "gsk_test";
    chatWithFallback.mockResolvedValue({
      response: { content: "hello", model: "llama-test" },
      providerId: "groq",
      modelId: "llama-test",
    });

    const { callAIProvider } = await import("../call-provider");
    const result = await callAIProvider("system prompt", "user text", 500);

    expect(result).toBe("hello");
    // No `model` here on purpose: the chain owns model selection, and naming
    // one at this call site would pin a single id in the one place a rotted id
    // takes the whole feature down.
    expect(chatWithFallback).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        systemPrompt: "system prompt",
        messages: [{ role: "user", content: "user text" }],
        maxTokens: 500,
      }),
    );
    expect(recordAIHealthSuccess).toHaveBeenCalledTimes(1);
    expect(recordAIHealthFailure).not.toHaveBeenCalled();
  });

  it("only throws once the WHOLE chain is exhausted, and records the failure", async () => {
    process.env.GROQ_API_KEY = "gsk_test";
    const chainError = new Error(
      "No AI provider answered. Tried: groq: 429; xai: 429; openrouter: 429",
    );
    chatWithFallback.mockRejectedValue(chainError);

    const { callAIProvider } = await import("../call-provider");
    await expect(callAIProvider("system", "user text")).rejects.toThrow(chainError);

    expect(recordAIHealthFailure).toHaveBeenCalledWith(chainError);
    expect(recordAIHealthSuccess).not.toHaveBeenCalled();
  });

  it("reports a mid-chat failure to the health tracker too", async () => {
    process.env.GROQ_API_KEY = "gsk_test";
    const chatError = new Error("stream errored");
    chatWithFallback.mockRejectedValue(chatError);

    const { callAIProvider } = await import("../call-provider");
    await expect(callAIProvider("system", "user text")).rejects.toThrow(chatError);
    expect(recordAIHealthFailure).toHaveBeenCalledWith(chatError);
  });
});
