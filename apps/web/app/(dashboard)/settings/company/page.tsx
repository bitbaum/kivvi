import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { companies } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { DEFAULT_VAT_RATE } from "@/lib/config/vat-rates";
import {
  DEFAULT_CURRENCY,
  DEFAULT_COUNTRY,
} from "@kivvi/core/src/config/locale";
import { DEFAULT_PAYMENT_TERMS_DAYS } from "@/lib/config/document-types";
import { CompanyForm } from "./company-form";
import { Co2FactorsSection } from "./co2-factors-section";
import { ShopUrlSection } from "./shop-url-section";

export default async function CompanySettingsPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("settings");
  const tc = await getTranslations("common");

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, session.user.companyId));

  if (!company) redirect("/settings");

  const settings = (company.settings as CompanySettings) ?? {};

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc("back")}
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t("companySettings")}</h1>
        <p className="text-muted-foreground">{t("companySettingsDesc")}</p>
      </div>

      <CompanyForm
        initialData={{
          name: company.name,
          legalName: company.legalName || "",
          vatNumber: company.vatNumber || "",
          address: company.address || "",
          city: company.city || "",
          postalCode: company.postalCode || "",
          country: company.country || DEFAULT_COUNTRY,
          currency: company.currency || DEFAULT_CURRENCY,
          iban: settings.bankAccount?.iban || "",
          bankName: settings.bankAccount?.bankName || "",
          defaultVatRate:
            settings.defaultVatRate?.toString() || DEFAULT_VAT_RATE,
          defaultPaymentTermsDays:
            settings.defaultPaymentTermsDays?.toString() ||
            String(DEFAULT_PAYMENT_TERMS_DAYS),
          defaultDocumentFooter: settings.defaultDocumentFooter || "",
          logoBase64: settings.logoBase64 || null,
          aiProvider: settings.aiProvider || "",
          aiModel: settings.aiModel || "",
          aiApiKey: settings.aiApiKey ? "********" : "",
        }}
      />

      <ShopUrlSection currentSlug={company.slug ?? null} />

      <Co2FactorsSection initialFactors={settings.co2FactorsKg} />
    </div>
  );
}
