"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { updateCompanyAction } from "@/app/actions/settings";
import { cn } from "@/lib/utils";
import { COUNTRY_OPTIONS } from "@/lib/config/locales";
import { SUPPORTED_CURRENCIES } from "@/lib/config/currencies";
import { SWISS_VAT_RATES } from "@/lib/config/vat-rates";
import { FormInput, FormSelect } from "@/components/ui/form-field";
import { LogoUpload } from "./logo-upload";
import { AIConfigSection } from "./ai-config-section";

interface CompanyFormProps {
  initialData: {
    name: string;
    legalName: string;
    vatNumber: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    currency: string;
    iban: string;
    bankName: string;
    defaultVatRate: string;
    defaultPaymentTermsDays: string;
    defaultDocumentFooter: string;
    logoBase64: string | null;
    aiProvider: string;
    aiModel: string;
    aiApiKey: string;
  };
}

export function CompanyForm({ initialData }: CompanyFormProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData(e.currentTarget);
      const input = {
        name: formData.get("name") as string,
        legalName: (formData.get("legalName") as string) || null,
        vatNumber: (formData.get("vatNumber") as string) || null,
        address: (formData.get("address") as string) || null,
        city: (formData.get("city") as string) || null,
        postalCode: (formData.get("postalCode") as string) || null,
        country: formData.get("country") as string,
        currency: formData.get("currency") as string,
        iban: (formData.get("iban") as string) || null,
        bankName: (formData.get("bankName") as string) || null,
        defaultVatRate: (formData.get("defaultVatRate") as string) || null,
        defaultPaymentTermsDays:
          (formData.get("defaultPaymentTermsDays") as string) || null,
        defaultDocumentFooter:
          (formData.get("defaultDocumentFooter") as string) || null,
        aiProvider: (formData.get("aiProvider") as string) || null,
        aiModel: (formData.get("aiModel") as string) || null,
        aiApiKey: (formData.get("aiApiKey") as string) || null,
      };

      const result = await updateCompanyAction(input);

      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || tc("error"));
      }
    } catch {
      setError(tc("error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-4 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          {t("company.savedSuccessfully")}
        </div>
      )}

      {/* Company Logo */}
      <LogoUpload
        initialLogoBase64={initialData.logoBase64}
        onError={setError}
      />

      {/* Company Information */}
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
              defaultValue={initialData.name}
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
              defaultValue={initialData.legalName}
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
              defaultValue={initialData.vatNumber}
            />
          </div>
        </div>
      </section>

      {/* Address */}
      <section className="rounded-xl border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">{t("company.address")}</h2>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="address"
              className="mb-1.5 block text-sm font-medium"
            >
              {t("company.streetAddress")}
            </label>
            <FormInput
              type="text"
              id="address"
              name="address"
              maxLength={500}
              defaultValue={initialData.address}
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
              defaultValue={initialData.postalCode}
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
              defaultValue={initialData.city}
            />
          </div>

          <div>
            <label
              htmlFor="country"
              className="mb-1.5 block text-sm font-medium"
            >
              {t("company.country")}
            </label>
            <FormSelect
              id="country"
              name="country"
              defaultValue={initialData.country}
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

      {/* Bank Details */}
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
              defaultValue={initialData.iban}
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
              defaultValue={initialData.bankName}
            />
          </div>
        </div>
      </section>

      {/* Preferences */}
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
            <FormSelect
              id="currency"
              name="currency"
              defaultValue={initialData.currency}
            >
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
              defaultValue={initialData.defaultVatRate}
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
              defaultValue={initialData.defaultPaymentTermsDays}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("company.paymentTermsDaysHint")}
            </p>
          </div>
        </div>
      </section>

      {/* Document Footer */}
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
            defaultValue={initialData.defaultDocumentFooter}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {t("company.defaultDocumentFooterHint")}
          </p>
        </div>
      </section>

      {/* AI Configuration */}
      <AIConfigSection initialData={initialData} />

      {/* Submit */}
      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors",
            isSubmitting && "opacity-50 cursor-not-allowed",
          )}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? tc("saving") : tc("saveChanges")}
        </button>
      </div>
    </form>
  );
}
