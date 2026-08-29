"use client";

import { useTranslations } from "next-intl";
import { FormInput } from "@/components/ui/form-field";

interface Props {
  name: string;
  legalName: string;
  vatNumber: string;
}

export function CompanyInfoSection({ name, legalName, vatNumber }: Props) {
  const t = useTranslations("settings");
  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("company.companyInfo")}</h2>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            {t("company.companyName")} <span className="text-destructive">*</span>
          </label>
          <FormInput
            type="text"
            id="name"
            name="name"
            required
            maxLength={200}
            defaultValue={name}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="legalName" className="mb-1.5 block text-sm font-medium">
            {t("company.legalName")}
          </label>
          <FormInput
            type="text"
            id="legalName"
            name="legalName"
            maxLength={200}
            defaultValue={legalName}
          />
        </div>

        <div>
          <label htmlFor="vatNumber" className="mb-1.5 block text-sm font-medium">
            {t("company.vatNumber")}
          </label>
          <FormInput
            type="text"
            id="vatNumber"
            name="vatNumber"
            maxLength={50}
            placeholder={t("company.placeholders.vatNumber")}
            defaultValue={vatNumber}
          />
        </div>
      </div>
    </section>
  );
}
