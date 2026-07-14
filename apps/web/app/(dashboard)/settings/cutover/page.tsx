import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { SettingsSubpageHeader } from "@/components/settings-subpage-header";
import { CutoverPanels } from "./cutover-panels";

export default async function CutoverPage() {
  await getSessionOrRedirect();
  const t = await getTranslations("settings");

  return (
    <div className="space-y-8">
      <SettingsSubpageHeader
        title={t("cutover.title")}
        description={t("cutover.description")}
      />
      <CutoverPanels />
    </div>
  );
}
