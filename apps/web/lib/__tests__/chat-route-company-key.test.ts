import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sealCompanyAiKey } from "../security/company-ai-key-crypto";

/**
 * The chat route with a company that chose its own AI key: it is served by
 * that key or refused — never by the shared provider keys.
 */

const COMPANY = "11111111-1111-4111-8111-111111111111";
const KEY = "gsk_not_a_real_key_abcd1234";

const state = vi.hoisted(() => ({
  role: "admin",
  settings: {} as Record<string, unknown>,
  createProviderWithFallback: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: async () => ({
    user: { id: "user-1", companyId: COMPANY, role: state.role, name: "A", companyName: "C" },
  }),
}));

vi.mock("@/lib/db", () => {
  const chain = () => ({ values: () => ({ returning: async () => [{ id: "conv-1" }] }) });
  return {
    db: {
      insert: vi.fn(chain),
      update: vi.fn(() => ({
        set: () => ({ where: () => ({ returning: async () => [{ id: COMPANY }] }) }),
      })),
      query: { aiConversations: { findFirst: vi.fn() }, aiMessages: { findMany: vi.fn() } },
    },
  };
});

vi.mock("@kivvi/core/src/domain/companies", () => ({
  getCompanySettings: async () => ({ ...state.settings }),
}));

vi.mock("@kivvi/core", () => ({
  fetchBusinessSnapshot: vi.fn(),
  getInventoryDashboard: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

vi.mock("@kivvi/ai", () => ({
  ConversationEngine: class {
    async *streamMessage() {
      yield { type: "done" };
    }
  },
  createProviderWithFallback: state.createProviderWithFallback,
  getToolsForPermissions: () => [],
  getBusinessSnapshot: async () => ({}),
  getPermissionsForRole: () => [],
  COMMAND_BAR_PROMPT: "",
  recordAIHealthSuccess: vi.fn(),
  recordAIHealthFailure: vi.fn(),
}));

async function postChat(body: Record<string, unknown> = {}) {
  const { POST } = await import("@/app/api/chat/route");
  const { NextRequest } = await import("next/server");
  return POST(
    new NextRequest("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: "Wie läuft das Geschäft?", mode: "command", ...body }),
    }),
  );
}

describe("chat with the company's own AI key", () => {
  beforeEach(() => {
    vi.stubEnv("INTEGRATION_SECRET", "test-integration-secret-0123");
    vi.stubEnv("GROQ_API_KEY", "shared-groq-key");
    vi.stubEnv("XAI_API_KEY", "shared-xai-key");
    state.role = "admin";
    state.createProviderWithFallback.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("refuses an unreadable key without ever building a provider", async () => {
    state.settings = { aiProvider: "groq", aiApiKey: sealCompanyAiKey(COMPANY, KEY) };
    vi.stubEnv("INTEGRATION_SECRET", "a-different-secret-987654");

    const response = await postChat();
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "COMPANY_AI_KEY",
      problem: "unreadable",
      canFix: true,
    });
    expect(state.createProviderWithFallback).not.toHaveBeenCalled();
  });

  it("tells a non-admin they cannot fix it", async () => {
    state.role = "member";
    state.settings = { aiApiKey: sealCompanyAiKey(COMPANY, KEY) }; // key set, no provider
    const response = await postChat();
    expect(await response.json()).toMatchObject({ problem: "noProvider", canFix: false });
  });

  it("refuses when the provider rejects the key, and offers it no shared fallback", async () => {
    state.settings = { aiProvider: "groq", aiApiKey: sealCompanyAiKey(COMPANY, KEY) };
    state.createProviderWithFallback.mockRejectedValue(
      new Error("No AI provider available. Tried: groq: Groq: API key invalid (401)"),
    );

    const response = await postChat({ providerId: "xai" });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ problem: "rejected" });

    const [env, preferred] = state.createProviderWithFallback.mock.calls[0];
    expect(env).toEqual({}); // no shared key in the chain
    expect(preferred).toMatchObject({ type: "groq", apiKey: KEY }); // the picker cannot switch accounts
  });

  it("uses the shared chain for a company without its own key", async () => {
    state.settings = { aiProvider: "groq" };
    state.createProviderWithFallback.mockResolvedValue({
      provider: {},
      providerId: "groq",
      modelId: "m",
    });

    const response = await postChat();
    expect(response.status).toBe(200);
    const [env, preferred] = state.createProviderWithFallback.mock.calls[0];
    expect(env).toMatchObject({ GROQ_API_KEY: "shared-groq-key" });
    expect(preferred).toMatchObject({ type: "groq", apiKey: "shared-groq-key" });
  });
});
