import { probeByokKey } from "@bitbaum/ai-kit/byok-probe";
import type { AiProviderValue } from "@kivvi/database/src/enums";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "@/lib/integration-secrets";

/**
 * The company's own AI key: checked with its provider before it is saved, and
 * encrypted at rest with the same helper as the integration secrets.
 *
 * The schema said `// encrypted` while the settings action wrote the key as
 * typed, and nothing checked it — a mistyped key saved fine and every chat
 * then fell back to the shared models with nobody told why.
 */

type Probe = typeof probeByokKey;

/** Providers whose key the check can verify. Ollama takes a URL, not a key. */
const CHECKABLE: ReadonlySet<AiProviderValue> = new Set(["anthropic", "groq", "openrouter", "xai"]);

export type AiKeyVerdict = { ok: true } | { ok: false; message: string };

/**
 * Ask the provider whether this key works (and can use this model, when the
 * provider lists its models). Never throws; a failure carries the provider's
 * own words with the key redacted.
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
  if (!CHECKABLE.has(provider)) return { ok: true };

  const result = await probe(provider, apiKey.trim());
  if (!result.ok) return { ok: false, message: result.message };

  const wanted = model?.trim();
  if (wanted && result.models.length > 0 && !result.models.includes(wanted)) {
    const hint = result.suggested ? ` Try ${result.suggested}.` : "";
    return { ok: false, message: `This key can't use the model ${wanted}.${hint}` };
  }
  return { ok: true };
}

/** What to store for a newly entered key. */
export function sealCompanyAiKey(apiKey: string): string {
  return encryptIntegrationSecret(apiKey.trim()) as string;
}

/** The usable key from settings — keys saved before encryption still read as-is. */
export function openCompanyAiKey(stored: string | undefined): string | undefined {
  try {
    return decryptIntegrationSecret(stored);
  } catch {
    // Unreadable (the app secret changed): behave as if no key was set.
    return undefined;
  }
}
