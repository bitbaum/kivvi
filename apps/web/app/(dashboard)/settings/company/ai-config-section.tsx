"use client";

import { useTranslations } from "next-intl";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { AI_PROVIDER_VALUES, AI_PROVIDER_LABELS } from "@kivvi/database/src/enums";
import type { OpenedCompanyAiKey } from "@/lib/security/company-ai-key-crypto";

/** What the screen may truthfully say about the stored key. */
export interface AiKeyState {
  status: OpenedCompanyAiKey["status"];
  /** Set when the key was saved while its provider could not be asked; the provider's words, if any. */
  unverifiedNote: string | null;
}

interface AIConfigSectionProps {
  initialData: {
    aiProvider: string;
    aiModel: string;
    aiApiKey: string;
  };
  keyState: AiKeyState;
}

export function AIConfigSection({ initialData, keyState }: AIConfigSectionProps) {
  const t = useTranslations("settings");

  // "Stored encrypted" is said only when it is true: no key yet (it will be),
  // or a sealed one. A plaintext or unreadable key gets its own sentence.
  const keyHint =
    keyState.status === "unreadable"
      ? t("company.aiApiKeyUnreadable")
      : keyState.status === "plaintext"
        ? t("company.aiApiKeyPlaintext")
        : t("company.aiApiKeyHint");
  const keyHintIsProblem = keyState.status === "unreadable" || keyState.status === "plaintext";

  return (
    <section id="ai-settings" className="scroll-mt-6 rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("company.aiConfig")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("company.aiConfigHint")}</p>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-2">
        <div>
          <label htmlFor="aiProvider" className="mb-1.5 block text-sm font-medium">
            {t("company.aiProvider")}
          </label>
          <FormSelect id="aiProvider" name="aiProvider" defaultValue={initialData.aiProvider}>
            <option value="">{t("company.aiProviderDefault")}</option>
            {AI_PROVIDER_VALUES.map((p) => (
              <option key={p} value={p}>
                {AI_PROVIDER_LABELS[p]}
              </option>
            ))}
          </FormSelect>
          <p className="mt-1 text-xs text-muted-foreground">{t("company.aiProviderHint")}</p>
        </div>

        <div>
          <label htmlFor="aiModel" className="mb-1.5 block text-sm font-medium">
            {t("company.aiModel")}
          </label>
          <FormInput
            type="text"
            id="aiModel"
            name="aiModel"
            maxLength={100}
            placeholder={t("company.placeholders.aiModel")}
            defaultValue={initialData.aiModel}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="aiApiKey" className="mb-1.5 block text-sm font-medium">
            {t("company.aiApiKey")}
          </label>
          <FormInput
            type="password"
            id="aiApiKey"
            name="aiApiKey"
            maxLength={200}
            placeholder={t("company.placeholders.aiApiKey")}
            defaultValue={initialData.aiApiKey}
          />
          <p
            className={
              keyHintIsProblem
                ? "mt-1 text-xs text-destructive"
                : "mt-1 text-xs text-muted-foreground"
            }
            role={keyHintIsProblem ? "alert" : undefined}
          >
            {keyHint}
          </p>
          {keyState.status === "sealed" && keyState.unverifiedNote !== null && (
            <p className="mt-1 text-xs text-warning">
              {t("company.aiApiKeyUnverified")}
              {keyState.unverifiedNote ? ` ${keyState.unverifiedNote}` : ""}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
