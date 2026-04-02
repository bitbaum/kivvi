import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getSessionOrRedirect } from "@/lib/session";
import { db } from "@/lib/db";
import { getDataRepairStatusAction } from "@/app/actions/data-repair";
import { DataRepairPanel } from "./data-repair-panel";

export default async function DataRepairPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("settings");
  const statusResult = await getDataRepairStatusAction();

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
          <h1 className="text-2xl font-bold">{t("dataRepair.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("dataRepair.description")}
          </p>
        </div>
      </div>

      <DataRepairPanel
        initialStatus={statusResult.success ? statusResult.data! : null}
      />
    </div>
  );
}
