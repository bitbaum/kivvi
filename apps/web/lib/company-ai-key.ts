import { probeByokKey } from "@bitbaum/ai-kit/byok-probe";
import { and, eq, sql } from "drizzle-orm";
import { companies, type CompanySettings, type Database } from "@kivvi/database";
import type { AiProviderValue } from "@kivvi/database/src/enums";
import type { CompanyAiKeyProblem } from "@/lib/company-ai-key-refusal";
import { openCompanyAiKey, resealCompanyAiKey } from "@/lib/security/company-ai-key-crypto";

/**
 * The company's own AI key: checked with its provider before it is saved,
 * sealed at rest (`lib/security/company-ai-key-crypto.ts`), and — once chosen —
 * the only way that company's chat reaches a model.
 */

type Probe = typeof probeByokKey;

/** Providers that take a key. Ollama takes a URL, so a stored key means nothing for it. */
const KEYED: ReadonlySet<AiProviderValue> = new Set(["anthropic", "groq", "openrouter", "xai"]);

export type AiKeyVerdict =
  /** Save it. `verified: false` = the provider could not be asked (down, rate-limited); `note` says why. */
  | { ok: true; verified: boolean; note?: string }
  /** Do not save it: the provider refused the key, or the key cannot use the chosen model. */
  | { ok: false; message: string };

/** A probe answer that says nothing about the key: no answer, rate limit, or a server error. */
function couldNotAsk(status: number | null): boolean {
  return status === null || status === 429 || status >= 500;
}

/**
 * Ask the provider whether this key works (and can use this model, when the
 * provider lists its models). Never throws; a failure carries the provider's
 * own words with the key redacted (`probeByokKey` masks it).
 */
export async function checkCompanyAiKey(
  provider: AiProviderValue | null | undefined,
  apiKey: string,
  model: string | null | undefined,
  probe: Probe = probeByokKey,
): Promise<AiKeyVerdict> {
  if (!provider) {
    return { ok: false, message: "Choose the AI provider this key belongs to first." };
  }
  if (!KEYED.has(provider)) return { ok: true, verified: true };

  const result = await probe(provider, apiKey.trim());
  if (!result.ok) {
    if (couldNotAsk(result.status)) return { ok: true, verified: false, note: result.message };
    return { ok: false, message: result.message };
  }

  const wanted = model?.trim();
  if (wanted && result.models.length > 0 && !result.models.includes(wanted)) {
    const hint = result.suggested ? ` Try ${result.suggested}.` : "";
    return { ok: false, message: `This key can't use the model ${wanted}.${hint}` };
  }
  return { ok: true, verified: true };
}

export type CompanyAiRoute =
  /** The company has not chosen its own key: the shared providers serve it. */
  | { kind: "shared" }
  /** The company's own key, and nothing else, serves it. */
  | { kind: "own"; provider: AiProviderValue; apiKey: string }
  /** The company chose its own key and it cannot be used: refuse. */
  | { kind: "refuse"; problem: CompanyAiKeyProblem };

/**
 * Which account a company's chat goes through. A stored key means the company
 * chose its own; from then on there is no path to the shared keys, whatever
 * happens to that key.
 */
export function resolveCompanyAiRoute(
  companyId: string,
  settings: Pick<CompanySettings, "aiProvider" | "aiApiKey">,
): CompanyAiRoute {
  const opened = openCompanyAiKey(companyId, settings.aiApiKey);
  if (opened.status === "none") return { kind: "shared" };
  if (settings.aiProvider && !KEYED.has(settings.aiProvider)) return { kind: "shared" };
  if (opened.status === "unreadable") return { kind: "refuse", problem: "unreadable" };
  if (!settings.aiProvider) return { kind: "refuse", problem: "noProvider" };
  return { kind: "own", provider: settings.aiProvider, apiKey: opened.key };
}

/**
 * Why the company's own provider failed, from the error the provider layer
 * threw: a refusal of the key, or the provider not being available right now.
 */
export function classifyOwnKeyFailure(error: unknown): CompanyAiKeyProblem {
  const message = error instanceof Error ? error.message : String(error);
  if (/unreachable|not reachable|\b(429|5\d\d)\b|timeout|timed out/i.test(message)) {
    return "unavailable";
  }
  return "rejected";
}

/** True when a mid-conversation provider error is the provider refusing the key itself. */
export function looksLikeKeyRejection(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /\b(401|403)\b|api key invalid|invalid api key|unauthori[sz]ed|authentication/i.test(
    message,
  );
}

/**
 * Read-and-rewrite: if this company's stored key is plaintext (saved before
 * encryption) or sealed under an older version, seal it now and write it back.
 * Idempotent and race-safe — the write only lands while the row still holds
 * the value that was read. Returns the value stored afterwards.
 */
export async function sealStoredCompanyAiKey(
  db: Database,
  companyId: string,
  stored: string | undefined,
): Promise<string | undefined> {
  let next: string | null;
  try {
    next = resealCompanyAiKey(companyId, stored);
  } catch {
    // No app secret to seal with: leave it; the settings screen says it is not encrypted.
    return stored;
  }
  if (!next || !stored) return stored;
  const updated = await db
    .update(companies)
    .set({
      settings: sql`jsonb_set(${companies.settings}, '{aiApiKey}', to_jsonb(${next}::text))`,
    })
    .where(and(eq(companies.id, companyId), sql`${companies.settings}->>'aiApiKey' = ${stored}`))
    .returning({ id: companies.id });
  return updated.length > 0 ? next : stored;
}
