import { TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE } from "@kivvi/core/src/config/locale";
import type { MonthlyBreakdown } from "@kivvi/core/src/domain/impact";

export async function MonthlyTrendSection({
  data,
}: {
  data: MonthlyBreakdown[];
}) {
  if (data.length === 0) return null;

  const t = await getTranslations("inventory");
  const tr = await getTranslations("reports");

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        {tr("impactMonthlyTrend")}
      </h2>
      <div className="space-y-2">
        <div className="mb-2 grid grid-cols-[1fr_auto_auto_3fr] gap-4 text-xs font-medium text-muted-foreground">
          <span>{tr("month")}</span>
          <span className="text-right">{tr("impactItemsProcessed")}</span>
          <span className="text-right">{t("itemsReused")}</span>
          <span>{t("reuseRate")}</span>
        </div>
        {data
          .slice(-12)
          .reverse()
          .map((row) => {
            const label = new Date(row.month + "-01").toLocaleDateString(
              DEFAULT_LOCALE,
              { year: "2-digit", month: "short" },
            );
            return (
              <div
                key={row.month}
                className="grid grid-cols-[1fr_auto_auto_3fr] items-center gap-4 text-sm"
              >
                <span className="text-muted-foreground tabular-nums">
                  {label}
                </span>
                <span className="text-right tabular-nums">{row.processed}</span>
                <span className="text-right tabular-nums text-success">
                  {row.reused}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-success/60"
                      style={{ width: `${row.reuseRatePercent}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                    {row.reuseRatePercent}%
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
