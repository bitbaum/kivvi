import { ArrowLeft, Leaf, Recycle, Package } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import { getCompany } from "@kivvi/core/src/domain/companies";
import { getSessionOrRedirect } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import {
  getImpactMetrics,
  getTopDonors,
  getMonthlyBreakdown,
  getDestinationBreakdown,
  getCycleTimeMetrics,
  getStatusDwellMetrics,
} from "@kivvi/core/src/domain/impact";
import { getChecklistTemplate } from "@kivvi/core/src/config/checklist-templates";
import { PageHeader } from "@/components/page-header";
import {
  CO2_FACTORS_KG,
  CO2_TREE_KG_PER_YEAR,
  CO2_CAR_KG_PER_KM,
} from "@kivvi/core/src/config/co2-factors";
import { ImpactPdfDownload } from "./impact-pdf-download";
import { DEFAULT_LOCALE } from "@kivvi/core/src/config/locale";
import { DestinationBreakdownSection } from "./destination-breakdown";
import { MonthlyTrendSection } from "./monthly-trend";
import { TopDonorsSection } from "./top-donors";
import { CycleTimeSection } from "./cycle-time";
import { StatusDwellSection } from "./status-dwell";
import { DateRangeForm } from "../date-range-form";

export const metadata: Metadata = {
  title: "Impact Report — Kivvi",
};

export const revalidate = 60;

interface PageProps {
  searchParams: Promise<{ start?: string; end?: string }>;
}

