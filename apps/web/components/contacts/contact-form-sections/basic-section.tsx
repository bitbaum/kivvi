"use client";

import { useTranslations } from "next-intl";
import type { Contact } from "@kivvi/database";
import { CONTACT_TYPES } from "@/lib/config/contact-types";
import { FormInput, FormSelect } from "@/components/ui/form-field";

interface SectionProps {
  contact?: Contact;
  isEdit: boolean;
}

export function ContactFormBasicSection({ contact, isEdit }: SectionProps) {
  const t = useTranslations("contacts");
  const tc = useTranslations("common");

  const contactTypeOptions = CONTACT_TYPES.map((ct) => ({
    value: ct,
    label: t(ct),
  }));

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("basicInformation")}</h2>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="type" className="mb-1.5 block text-sm font-medium">
            {tc("type")} <span className="text-destructive">*</span>
          </label>
          <FormSelect
            id="type"
            name="type"
            required
            defaultValue={contact?.type || "customer"}
          >
            {contactTypeOptions.map((ct) => (
              <option key={ct.value} value={ct.value}>
                {ct.label}
              </option>
            ))}
          </FormSelect>
        </div>

        <div>
          <label
            htmlFor="firstName"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("firstName")}
          </label>
          <FormInput
            type="text"
            id="firstName"
            name="firstName"
            maxLength={100}
            defaultValue={contact?.firstName || ""}
            placeholder={!isEdit ? "Hans" : undefined}
          />
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="mb-1.5 block text-sm font-medium"
          >
            {t("lastName")}
          </label>
          <FormInput
            type="text"
            id="lastName"
            name="lastName"
            maxLength={100}
            defaultValue={contact?.lastName || ""}
            placeholder={!isEdit ? "Müller" : undefined}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            {t("companyName")}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({tc("optional")})
            </span>
          </label>
          <FormInput
            type="text"
            id="name"
            name="name"
            maxLength={200}
            defaultValue={contact?.name || ""}
            placeholder={!isEdit ? t("placeholders.companyOrName") : undefined}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {t("nameOrFirstLastHint")}
          </p>
        </div>
      </div>
    </section>
  );
}
