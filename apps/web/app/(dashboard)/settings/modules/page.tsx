import { redirect } from "next/navigation";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { companies } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { SettingsSubpageHeader } from "@/components/settings-subpage-header";
import { ModulesForm } from "./modules-form";

export default async function ModulesSettingsPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("settings");

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, session.user.companyId));

  if (!company) redirect("/settings");

  const settings = (company.settings as CompanySettings) ?? {};

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsSubpageHeader
        title={t("modules.title")}
        description={t("modules.subtitle")}
      />

      <ModulesForm initialEnabledModules={settings.enabledModules} />
    </div>
  );
}
