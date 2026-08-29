import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { SettingsSubpageHeader } from "@/components/settings-subpage-header";
import { listApiTokensAction } from "@/app/actions/api-tokens";
import { ApiTokensPanel } from "./api-tokens-panel";

export default async function ApiTokensPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("settings");
  const tokensResult = await listApiTokensAction();

  return (
    <div className="space-y-6">
      <SettingsSubpageHeader
        title={t("apiTokens.title")}
        description={t("apiTokens.description")}
      />

      <ApiTokensPanel initialTokens={tokensResult.success ? (tokensResult.data ?? []) : []} />
    </div>
  );
}
