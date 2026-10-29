import type { CompanySettings } from "@kivvi/database";

/** What the browser sees in place of a stored AI key. The form sends it back unchanged to mean "keep". */
export const AI_KEY_MASK = "********";

/**
 * Company settings as they may leave the server. The company's own AI provider
 * key is a secret: a viewer must never receive it, and even an admin only needs
 * to know that one is set. Every path that returns settings to a client goes
 * through this.
 */
export function redactCompanySettings(
  settings: CompanySettings | null | undefined,
): CompanySettings {
  const safe = { ...(settings ?? {}) };
  if (safe.aiApiKey) safe.aiApiKey = AI_KEY_MASK;
  return safe;
}
