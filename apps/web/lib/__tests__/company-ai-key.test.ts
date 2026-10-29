import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { probeByokKey } from "@bitbaum/ai-kit/byok-probe";
import {
  checkCompanyAiKey,
  classifyOwnKeyFailure,
  resolveCompanyAiRoute,
  sealStoredCompanyAiKey,
} from "../company-ai-key";
import {
  CURRENT_VERSION,
  isSealedCompanyAiKey,
  openCompanyAiKey,
  resealCompanyAiKey,
  sealCompanyAiKey,
} from "../security/company-ai-key-crypto";
import { encryptIntegrationSecret } from "../integration-secrets";
import {
  AI_SETTINGS_PATH,
  COMPANY_AI_KEY_REFUSAL,
  companyAiKeyRefusalText,
  isCompanyAiKeyRefusal,
} from "../company-ai-key-refusal";
import type { Database } from "@kivvi/database";

type Probe = typeof probeByokKey;
const KEY = "gsk_not_a_real_key_abcd1234";
const COMPANY = "11111111-1111-4111-8111-111111111111";
const OTHER_COMPANY = "22222222-2222-4222-8222-222222222222";

const probeSaying = (result: Awaited<ReturnType<Probe>>): Probe => vi.fn(async () => result);
const works = (models: string[] = [], suggested: string | null = null) =>
  probeSaying({ ok: true, status: 200, message: "Works.", models, suggested });
const fails = (status: number | null, message: string) =>
  probeSaying({ ok: false, status, message, models: [], suggested: null });

/**
 * The company AI key: a key the provider refuses is never saved, a key that
 * cannot be checked right now still is, and a saved key is not the key in the clear.
 */
