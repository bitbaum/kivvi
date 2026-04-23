"use client";

import { useTranslations } from "next-intl";
import { COUNTRY_OPTIONS } from "@/lib/config/locales";
import { SUPPORTED_CURRENCIES } from "@/lib/config/currencies";
import { SWISS_VAT_RATES } from "@/lib/config/vat-rates";
import { FormInput, FormSelect } from "@/components/ui/form-field";

interface CompanyInfoSectionProps {
  name: string;
  legalName: string;
  vatNumber: string;
}

export function CompanyInfoSection({
  name,
  legalName,
  vatNumber,
}: CompanyInfoSectionProps) {
  const t = useTranslations("settings");
  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("company.companyInfo")}</h2>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            {t("company.companyName")}{" "}
            <span className="text-destructive">*</span>
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
          <label
            htmlFor="legalName"
            className="mb-1.5 block text-sm font-medium"
          >
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
          <label
            htmlFor="vatNumber"
            className="mb-1.5 block text-sm font-medium"
          >
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

interface AddressSectionProps {
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export function AddressSection({
  address,
  city,
  postalCode,
  country,
}: AddressSectionProps) {
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

interface BankDetailsSectionProps {
  iban: string;
  bankName: string;
}

export function BankDetailsSection({
  iban,
  bankName,
}: BankDetailsSectionProps) {
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

interface PreferencesSectionProps {
  currency: string;
  defaultVatRate: string;
  defaultPaymentTermsDays: string;
}

export function PreferencesSection({
  currency,
  defaultVatRate,
  defaultPaymentTermsDays,
}: PreferencesSectionProps) {
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

interface DocumentFooterSectionProps {
  defaultDocumentFooter: string;
}

export function DocumentFooterSection({
  defaultDocumentFooter,
}: DocumentFooterSectionProps) {
  const t = useTranslations("settings");
  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b px-6 py-4">
        <h2 className="font-semibold">{t("company.documentFooter")}</h2>
      </div>
      <div className="p-6">
        <label
          htmlFor="defaultDocumentFooter"
          className="mb-1.5 block text-sm font-medium"
        >
          {t("company.defaultDocumentFooter")}
        </label>
        <textarea
          id="defaultDocumentFooter"
          name="defaultDocumentFooter"
          rows={3}
          maxLength={1000}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={t("company.placeholders.documentFooter")}
          defaultValue={defaultDocumentFooter}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {t("company.defaultDocumentFooterHint")}
        </p>
      </div>
    </section>
  );
}
