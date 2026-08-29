"use client";

import { useTranslations } from "next-intl";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { AI_PROVIDER_VALUES, AI_PROVIDER_LABELS } from "@kivvi/database/src/enums";

interface AIConfigSectionProps {
  initialData: {
    aiProvider: string;
    aiModel: string;
    aiApiKey: string;
  };
}

export function AIConfigSection({ initialData }: AIConfigSectionProps) {
  const t = useTranslations("settings");

  return (
    <section className="rounded-xl border bg-card">
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
          <p className="mt-1 text-xs text-muted-foreground">{t("company.aiApiKeyHint")}</p>
        </div>
      </div>
    </section>
  );
}
