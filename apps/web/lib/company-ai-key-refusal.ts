/**
 * When a company has chosen its own AI key and that key cannot be used, chat
 * refuses. It never falls back to the shared provider keys: the company chose
 * its own account, often precisely so its chats do not go through ours.
 *
 * Client-safe: shared by the chat route (which decides) and the chat hooks
 * (which say it). No secrets here.
 */

/** `code` on a refused chat response or stream error event. */
export const COMPANY_AI_KEY_REFUSAL = "COMPANY_AI_KEY";

/** Where an admin fixes it. The anchor is the AI section of the company settings. */
export const AI_SETTINGS_PATH = "/settings/company#ai-settings";

export const COMPANY_AI_KEY_PROBLEMS = [
  "unreadable",
  "noProvider",
  "rejected",
  "unavailable",
] as const;
export type CompanyAiKeyProblem = (typeof COMPANY_AI_KEY_PROBLEMS)[number];

export interface CompanyAiKeyRefusal {
  code: typeof COMPANY_AI_KEY_REFUSAL;
  problem: CompanyAiKeyProblem;
  /** True for admins and owners: they can fix it, so they get the link. */
  canFix: boolean;
}

export function isCompanyAiKeyRefusal(value: unknown): value is CompanyAiKeyRefusal {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<CompanyAiKeyRefusal>;
  return (
    v.code === COMPANY_AI_KEY_REFUSAL &&
    COMPANY_AI_KEY_PROBLEMS.includes(v.problem as CompanyAiKeyProblem) &&
    typeof v.canFix === "boolean"
  );
}

type Translate = (key: string) => string;

/**
 * The sentence the reader sees. `t` is the `ai` namespace. With `link`, an
 * admin's message ends in a markdown link to the AI settings (the chat thread
 * renders markdown); without it, the caller shows its own button.
 */
export function companyAiKeyRefusalText(
  refusal: CompanyAiKeyRefusal,
  t: Translate,
  { link }: { link: boolean },
): string {
  const what = t(`companyKey.${refusal.problem}`);
  if (!refusal.canFix) return `${what} ${t("companyKey.askAdmin")}`;
  const fix = t("companyKey.fixAdmin");
  return link
    ? `${what} ${fix} [${t("companyKey.openSettings")}](${AI_SETTINGS_PATH})`
    : `${what} ${fix}`;
}
