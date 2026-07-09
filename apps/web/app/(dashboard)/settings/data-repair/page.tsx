import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { SettingsSubpageHeader } from "@/components/settings-subpage-header";
import { getDataRepairStatusAction } from "@/app/actions/data-repair";
import { getDataQualityReportAction } from "@/app/actions/data-quality";
import { DataRepairPanel } from "./data-repair-panel";
import { DataQualityPanel } from "./data-quality-panel";

export default async function DataRepairPage() {
  await getSessionOrRedirect();
  const t = await getTranslations("settings");

  const [statusResult, qualityResult] = await Promise.all([
    getDataRepairStatusAction(),
    getDataQualityReportAction(),
  ]);

  return (
    <div className="space-y-10">
      <SettingsSubpageHeader
        title={t("dataRepair.title")}
        description={t("dataRepair.description")}
      />

      {/* Data quality — duplicates, missing fields, bad values */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">
            {t("dataRepair.qualityTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("dataRepair.qualityDesc")}
          </p>
        </div>
        <DataQualityPanel
          initialReport={
            qualityResult.success ? (qualityResult.data ?? null) : null
          }
        />
      </section>

      {/* Migration repair — sequences, statuses, journal entries */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">
            {t("dataRepair.migrationTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("dataRepair.migrationDesc")}
          </p>
        </div>
        <DataRepairPanel
          initialStatus={
            statusResult.success ? (statusResult.data ?? null) : null
          }
        />
      </section>
    </div>
  );
}
