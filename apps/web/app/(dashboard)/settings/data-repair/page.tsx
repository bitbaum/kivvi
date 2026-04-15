import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
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
      <div className="flex items-center gap-4">
        <Link
          href="/settings"
          className="min-h-[44px] min-w-[44px] rounded-lg border p-2 hover:bg-muted/50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t("dataRepair.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("dataRepair.description")}
          </p>
        </div>
      </div>

      {/* Data quality — duplicates, missing fields, bad values */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Datenqualität</h2>
          <p className="text-sm text-muted-foreground">
            Duplikate, fehlende Felder und inkonsistente Werte — nach Migrationen und laufend.
          </p>
        </div>
        <DataQualityPanel
          initialReport={qualityResult.success ? qualityResult.data! : null}
        />
      </section>

      {/* Migration repair — sequences, statuses, journal entries */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Migrations-Korrekturen</h2>
          <p className="text-sm text-muted-foreground">
            Nummernkreise, historische Rechnungsstatus und fehlende Buchungssätze.
          </p>
        </div>
        <DataRepairPanel
          initialStatus={statusResult.success ? statusResult.data! : null}
        />
      </section>
    </div>
  );
}
