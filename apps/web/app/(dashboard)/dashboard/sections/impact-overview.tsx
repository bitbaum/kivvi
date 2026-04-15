import { Leaf, Recycle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { getSessionOrRedirect } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { companies } from "@kivvi/database";
import type { CompanySettings } from "@kivvi/database";
import { getImpactMetrics } from "@kivvi/core/src/domain/impact";

export async function ImpactOverview() {
  const session = await getSessionOrRedirect();
  const ti = await getTranslations("inventory");
  const companyId = session.user.companyId;

  // Fetch company CO2 factor overrides from settings
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
    columns: { settings: true },
  });
  const settings = (company?.settings as CompanySettings) ?? {};
  const co2FactorsKg = settings.co2FactorsKg;

  const metrics = await getImpactMetrics(db, companyId, { co2FactorsKg });

  if (metrics.itemsProcessed === 0) return null;

  const co2Kg = Number(metrics.co2AvoidedKg);
  const co2Display =
    co2Kg >= 1000
      ? `${(co2Kg / 1000).toFixed(1)} t`
      : `${co2Kg.toLocaleString()} kg`;

  const topCategories = metrics.co2ByCategory.slice(0, 3);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{ti("impact")}</h2>
        <Link
          href="/reports/impact"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {ti("fullReport")} <ArrowRight className="ml-1 inline h-3 w-3" />
        </Link>
      </div>

      {/* Top-level metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-success">
            <Recycle className="h-5 w-5" />
            <span className="text-xs font-medium">{ti("itemsReused")}</span>
          </div>
          <div className="text-2xl font-bold">{metrics.itemsReused}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {metrics.reuseRatePercent}% {ti("reuseRate")}
          </p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-success">
            <Leaf className="h-5 w-5" />
            <span className="text-xs font-medium">{ti("co2Avoided")}</span>
          </div>
          <div className="text-2xl font-bold">{co2Display}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {metrics.wasteDiverted} {ti("divertedFromLandfill")}
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
                  <span className="capitalize text-muted-foreground">{cat.category}</span>
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
