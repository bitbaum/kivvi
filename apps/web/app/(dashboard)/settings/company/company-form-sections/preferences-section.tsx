"use client";

import { useTranslations } from "next-intl";
import { SUPPORTED_CURRENCIES } from "@/lib/config/currencies";
import { SWISS_VAT_RATES } from "@/lib/config/vat-rates";
import { FormInput, FormSelect } from "@/components/ui/form-field";

interface Props {
  currency: string;
  defaultVatRate: string;
  defaultPaymentTermsDays: string;
}

export function PreferencesSection({
  currency,
  defaultVatRate,
  defaultPaymentTermsDays,
}: Props) {
  const t = useTranslations("settings");
  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("company.preferences")}</h2>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="currency"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("company.defaultCurrency")}
          </label>
          <FormSelect id="currency" name="currency" defaultValue={currency}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {t(`currencies.${c.toLowerCase()}`)}
              </option>
            ))}
          </FormSelect>
        </div>

        <div>
          <label
            htmlFor="defaultVatRate"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("company.defaultVatRate")}
          </label>
          <FormSelect
            id="defaultVatRate"
            name="defaultVatRate"
            defaultValue={defaultVatRate}
          >
            {SWISS_VAT_RATES.map((r) => (
              <option key={r.value} value={r.value}>
                {t(`vatRates.${r.labelKey}`)}
              </option>
            ))}
          </FormSelect>
        </div>

        <div>
          <label
            htmlFor="defaultPaymentTermsDays"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("company.paymentTermsDays")}
          </label>
          <FormInput
            type="number"
            id="defaultPaymentTermsDays"
            name="defaultPaymentTermsDays"
            min={0}
            max={365}
            defaultValue={defaultPaymentTermsDays}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {t("company.paymentTermsDaysHint")}
          </p>
        </div>
      </div>
    </section>
  );
}
