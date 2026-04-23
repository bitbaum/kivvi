"use client";

import { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { updateCompanyAction } from "@/app/actions/settings";
import { cn } from "@/lib/utils";
import { LogoUpload } from "./logo-upload";
import { AIConfigSection } from "./ai-config-section";
import {
  CompanyInfoSection,
  AddressSection,
  BankDetailsSection,
  PreferencesSection,
  DocumentFooterSection,
} from "./company-form-sections";

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
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-4 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          {t("company.savedSuccessfully")}
        </div>
      )}

      <LogoUpload
        initialLogoBase64={initialData.logoBase64}
        onError={setError}
      />

      <CompanyInfoSection
        name={initialData.name}
        legalName={initialData.legalName}
        vatNumber={initialData.vatNumber}
      />

      <AddressSection
        address={initialData.address}
        city={initialData.city}
        postalCode={initialData.postalCode}
        country={initialData.country}
      />

      <BankDetailsSection
        iban={initialData.iban}
        bankName={initialData.bankName}
      />

      <PreferencesSection
        currency={initialData.currency}
        defaultVatRate={initialData.defaultVatRate}
        defaultPaymentTermsDays={initialData.defaultPaymentTermsDays}
      />

      <DocumentFooterSection
        defaultDocumentFooter={initialData.defaultDocumentFooter}
      />

      <AIConfigSection initialData={initialData} />

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
