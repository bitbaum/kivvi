import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { listApiTokensAction } from "@/app/actions/api-tokens";
import { ApiTokensPanel } from "./api-tokens-panel";

export default async function ApiTokensPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("settings");
  const tokensResult = await listApiTokensAction();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="min-h-[44px] min-w-[44px] rounded-lg border p-2 hover:bg-muted/50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t("apiTokens.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("apiTokens.description")}
          </p>
        </div>
      </div>

      <ApiTokensPanel
        initialTokens={tokensResult.success ? tokensResult.data! : []}
      />
    </div>
  );
}
