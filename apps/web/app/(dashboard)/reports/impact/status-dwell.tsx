import { Activity } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { StatusDwellEntry } from "@kivvi/core/src/domain/impact";

const STATUS_I18N_KEY: Record<string, string> = {
  intake: "statusIntake",
  testing: "statusTesting",
  repair: "statusRepair",
  ready_for_sale: "statusReadyForSale",
  listed: "statusListed",
  reserved: "statusReserved",
};

export async function StatusDwellSection({ data }: { data: StatusDwellEntry[] }) {
  const active = data.filter((d) => d.count > 0);
  if (active.length === 0) return null;

  const tr = await getTranslations("reports");
  const ti = await getTranslations("inventory");

  const maxAvg = Math.max(...active.map((d) => d.avgDays), 1);

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <Activity className="h-4 w-4 text-muted-foreground" />
        {tr("statusDwellHeading")}
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">{tr("statusDwellDesc")}</p>
      <div className="space-y-3">
        <div className="grid grid-cols-[1fr_auto_auto_3fr] gap-4 text-xs font-medium text-muted-foreground">
          <span>{tr("statusDwellStage")}</span>
          <span className="text-right">{tr("statusDwellItems")}</span>
          <span className="text-right">{tr("statusDwellAvg")}</span>
          <span>{tr("statusDwellMax")}</span>
        </div>
        {active.map((d) => {
          const barPct = maxAvg > 0 ? Math.round((d.avgDays / maxAvg) * 100) : 0;
          const isStale = d.maxDays > 30;
          return (
            <div
              key={d.status}
              className="grid grid-cols-[1fr_auto_auto_3fr] items-center gap-4 text-sm"
            >
              <span className="font-medium">
                {ti((STATUS_I18N_KEY[d.status] ?? d.status) as Parameters<typeof ti>[0])}
              </span>
              <span className="text-right tabular-nums text-muted-foreground">{d.count}</span>
              <span className="text-right tabular-nums">
                {d.avgDays}
                <span className="ml-0.5 text-xs text-muted-foreground">{tr("days")}</span>
              </span>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${isStale ? "bg-warning/60" : "bg-info/60"}`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                <span
                  className={`w-12 text-right text-xs tabular-nums ${isStale ? "font-medium text-warning" : "text-muted-foreground"}`}
                >
                  {tr("statusDwellMaxVal", { days: d.maxDays })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
