import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { companies } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { SettingsSubpageHeader } from "@/components/settings-subpage-header";
import { RicardoSection } from "./ricardo-section";

export default async function IntegrationsPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("settings.integrations");

  const [company] = await db
    .select({ settings: companies.settings })
    .from(companies)
    .where(eq(companies.id, session.user.companyId));

  const settings = (company?.settings as CompanySettings) ?? {};

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsSubpageHeader title={t("title")} description={t("subtitle")} />

      <RicardoSection hasApiKey={!!settings.ricardoApiKey} />
    </div>
  );
}
