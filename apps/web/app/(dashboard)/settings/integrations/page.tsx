import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { companies, externalIntegrationItems } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { SettingsSubpageHeader } from "@/components/settings-subpage-header";
import { RicardoSection } from "./ricardo-section";
import { OperationsSection } from "./operations-section";
import { IntegrationReviewSection } from "./integration-review-section";
import {
  maskSecret,
  summarizeIntegrationStatus,
} from "@kivvi/core/src/domain/integrations";

export default async function IntegrationsPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("settings.integrations");

  const [company] = await db
    .select({ settings: companies.settings })
    .from(companies)
    .where(eq(companies.id, session.user.companyId));

  const settings = (company?.settings as CompanySettings) ?? {};
  const reviewItems = await db
    .select({
      id: externalIntegrationItems.id,
      source: externalIntegrationItems.source,
      kind: externalIntegrationItems.kind,
      status: externalIntegrationItems.status,
      title: externalIntegrationItems.title,
      summary: externalIntegrationItems.summary,
      fromName: externalIntegrationItems.fromName,
      fromEmail: externalIntegrationItems.fromEmail,
      occurredAt: externalIntegrationItems.occurredAt,
      url: externalIntegrationItems.url,
    })
    .from(externalIntegrationItems)
    .where(
      and(
        eq(externalIntegrationItems.companyId, session.user.companyId),
        inArray(externalIntegrationItems.status, ["new", "reviewed"]),
      ),
    )
    .orderBy(desc(externalIntegrationItems.occurredAt))
    .limit(20);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <SettingsSubpageHeader title={t("title")} description={t("subtitle")} />

      <OperationsSection
        nextcloud={{
          ...settings.nextcloud,
          appPassword: maskSecret(settings.nextcloud?.appPassword),
        }}
        nextcloudStatus={summarizeIntegrationStatus(settings.nextcloud)}
        mail={{
          ...settings.mailIntake,
          password: maskSecret(settings.mailIntake?.password),
        }}
        mailStatus={summarizeIntegrationStatus(settings.mailIntake)}
      />

      <IntegrationReviewSection items={reviewItems} />

      <RicardoSection hasApiKey={!!settings.ricardoApiKey} />
    </div>
  );
}
