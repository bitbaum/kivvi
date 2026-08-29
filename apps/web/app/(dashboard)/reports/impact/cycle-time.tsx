import { Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { CycleTimeMetrics } from "@kivvi/core/src/domain/impact";

export async function CycleTimeSection({ data }: { data: CycleTimeMetrics }) {
  if (data.sampleSize === 0) return null;

  const tr = await getTranslations("reports");

  const stats = [
    { label: tr("cycleTimeAvgToSell"), value: data.avgDaysToSell },
    { label: tr("cycleTimeAvgToDonate"), value: data.avgDaysToDonate },
    { label: tr("cycleTimeAvgAll"), value: data.avgDaysAll },
  ].filter((s) => s.value !== null);

  if (stats.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <Clock className="h-4 w-4 text-muted-foreground" />
        {tr("cycleTimeHeading")}
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {tr("cycleTimeDesc", { count: data.sampleSize })}
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-bold tabular-nums">
              {s.value}
              <span className="ml-1 text-base font-normal text-muted-foreground">{tr("days")}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
