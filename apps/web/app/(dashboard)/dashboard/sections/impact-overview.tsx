import { Leaf, Recycle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getSessionOrRedirect } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getCompanySettings } from "@kivvi/core/src/domain/companies";
import { getImpactMetrics } from "@kivvi/core/src/domain/impact";
import { getChecklistTemplate } from "@kivvi/core/src/config/checklist-templates";
import { DEFAULT_LOCALE } from "@kivvi/core/src/config/locale";

function formatCo2(kg: number, locale: string): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${kg.toLocaleString(locale)} kg`;
}

export async function ImpactOverview() {
  const session = await getSessionOrRedirect();
  const ti = await getTranslations("inventory");
  const tck = await getTranslations("checklist");
  const companyId = session.user.companyId;

  const settings = await getCompanySettings(db, companyId);
  const co2FactorsKg = settings.co2FactorsKg;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [metricsThisMonth, allTime] = await Promise.all([
    getImpactMetrics(db, companyId, { startDate: startOfMonth, co2FactorsKg }),
    getImpactMetrics(db, companyId, { co2FactorsKg }),
  ]);

  if (allTime.itemsProcessed === 0) return null;

  const monthCo2Display = formatCo2(Number(metricsThisMonth.co2AvoidedKg), DEFAULT_LOCALE);
  const allTimeCo2Display = formatCo2(Number(allTime.co2AvoidedKg), DEFAULT_LOCALE);

  const topCategories = allTime.co2ByCategory.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-semibold">{ti("impact")}</h2>
          <span className="text-sm text-muted-foreground">— {ti("thisMonth")}</span>
        </div>
        <Link
          href="/reports/impact"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {ti("fullReport")} <ArrowRight className="ml-1 inline h-3 w-3" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-success">
            <Recycle className="h-5 w-5" />
            <span className="text-xs font-medium">{ti("itemsReused")}</span>
          </div>
          <div className="text-2xl font-bold">{metricsThisMonth.itemsReused}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {allTime.itemsReused} {ti("allTime")} · {allTime.reuseRatePercent}% {ti("reuseRate")}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-success">
            <Leaf className="h-5 w-5" />
            <span className="text-xs font-medium">{ti("co2Avoided")}</span>
          </div>
          <div className="text-2xl font-bold">{monthCo2Display}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {allTimeCo2Display} {ti("allTime")} · {allTime.wasteDiverted}{" "}
            {ti("divertedFromLandfill")}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-muted-foreground text-xs font-medium">
            CO₂ {ti("byCategory")}
          </div>
          {topCategories.length > 0 ? (
            <div className="space-y-1.5 mt-1">
              {topCategories.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {tck(getChecklistTemplate(cat.category).labelKey as Parameters<typeof tck>[0])}
                  </span>
                  <span className="font-medium tabular-nums">
                    {Number(cat.co2TotalKg) >= 1000
                      ? `${(Number(cat.co2TotalKg) / 1000).toFixed(1)} t`
                      : `${cat.co2TotalKg} kg`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">—</p>
          )}
        </div>
      </div>
    </div>
  );
}
