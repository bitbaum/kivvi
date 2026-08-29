import { redirect } from "next/navigation";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { companies, joinRequests, organizationProfiles, users, vacancies } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { SettingsSubpageHeader } from "@/components/settings-subpage-header";
import { DEFAULT_VAT_RATE } from "@/lib/config/vat-rates";
import { DEFAULT_CURRENCY, DEFAULT_COUNTRY } from "@kivvi/core/src/config/locale";
import { DEFAULT_PAYMENT_TERMS_DAYS } from "@/lib/config/document-types";
import { CompanyForm } from "./company-form";
import { Co2FactorsSection } from "./co2-factors-section";
import { ShopUrlSection } from "./shop-url-section";
import { OrganizationProfileSection } from "./organization-profile-section";

export default async function CompanySettingsPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("settings");

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, session.user.companyId));

  if (!company) redirect("/settings");

  const settings = (company.settings as CompanySettings) ?? {};
  const [organizationProfile, companyVacancies, companyJoinRequests] = await Promise.all([
    db.query.organizationProfiles.findFirst({
      where: eq(organizationProfiles.companyId, company.id),
    }),
    db.query.vacancies.findMany({
      where: eq(vacancies.companyId, company.id),
      orderBy: (vacancies, { desc }) => [desc(vacancies.createdAt)],
    }),
    db
      .select({
        id: joinRequests.id,
        status: joinRequests.status,
        message: joinRequests.message,
        createdAt: joinRequests.createdAt,
        userName: users.name,
        userEmail: users.email,
        vacancyTitle: vacancies.title,
      })
      .from(joinRequests)
      .innerJoin(users, eq(joinRequests.userId, users.id))
      .leftJoin(vacancies, eq(joinRequests.vacancyId, vacancies.id))
      .where(eq(joinRequests.companyId, company.id))
      .orderBy(joinRequests.createdAt),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsSubpageHeader title={t("companySettings")} description={t("companySettingsDesc")} />

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
          defaultVatRate: settings.defaultVatRate?.toString() || DEFAULT_VAT_RATE,
          defaultPaymentTermsDays:
            settings.defaultPaymentTermsDays?.toString() || String(DEFAULT_PAYMENT_TERMS_DAYS),
          defaultRepairHourlyRate: settings.defaultRepairHourlyRate || "",
          defaultDocumentFooter: settings.defaultDocumentFooter || "",
          logoBase64: settings.logoBase64 || null,
          aiProvider: settings.aiProvider || "",
          aiModel: settings.aiModel || "",
          aiApiKey: settings.aiApiKey ? "********" : "",
        }}
      />

      <ShopUrlSection currentSlug={company.slug ?? null} />

      <OrganizationProfileSection
        companyName={company.name}
        initialProfile={organizationProfile ?? null}
        vacancies={companyVacancies}
        joinRequests={companyJoinRequests}
      />

      <Co2FactorsSection initialFactors={settings.co2FactorsKg} />
    </div>
  );
}
