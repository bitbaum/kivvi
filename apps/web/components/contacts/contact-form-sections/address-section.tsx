"use client";

import { useTranslations } from "next-intl";
import type { Contact } from "@kivvi/database";
import { COUNTRY_OPTIONS } from "@/lib/config/locales";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { DEFAULT_COUNTRY } from "@kivvi/core/src/config/locale";

interface SectionProps {
  contact?: Contact;
  isEdit: boolean;
}

export function ContactFormAddressSection({ contact, isEdit }: SectionProps) {
  const t = useTranslations("contacts");
  const tc = useTranslations("common");

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("address")}</h2>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="address" className="mb-1.5 block text-sm font-medium">
            {t("street")}
          </label>
          <FormInput
            type="text"
            id="address"
            name="address"
            maxLength={500}
            defaultValue={contact?.address || ""}
            placeholder={!isEdit ? "Bahnhofstrasse 1" : undefined}
          />
        </div>
        <div>
          <label
            htmlFor="postalCode"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("postalCode")}
          </label>
          <FormInput
            type="text"
            id="postalCode"
            name="postalCode"
            maxLength={20}
            defaultValue={contact?.postalCode || ""}
            placeholder={!isEdit ? "8001" : undefined}
          />
        </div>
        <div>
          <label htmlFor="city" className="mb-1.5 block text-sm font-medium">
            {t("city")}
          </label>
          <FormInput
            type="text"
            id="city"
            name="city"
            maxLength={100}
            defaultValue={contact?.city || ""}
            placeholder={!isEdit ? "Zurich" : undefined}
          />
        </div>
        <div>
          <label htmlFor="country" className="mb-1.5 block text-sm font-medium">
            {t("country")}
          </label>
          <FormSelect
            id="country"
            name="country"
            defaultValue={contact?.country || DEFAULT_COUNTRY}
          >
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
