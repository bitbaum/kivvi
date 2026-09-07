/**
 * The probe exists because every AI route in this app is behind a session —
 * chat, form assist, extraction — so "does the provider chain work?" could only
 * be answered by signing in as a real user and typing at it. A deploy was
 * either exercised by a customer or it was not checked.
 *
 * ai-kit owns the gating, the caching and the never-cache-a-failure rule, and
 * tests them there. What is app-specific, and what these hold, is the WIRING:
 * that an ordinary poll is free, that the gate is really connected to
 * AI_PROBE_SECRET, and that the probe walks THIS app's chain rather than a
 * parallel one assembled just for it.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Each test loads the module FRESH.
 *
 * The handler is a module-level singleton (it has to be — the probe's cache
 * lives inside it), and a successful probe is cached for ten minutes. Sharing
 * one instance across tests means the first success answers every later case,
 * so the failure tests would read 200 and pass for the wrong reason. That
 * caching is a safety property worth keeping, not a wrinkle to disable: it is
 * what stops a monitor in a retry loop draining the daily budget.
 */
async function loadHandler() {
  vi.resetModules();
  return (await import("../liveness")).aiLivenessHandler;
}

const ORIGINAL_ENV = { ...process.env };

/** Built PER CALL: one Response body can be read only once. */
function completion(content: string) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content } }], model: "m", usage: {} }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  process.env.GROQ_API_KEY = "gsk_test";
  delete process.env.AI_PROBE_SECRET;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.ALLOW_PAID_AI;
  fetchMock = vi.fn(async () => completion("blue"));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

describe("GET /api/health/ai", () => {
  it("an ordinary poll costs nothing", async () => {
    const handler = await loadHandler();
    const res = await handler(new Request("https://k.test/api/health/ai"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.probed).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses to probe without the secret, and spends nothing while refusing", async () => {
    process.env.AI_PROBE_SECRET = "right";

    const handler = await loadHandler();
    const missing = await handler(new Request("https://k.test/api/health/ai?probe=1"));
    expect(missing.status).toBe(401);

    const wrong = await handler(new Request("https://k.test/api/health/ai?probe=1&secret=nope"));
    expect(wrong.status).toBe(401);

    // The point of the gate is the SPEND, not the status code.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("with AI_PROBE_SECRET unset, probing is OFF (501) rather than open", async () => {
    const handler = await loadHandler();
    const res = await handler(new Request("https://k.test/api/health/ai?probe=1&secret=anything"));

    expect(res.status).toBe(501);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("probes THIS app's chain and reports which link served it", async () => {
    process.env.AI_PROBE_SECRET = "right";

    const handler = await loadHandler();
    const res = await handler(new Request("https://k.test/api/health/ai?probe=1&secret=right"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.answer).toBe("blue");
    expect(body.servedBy).toBe("groq/openai/gpt-oss-120b");
    // The real chain, not a parallel one: the request went to Groq's endpoint.
    expect(String(fetchMock.mock.calls[0][0])).toContain("groq");
  });

  it("a dead chain is 503, so an uptime monitor can watch this URL", async () => {
    process.env.AI_PROBE_SECRET = "right";
    fetchMock.mockImplementation(async () => new Response("boom", { status: 500 }));

    const handler = await loadHandler();
    const res = await handler(new Request("https://k.test/api/health/ai?probe=1&secret=right"));

    expect(res.status).toBe(503);
    expect((await res.json()).ok).toBe(false);
  });

  it("an EMPTY 200 is a failure — the chain returns text, not silence", async () => {
    process.env.AI_PROBE_SECRET = "right";
    fetchMock.mockImplementation(async () => completion(""));

    const handler = await loadHandler();
    const res = await handler(new Request("https://k.test/api/health/ai?probe=1&secret=right"));

    expect(res.status).toBe(503);
  });

  it("one probe teaches /api/health — both stop saying 'unknown'", async () => {
    process.env.AI_PROBE_SECRET = "right";
    vi.resetModules();
    // Same module graph as the handler, or this would read a different
    // tracker instance and always see "unknown".
    const { aiLivenessHandler } = await import("../liveness");
    const { getAIHealth } = await import("../health");

    expect(getAIHealth().status).toBe("unknown");
    await aiLivenessHandler(new Request("https://k.test/api/health/ai?probe=1&secret=right"));
    expect(getAIHealth().status).toBe("ok");
  });

  it("never reaches a PAID link, even unattended", async () => {
    process.env.AI_PROBE_SECRET = "right";
    delete process.env.GROQ_API_KEY;
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    // ALLOW_PAID_AI deliberately unset.

    const handler = await loadHandler();
    const res = await handler(new Request("https://k.test/api/health/ai?probe=1&secret=right"));

    // A probe runs unattended on a schedule — the worst possible context for an
    // unplanned invoice. It must run out rather than fall into a paid vendor.
    expect(res.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