export default async function ImpactReportPage({ searchParams }: PageProps) {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("inventory");
  const tr = await getTranslations("reports");
  const tc = await getTranslations("common");
  const tck = await getTranslations("checklist");
  const companyId = session.user.companyId;

  const params = await searchParams;
  const startDate = params.start ? new Date(params.start) : undefined;
  const endDate = params.end ? new Date(`${params.end}T23:59:59`) : undefined;
  const dateSubtitle =
    params.start && params.end ? `${params.start} – ${params.end}` : tr("impactAllTime");

  const company = await getCompany(db, companyId);
  const settings = company?.settings ?? {};
  const co2FactorsKg = settings.co2FactorsKg;

  const dateRange = { startDate, endDate };

  const [metrics, topDonors, monthlyBreakdown, destinationBreakdown, cycleTime, statusDwell] =
    await Promise.all([
      getImpactMetrics(db, companyId, { co2FactorsKg, ...dateRange }),
      getTopDonors(db, companyId, { limit: 5, ...dateRange }),
      getMonthlyBreakdown(db, companyId, dateRange),
      getDestinationBreakdown(db, companyId, dateRange),
      getCycleTimeMetrics(db, companyId),
      getStatusDwellMetrics(db, companyId),
    ]);

  const co2Kg = Number(metrics.co2AvoidedKg);
  const co2Tonnes = (co2Kg / 1000).toFixed(2);
  const treesEquivalent = Math.round(co2Kg / CO2_TREE_KG_PER_YEAR);
  const carKmEquivalent = Math.round(co2Kg / CO2_CAR_KG_PER_KM);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link
          href="/reports"
          className="flex h-11 w-11 items-center justify-center rounded-lg border bg-card hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <PageHeader
          title={t("impact")}
          subtitle={company?.name ? `${company.name} — ${dateSubtitle}` : dateSubtitle}
        />
        <div className="ml-auto">
          <ImpactPdfDownload />
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="rounded-xl border bg-card p-4">
        <DateRangeForm defaultStart={params.start ?? ""} defaultEnd={params.end ?? ""} />
      </div>

      {metrics.itemsProcessed === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <Recycle className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p>{tr("impactNoItems")}</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={<Recycle className="h-5 w-5" />}
              label={t("itemsReused")}
              value={metrics.itemsReused.toLocaleString(DEFAULT_LOCALE)}
              sub={`${metrics.reuseRatePercent}% ${t("reuseRate")}`}
              color="text-success"
            />
            <SummaryCard
              icon={<Leaf className="h-5 w-5" />}
              label={t("co2Avoided")}
              value={`${co2Tonnes} t`}
              sub={`${co2Kg.toLocaleString(DEFAULT_LOCALE)} kg ${tc("total")}`}
              color="text-success"
            />
            <SummaryCard
              icon={<Package className="h-5 w-5" />}
              label={tr("impactItemsProcessed")}
              value={metrics.itemsProcessed.toLocaleString(DEFAULT_LOCALE)}
              sub={`${metrics.wasteDiverted} ${t("divertedFromLandfill")}`}
              color="text-info"
            />
            <SummaryCard
              icon={<Recycle className="h-5 w-5" />}
              label={tr("impactItemsRecycled")}
              value={metrics.itemsRecycled.toLocaleString(DEFAULT_LOCALE)}
              sub={tr("impactMaterialCycle")}
              color="text-warning"
            />
          </div>

          {/* CO2 equivalents */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 font-semibold">{tr("impactCo2Context")}</h2>
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              {[
                {
                  value: treesEquivalent.toLocaleString(DEFAULT_LOCALE),
                  label: tr("impactTreesEquivalent", {
                    count: treesEquivalent.toLocaleString(DEFAULT_LOCALE),
                  }),
                },
                {
                  value: carKmEquivalent.toLocaleString(DEFAULT_LOCALE),
                  label: tr("impactCarKmEquivalent", {
                    count: carKmEquivalent.toLocaleString(DEFAULT_LOCALE),
                  }),
                },
                {
                  value: `${co2Tonnes} t`,
                  label: tr("impactCo2TonnesAvoided", { tonnes: co2Tonnes }),
                },
              ].map((eq) => (
                <div key={eq.label} className="rounded-lg bg-success/5 p-4">
                  <div className="mb-1 text-2xl font-bold text-success">{eq.value}</div>
                  <p className="text-muted-foreground">{eq.label}</p>
                </div>
              ))}
            </div>
          </div>

          <DestinationBreakdownSection data={destinationBreakdown} />

          <CycleTimeSection data={cycleTime} />

          <StatusDwellSection data={statusDwell} />

          {/* Category CO2 breakdown */}
          {metrics.co2ByCategory.length > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-4 font-semibold">{tr("impactCo2ByCategory")}</h2>
              <div className="space-y-3">
                {metrics.co2ByCategory.map((cat) => {
                  const pct = co2Kg > 0 ? Math.round((Number(cat.co2TotalKg) / co2Kg) * 100) : 0;
                  const catCo2Kg = Number(cat.co2TotalKg);
                  return (
                    <div key={cat.category}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {tck(
                              getChecklistTemplate(cat.category).labelKey as Parameters<
                                typeof tck
                              >[0],
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {tr("impactItemCount", { count: cat.itemCount })} × {cat.co2KgFactor} kg
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground">{pct}%</span>
                          <span className="font-medium tabular-nums">
                            {catCo2Kg >= 1000
                              ? `${(catCo2Kg / 1000).toFixed(1)} t`
                              : `${catCo2Kg.toLocaleString(DEFAULT_LOCALE)} kg`}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-success/60"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <MonthlyTrendSection data={monthlyBreakdown} />

          <TopDonorsSection topDonors={topDonors} metrics={metrics} co2Kg={co2Kg} />

          {/* CO2 factors reference */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-1 font-semibold">{tr("impactCo2Factors")}</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {tr("impactCo2FactorsDesc")}{" "}
              {co2FactorsKg && Object.keys(co2FactorsKg).length > 0
                ? tr("impactCo2FactorsCustom")
                : tr("impactCo2FactorsDefault")}
            </p>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {Object.entries({ ...CO2_FACTORS_KG, ...co2FactorsKg }).map(([cat, kg]) => (
                <div
                  key={cat}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <span className="text-muted-foreground">
                    {tck(getChecklistTemplate(cat).labelKey as Parameters<typeof tck>[0])}
                  </span>
                  <span className="font-medium tabular-nums">{kg} kg</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className={`mb-2 flex items-center gap-2 text-xs font-medium ${color}`}>
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
