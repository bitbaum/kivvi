import { getSessionOrRedirect } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { SettingsSubpageHeader } from "@/components/settings-subpage-header";
import { listWebhookEndpointsAction } from "@/app/actions/webhooks";
import { WebhooksPanel } from "./webhooks-panel";

export default async function WebhooksSettingsPage() {
  await getSessionOrRedirect();
  const t = await getTranslations("settings.webhooks");
  const result = await listWebhookEndpointsAction();
  const endpoints = result.success ? (result.data ?? []) : [];

  return (
    <div className="space-y-6">
      <SettingsSubpageHeader title={t("title")} description={t("subtitle")} />

      <WebhooksPanel initialEndpoints={endpoints} />
    </div>
  );
}
