"use client";

import { useTranslations } from "next-intl";
import type { Contact } from "@kivvi/database";
import { FormInput } from "@/components/ui/form-field";

interface SectionProps {
  contact?: Contact;
  isEdit: boolean;
}

export function ContactFormContactSection({ contact, isEdit }: SectionProps) {
  const t = useTranslations("contacts");
  const tc = useTranslations("common");

  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("contactDetails")}</h2>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            {tc("email")}
          </label>
          <FormInput
            type="email"
            id="email"
            name="email"
            defaultValue={contact?.email || ""}
            placeholder={!isEdit ? "hans@mueller-ag.ch" : undefined}
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium">
            {tc("phone")}
          </label>
          <FormInput
            type="tel"
            id="phone"
            name="phone"
            maxLength={30}
            defaultValue={contact?.phone || ""}
            placeholder={!isEdit ? "+41 44 123 45 67" : undefined}
          />
        </div>
        <div>
          <label htmlFor="mobile" className="mb-1.5 block text-sm font-medium">
            {t("mobile")}
          </label>
          <FormInput
            type="tel"
            id="mobile"
            name="mobile"
            maxLength={30}
            defaultValue={contact?.mobile || ""}
            placeholder={!isEdit ? "+41 79 123 45 67" : undefined}
          />
        </div>
        <div>
          <label htmlFor="website" className="mb-1.5 block text-sm font-medium">
            {t("website")}
          </label>
          <FormInput
            type="text"
            id="website"
            name="website"
            maxLength={200}
            defaultValue={contact?.website || ""}
            placeholder={!isEdit ? "www.mueller-ag.ch" : undefined}
          />
        </div>
      </div>
    </section>
  );
}
