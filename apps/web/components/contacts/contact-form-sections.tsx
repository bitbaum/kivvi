"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Contact } from "@kivvi/database";
import { LANGUAGE_OPTIONS, COUNTRY_OPTIONS } from "@/lib/config/locales";
import { CONTACT_TYPES } from "@/lib/config/contact-types";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-field";
import { DEFAULT_PAYMENT_TERMS_DAYS } from "@/lib/config/document-types";
import { DEFAULT_COUNTRY } from "@kivvi/core/src/config/locale";
import { Button } from "@/components/ui/button";

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

interface AdvancedSectionsProps extends SectionProps {
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
}

export function ContactFormAdvancedSections({
  contact,
  isEdit,
  showAdvanced,
  onToggleAdvanced,
}: AdvancedSectionsProps) {
  const t = useTranslations("contacts");
  const tc = useTranslations("common");

  return (
    <>
      {!isEdit && (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={onToggleAdvanced}
        >
          {showAdvanced ? (
            <>
              <ChevronUp className="h-4 w-4" />
              {tc("hideAdvanced")}
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              {tc("showAdvanced")}
            </>
          )}
        </Button>
      )}

      {(isEdit || showAdvanced) && (
        <>
          <section className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold">{t("financialDetails")}</h2>
            </div>
            <div className="grid gap-6 p-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="vatNumber"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t("vatNumber")}
                </label>
                <FormInput
                  type="text"
                  id="vatNumber"
                  name="vatNumber"
                  maxLength={30}
                  defaultValue={contact?.vatNumber || ""}
                  placeholder={
                    !isEdit ? t("placeholders.vatNumber") : undefined
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="iban"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t("iban")}
                </label>
                <FormInput
                  type="text"
                  id="iban"
                  name="iban"
                  maxLength={34}
                  defaultValue={contact?.iban || ""}
                  placeholder={
                    !isEdit ? "CH93 0076 2011 6238 5295 7" : undefined
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="paymentTermsDays"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t("paymentTerms")} ({t("days")})
                </label>
                <FormInput
                  type="number"
                  id="paymentTermsDays"
                  name="paymentTermsDays"
                  min={0}
                  max={365}
                  defaultValue={
                    contact?.paymentTermsDays ?? DEFAULT_PAYMENT_TERMS_DAYS
                  }
                />
              </div>
              <div>
                <label
                  htmlFor="creditLimit"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t("creditLimit")} (CHF)
                </label>
                <FormInput
                  type="text"
                  id="creditLimit"
                  name="creditLimit"
                  defaultValue={contact?.creditLimit || ""}
                  placeholder={!isEdit ? "10000.00" : undefined}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card">
            <div className="border-b px-6 py-4">
              <h2 className="font-semibold">{tc("settings")}</h2>
            </div>
            <div className="grid gap-6 p-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="language"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t("language")}
                </label>
                <FormSelect
                  id="language"
                  name="language"
                  defaultValue={contact?.language || "de"}
                >
                  {LANGUAGE_OPTIONS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="notes"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {tc("notes")}
                </label>
                <FormTextarea
                  id="notes"
                  name="notes"
                  rows={4}
                  maxLength={5000}
                  defaultValue={contact?.notes || ""}
                  placeholder={!isEdit ? t("internalNotes") : undefined}
                  className="resize-y"
                />
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
