"use client";

import { useTranslations } from "next-intl";
import { FormInput } from "@/components/ui/form-field";

interface Props {
  iban: string;
  bankName: string;
}

export function BankDetailsSection({ iban, bankName }: Props) {
  const t = useTranslations("settings");
  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("company.bankDetails")}</h2>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="iban" className="mb-1.5 block text-sm font-medium">
            {t("company.iban")}
          </label>
          <FormInput
            type="text"
            id="iban"
            name="iban"
            maxLength={34}
            placeholder="CH93 0076 2011 6238 5295 7"
            defaultValue={iban}
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="bankName"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("company.bankName")}
          </label>
          <FormInput
            type="text"
            id="bankName"
            name="bankName"
            maxLength={200}
            placeholder={t("company.placeholders.bankName")}
            defaultValue={bankName}
          />
        </div>
      </div>
    </section>
  );
}
