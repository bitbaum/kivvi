import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { companies } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
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
      <Link
        href="/settings"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToSettings")}
      </Link>

      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <RicardoSection hasApiKey={!!settings.ricardoApiKey} />
    </div>
  );
}
