"use client";

import { useTranslations } from "next-intl";
import { COUNTRY_OPTIONS } from "@/lib/config/locales";
import { FormInput, FormSelect } from "@/components/ui/form-field";

interface Props {
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export function AddressSection({ address, city, postalCode, country }: Props) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("company.address")}</h2>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="address" className="mb-1.5 block text-sm font-medium">
            {t("company.streetAddress")}
          </label>
          <FormInput
            type="text"
            id="address"
            name="address"
            maxLength={500}
            defaultValue={address}
          />
        </div>

        <div>
          <label
            htmlFor="postalCode"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("company.postalCode")}
          </label>
          <FormInput
            type="text"
            id="postalCode"
            name="postalCode"
            maxLength={20}
            defaultValue={postalCode}
          />
        </div>

        <div>
          <label htmlFor="city" className="mb-1.5 block text-sm font-medium">
            {t("company.city")}
          </label>
          <FormInput
            type="text"
            id="city"
            name="city"
            maxLength={100}
            defaultValue={city}
          />
        </div>

        <div>
          <label htmlFor="country" className="mb-1.5 block text-sm font-medium">
            {t("company.country")}
          </label>
          <FormSelect id="country" name="country" defaultValue={country}>
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {tc(`countries.${c.toLowerCase()}`)}
              </option>
            ))}
          </FormSelect>
        </div>
      </div>
    </section>
  );
}