describe("checkCompanyAiKey", () => {
  it("refuses a key the provider rejects, in the provider's words", async () => {
    expect(
      await checkCompanyAiKey("groq", KEY, null, fails(401, "Groq says: Invalid API Key.")),
    ).toEqual({
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

  it("accepts a working key and a model it lists, as verified", async () => {
    expect(
      await checkCompanyAiKey("groq", KEY, "openai/gpt-oss-120b", works(["openai/gpt-oss-120b"])),
    ).toEqual({ ok: true, verified: true });
  });

  it("saves a key the provider could not be asked about, marked not verified", async () => {
    for (const [status, message] of [
      [null, "Groq could not be reached."],
      [429, "Groq says: rate limited."],
      [503, "Groq says: overloaded."],
    ] as const) {
      expect(await checkCompanyAiKey("groq", KEY, null, fails(status, message))).toEqual({
        ok: true,
        verified: false,
        note: message,
      });
    }
  });

  it("needs to know whose key it is", async () => {
    const probe = works();
    expect((await checkCompanyAiKey(null, KEY, null, probe)).ok).toBe(false);
    expect(probe).not.toHaveBeenCalled();
  });

  it("does not probe Ollama, which takes no key", async () => {
    const probe = works();
    expect(await checkCompanyAiKey("ollama", KEY, null, probe)).toEqual({
      ok: true,
      verified: true,
    });
    expect(probe).not.toHaveBeenCalled();
  });
});

describe("company AI key at rest", () => {
  beforeEach(() => vi.stubEnv("INTEGRATION_SECRET", "test-integration-secret-0123"));
  afterEach(() => vi.unstubAllEnvs());

  it("round-trips: sealed for a company, it opens for that company", () => {
    const stored = sealCompanyAiKey(COMPANY, KEY);
    expect(stored).not.toContain(KEY);
    expect(openCompanyAiKey(COMPANY, stored)).toEqual({ status: "sealed", key: KEY, stale: false });
  });

  it("does not open for another company (the company id is bound in)", () => {
    const stored = sealCompanyAiKey(COMPANY, KEY);
    expect(openCompanyAiKey(OTHER_COMPANY, stored)).toEqual({ status: "unreadable" });
  });

  it("carries a scheme and version prefix, and a fresh IV every time", () => {
    const a = sealCompanyAiKey(COMPANY, KEY);
    const b = sealCompanyAiKey(COMPANY, KEY);
    expect(a.startsWith(`cak:${CURRENT_VERSION}:`)).toBe(true);
    expect(isSealedCompanyAiKey(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it("refuses an unknown version, a tampered value and a malformed one", () => {
    const stored = sealCompanyAiKey(COMPANY, KEY);
    expect(openCompanyAiKey(COMPANY, stored.replace(`cak:${CURRENT_VERSION}:`, "cak:v9:"))).toEqual(
      {
        status: "unreadable",
      },
    );
    const tampered = stored.slice(0, -2) + (stored.endsWith("A") ? "BB" : "AA");
    expect(openCompanyAiKey(COMPANY, tampered)).toEqual({ status: "unreadable" });
    expect(openCompanyAiKey(COMPANY, "cak:v1:")).toEqual({ status: "unreadable" });
  });

  it("does not use the integration-secrets key: an integration ciphertext is not a company key", () => {
    const integration = encryptIntegrationSecret(KEY) as string;
    expect(isSealedCompanyAiKey(integration)).toBe(false);
    // Read as a legacy plaintext value, it would be sealed — never decrypted with the wrong key.
    expect(openCompanyAiKey(COMPANY, integration).status).toBe("plaintext");
  });

  it("reads as unreadable — loudly, not as no key — after the app secret changes", () => {
    const stored = sealCompanyAiKey(COMPANY, KEY);
    vi.stubEnv("INTEGRATION_SECRET", "a-different-secret-987654");
    expect(openCompanyAiKey(COMPANY, stored)).toEqual({ status: "unreadable" });
  });

  it("reads a key saved before encryption as plaintext", () => {
    expect(openCompanyAiKey(COMPANY, KEY)).toEqual({ status: "plaintext", key: KEY });
    expect(openCompanyAiKey(COMPANY, undefined)).toEqual({ status: "none" });
  });
});

describe("plaintext migration (read-and-rewrite)", () => {
  beforeEach(() => vi.stubEnv("INTEGRATION_SECRET", "test-integration-secret-0123"));
  afterEach(() => vi.unstubAllEnvs());

  it("seals a plaintext key, and then has nothing left to do", () => {
    const next = resealCompanyAiKey(COMPANY, KEY);
    expect(next).not.toBeNull();
    expect(next).not.toContain(KEY);
    expect(openCompanyAiKey(COMPANY, next)).toEqual({ status: "sealed", key: KEY, stale: false });
    expect(resealCompanyAiKey(COMPANY, next)).toBeNull();
    expect(resealCompanyAiKey(COMPANY, undefined)).toBeNull();
  });

  it("leaves an unreadable key alone for the admin to replace", () => {
    const stored = sealCompanyAiKey(COMPANY, KEY);
    expect(resealCompanyAiKey(OTHER_COMPANY, stored)).toBeNull();
  });

  /** Records the one UPDATE the helper makes; never a real database. */
  function fakeDb(rowsMatched: number) {
    const set = vi.fn();
    const db = {
      update: vi.fn(() => ({
        set: (values: unknown) => {
          set(values);
          return {
            where: () => ({
              returning: async () => Array.from({ length: rowsMatched }, () => ({ id: COMPANY })),
            }),
          };
        },
      })),
    };
    return { db: db as unknown as Database, update: db.update, set };
  }

  it("writes the sealed value back for a plaintext row, guarded by the value it read", async () => {
    const { db, update } = fakeDb(1);
    const after = await sealStoredCompanyAiKey(db, COMPANY, KEY);
    expect(update).toHaveBeenCalledTimes(1);
    expect(after).not.toBe(KEY);
    expect(openCompanyAiKey(COMPANY, after)).toEqual({ status: "sealed", key: KEY, stale: false });
  });

  it("is idempotent: a sealed row is not written again", async () => {
    const { db, update } = fakeDb(1);
    const sealed = sealCompanyAiKey(COMPANY, KEY);
    expect(await sealStoredCompanyAiKey(db, COMPANY, sealed)).toBe(sealed);
    expect(update).not.toHaveBeenCalled();
  });

  it("keeps what it read when the row changed meanwhile", async () => {
    const { db } = fakeDb(0);
    expect(await sealStoredCompanyAiKey(db, COMPANY, KEY)).toBe(KEY);
  });
});

describe("refusal: a company's own key or nothing", () => {
  beforeEach(() => vi.stubEnv("INTEGRATION_SECRET", "test-integration-secret-0123"));
  afterEach(() => vi.unstubAllEnvs());

  it("uses the shared providers only when the company has no key of its own", () => {
    expect(resolveCompanyAiRoute(COMPANY, {})).toEqual({ kind: "shared" });
    expect(resolveCompanyAiRoute(COMPANY, { aiProvider: "groq" })).toEqual({ kind: "shared" });
  });

  it("uses the company's own key, and only it, when it opens", () => {
    const aiApiKey = sealCompanyAiKey(COMPANY, KEY);
    expect(resolveCompanyAiRoute(COMPANY, { aiProvider: "groq", aiApiKey })).toEqual({
      kind: "own",
      provider: "groq",
      apiKey: KEY,
    });
  });

  it("refuses when the key cannot be read (secret rotated) instead of falling back", () => {
    const aiApiKey = sealCompanyAiKey(COMPANY, KEY);
    vi.stubEnv("INTEGRATION_SECRET", "a-different-secret-987654");
    expect(resolveCompanyAiRoute(COMPANY, { aiProvider: "groq", aiApiKey })).toEqual({
      kind: "refuse",
      problem: "unreadable",
    });
  });

  it("refuses when a key is set but no provider is", () => {
    const aiApiKey = sealCompanyAiKey(COMPANY, KEY);
    expect(resolveCompanyAiRoute(COMPANY, { aiApiKey })).toEqual({
      kind: "refuse",
      problem: "noProvider",
    });
  });

  it("tells a rejected key from a provider that is down", () => {
    expect(
      classifyOwnKeyFailure(
        new Error("No AI provider available. Tried: groq: Groq: API key invalid (401)"),
      ),
    ).toBe("rejected");
    expect(
      classifyOwnKeyFailure(new Error("No AI provider available. Tried: groq: Groq: unreachable")),
    ).toBe("unavailable");
    expect(classifyOwnKeyFailure(new Error("Groq: API key invalid (429: slow down)"))).toBe(
      "unavailable",
    );
  });

  it("tells an admin what to fix with a link, and a member to ask an admin", () => {
    const t = (key: string) => `<${key}>`;
    const admin = { code: COMPANY_AI_KEY_REFUSAL, problem: "rejected", canFix: true } as const;
    const member = { ...admin, canFix: false };
    expect(isCompanyAiKeyRefusal(admin)).toBe(true);
    expect(isCompanyAiKeyRefusal({ code: "OTHER", problem: "rejected", canFix: true })).toBe(false);

    const adminText = companyAiKeyRefusalText(admin, t, { link: true });
    expect(adminText).toContain("<companyKey.rejected>");
    expect(adminText).toContain("<companyKey.fixAdmin>");
    expect(adminText).toContain(`(${AI_SETTINGS_PATH})`);

    const memberText = companyAiKeyRefusalText(member, t, { link: true });
    expect(memberText).toContain("<companyKey.askAdmin>");
    expect(memberText).not.toContain(AI_SETTINGS_PATH);
  });
});
