/**
 * The chain must advance on the failure it exists to survive.
 *
 * `createProviderWithFallback` advances on `validateConnection()` — a
 * `GET /models` probe. That is a chain in shape only: it selects a vendor by
 * asking "can I list your models?" and then makes exactly ONE `chat()` call, so
 * a 429, a retired model id, or a 200 with empty content ends the whole thing
 * with a healthy chain sitting underneath, untried.
 *
 * Every test here therefore drives its failure through the COMPLETION, never
 * through the probe. A test that made `/models` fail would pass against the old
 * code too, and prove nothing about the change.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { chatWithFallback } from "../providers";

const ENV = { GROQ_API_KEY: "gsk_test", OPENROUTER_API_KEY: "sk-or-test" };

const REQUEST = {
  messages: [{ role: "user" as const, content: "hello" }],
  systemPrompt: "be brief",
  maxTokens: 100,
};

function completion(content: string) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }], model: "m", usage: {} }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

let fetchMock: ReturnType<typeof vi.fn>;

/** Which vendor each chat POST went to, in order. `/models` probes excluded. */
function chatVendors() {
  return fetchMock.mock.calls
    .filter(([url]) => String(url).includes("/chat/completions"))
    .map(([url]) => (String(url).includes("groq") ? "groq" : "openrouter"));
}

beforeEach(() => {
  fetchMock = vi.fn(async () => completion("hi"));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("chatWithFallback", () => {
  it("returns the first provider that actually answers", async () => {
    const { response, providerId } = await chatWithFallback(ENV, REQUEST);

    expect(response.content).toBe("hi");
    expect(providerId).toBe("groq");
  });

  it("never probes GET /models — the completion IS the probe", async () => {
    await chatWithFallback(ENV, REQUEST);

    // The audition cost an extra round trip on every single call, to answer a
    // question the completion was about to answer properly.
    const probes = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/models"));
    expect(probes).toHaveLength(0);
  });

  it("a 429 on the REAL call demotes to the next vendor", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes("groq")) {
        return new Response("rate limit exceeded", { status: 429 });
      }
      return completion("openrouter answered");
    });

    const { response, providerId } = await chatWithFallback(ENV, REQUEST);

    // This is the case the audition could not survive: Groq's /models endpoint
    // is perfectly fine, so it passed selection, and its single chat() call was
    // the end of the road.
    expect(response.content).toBe("openrouter answered");
    expect(providerId).toBe("openrouter");
    expect(chatVendors()).toEqual(["groq", "openrouter"]);
  });

  it("a 200 with EMPTY content demotes — it is not an answer", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      String(url).includes("groq") ? completion("") : completion("openrouter answered"),
    );

    const { response, providerId } = await chatWithFallback(ENV, REQUEST);

    // `content || ""` used to hand this back as the model's reply, so a caller
    // stored it, showed it, or dropped to a regex fallback with no error to
    // explain why.
    expect(response.content).toBe("openrouter answered");
    expect(providerId).toBe("openrouter");
  });

  it("every vendor failing names EVERY failure, not just the last", async () => {
    fetchMock.mockImplementation(async () => new Response("boom", { status: 500 }));

    let message = "";
    try {
      await chatWithFallback(ENV, REQUEST);
    } catch (e) {
      message = e instanceof Error ? e.message : String(e);
    }

    // "the key is dead" and "one model id rotted" are different problems that
    // read identically when only the final failure survives.
    expect(message).toMatch(/groq/);
    expect(message).toMatch(/openrouter/);
  });

  it("still refuses to reach a paid link without ALLOW_PAID_AI", async () => {
    await expect(chatWithFallback({ ANTHROPIC_API_KEY: "sk-ant-test" }, REQUEST)).rejects.toThrow();

    // A fallback is a reliability mechanism; paying is a business decision.
    // Walking the real call must not have quietly widened what the chain may
    // reach when the free links are gone.
    expect(chatVendors()).toHaveLength(0);
  });
});
