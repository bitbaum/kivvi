import {
  ArrowLeft,
  Leaf,
  Recycle,
  Package,
  Users,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@kivvi/database";
import type { Metadata } from "next";
import type { CompanySettings } from "@kivvi/database";
import { getSessionOrRedirect } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import {
  getImpactMetrics,
  getTopDonors,
  getMonthlyBreakdown,
  getDestinationBreakdown,
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

export const metadata: Metadata = {
  title: "Impact Report — Kivvi",
};

export const revalidate = 60;

export default async function ImpactReportPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("inventory");
  const tr = await getTranslations("reports");
  const tc = await getTranslations("common");
  const tck = await getTranslations("checklist");
  const companyId = session.user.companyId;

  // Fetch company CO2 overrides
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
    columns: { settings: true, name: true },
  });
  const settings = (company?.settings as CompanySettings) ?? {};
  const co2FactorsKg = settings.co2FactorsKg;

  const [metrics, topDonors, monthlyBreakdown, destinationBreakdown] =
    await Promise.all([
      getImpactMetrics(db, companyId, { co2FactorsKg }),
      getTopDonors(db, companyId, { limit: 5 }),
      getMonthlyBreakdown(db, companyId),
      getDestinationBreakdown(db, companyId),
    ]);

  const co2Kg = Number(metrics.co2AvoidedKg);
  const co2Tonnes = (co2Kg / 1000).toFixed(2);

  const treesEquivalent = Math.round(co2Kg / CO2_TREE_KG_PER_YEAR);
  const carKmEquivalent = Math.round(co2Kg / CO2_CAR_KG_PER_KM);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/reports"
          className="flex h-11 w-11 items-center justify-center rounded-lg border bg-card hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <PageHeader
          title={t("impact")}
          subtitle={
            company?.name ? `${company.name} — ${tc("allTime")}` : tc("allTime")
          }
        />
        <div className="ml-auto">
          <ImpactPdfDownload />
        </div>
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
            <div className="grid gap-4 sm:grid-cols-3 text-sm">
              <div className="rounded-lg bg-success/5 p-4">
                <div className="text-2xl font-bold text-success mb-1">
                  {treesEquivalent.toLocaleString(DEFAULT_LOCALE)}
                </div>
                <p className="text-muted-foreground">
                  {tr("impactTreesEquivalent", {
                    count: treesEquivalent.toLocaleString(DEFAULT_LOCALE),
                  })}
                </p>
              </div>
              <div className="rounded-lg bg-success/5 p-4">
                <div className="text-2xl font-bold text-success mb-1">
                  {carKmEquivalent.toLocaleString(DEFAULT_LOCALE)}
                </div>
                <p className="text-muted-foreground">
                  {tr("impactCarKmEquivalent", {
                    count: carKmEquivalent.toLocaleString(DEFAULT_LOCALE),
                  })}
                </p>
              </div>
              <div className="rounded-lg bg-success/5 p-4">
                <div className="text-2xl font-bold text-success mb-1">
                  {co2Tonnes} t
                </div>
                <p className="text-muted-foreground">
                  {tr("impactCo2TonnesAvoided", { tonnes: co2Tonnes })}
                </p>
              </div>
            </div>
          </div>

          {/* Destination breakdown */}
          {(() => {
            const total =
              destinationBreakdown.sold +
              destinationBreakdown.donated +
              destinationBreakdown.recycled +
              destinationBreakdown.inStock;
            const pct = (n: number) =>
              total > 0 ? Math.round((n / total) * 100) : 0;
            const destinations = [
              {
                label: t("statusSold"),
                value: destinationBreakdown.sold,
                pct: pct(destinationBreakdown.sold),
                color: "bg-success/20 text-success",
                bar: "bg-success/60",
              },
              {
                label: t("statusDonated"),
                value: destinationBreakdown.donated,
                pct: pct(destinationBreakdown.donated),
                color: "bg-info/20 text-info",
                bar: "bg-info/60",
              },
              {
                label: t("statusRecycled"),
                value: destinationBreakdown.recycled,
                pct: pct(destinationBreakdown.recycled),
                color: "bg-warning/20 text-warning",
                bar: "bg-warning/60",
              },
              {
                label: t("inStock"),
                value: destinationBreakdown.inStock,
                pct: pct(destinationBreakdown.inStock),
                color: "bg-muted text-muted-foreground",
                bar: "bg-muted-foreground/40",
              },
            ];
            return (
              <div className="rounded-xl border bg-card p-6">
                <h2 className="mb-4 font-semibold">
                  {tr("impactDestinationBreakdown")}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {destinations.map((d) => (
                    <div
                      key={d.label}
                      className="rounded-lg border bg-card p-4"
                    >
                      <div className="text-2xl font-bold tabular-nums">
                        {d.value.toLocaleString(DEFAULT_LOCALE)}
                      </div>
                      <div
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${d.color}`}
                      >
                        {d.label}
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${d.bar}`}
                          style={{ width: `${d.pct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {d.pct}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Category breakdown */}
          {metrics.co2ByCategory.length > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-4 font-semibold">
                {tr("impactCo2ByCategory")}
              </h2>
              <div className="space-y-3">
                {metrics.co2ByCategory.map((cat) => {
                  const pct =
                    co2Kg > 0
                      ? Math.round((Number(cat.co2TotalKg) / co2Kg) * 100)
                      : 0;
                  const catCo2Kg = Number(cat.co2TotalKg);
                  return (
                    <div key={cat.category}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {tck(
                              getChecklistTemplate(cat.category)
                                .labelKey as Parameters<typeof tck>[0],
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {tr("impactItemCount", { count: cat.itemCount })} ×{" "}
                            {cat.co2KgFactor} kg
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

          {/* Monthly trend */}
          {monthlyBreakdown.length > 0 && (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                {tr("impactMonthlyTrend")}
              </h2>
              <div className="space-y-2">
                <div className="mb-2 grid grid-cols-[1fr_auto_auto_3fr] gap-4 text-xs font-medium text-muted-foreground">
                  <span>{tr("month")}</span>
                  <span className="text-right">
                    {tr("impactItemsProcessed")}
                  </span>
                  <span className="text-right">{t("itemsReused")}</span>
                  <span>{t("reuseRate")}</span>
                </div>
                {monthlyBreakdown
                  .slice(-12)
                  .reverse()
                  .map((row) => {
                    const label = new Date(
                      row.month + "-01",
                    ).toLocaleDateString(DEFAULT_LOCALE, {
                      year: "2-digit",
                      month: "short",
                    });
                    return (
                      <div
                        key={row.month}
                        className="grid grid-cols-[1fr_auto_auto_3fr] items-center gap-4 text-sm"
                      >
                        <span className="text-muted-foreground tabular-nums">
                          {label}
                        </span>
                        <span className="text-right tabular-nums">
                          {row.processed}
                        </span>
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
          )}

          {/* Top donors */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              {tr("impactTopDonors")}
            </h2>
            {topDonors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {tr("impactNoDonors")}
              </p>
            ) : (
              <div className="space-y-3">
                {topDonors.map((donor, i) => {
                  const co2PerItem =
                    metrics.itemsReused > 0 ? co2Kg / metrics.itemsReused : 0;
                  const donorCo2Kg = Math.round(donor.itemsReused * co2PerItem);
                  const pct =
                    metrics.itemsProcessed > 0
                      ? Math.round(
                          (donor.itemsDonated / metrics.itemsProcessed) * 100,
                        )
                      : 0;
                  return (
                    <div key={donor.donorId}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-muted-foreground w-4">
                            {i + 1}.
                          </span>
                          <span className="font-medium">{donor.donorName}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {t("donorItemsDonated")}: {donor.itemsDonated}
                          </span>
                          <span className="font-medium text-success">
                            {t("donorImpactSummary", {
                              reused: donor.itemsReused,
                              total: donor.itemsDonated,
                              co2: `${donorCo2Kg} kg`,
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/60"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
              {Object.entries({ ...CO2_FACTORS_KG, ...co2FactorsKg }).map(
                ([cat, kg]) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <span className="text-muted-foreground">
                      {tck(
                        getChecklistTemplate(cat).labelKey as Parameters<
                          typeof tck
                        >[0],
                      )}
                    </span>
                    <span className="font-medium tabular-nums">{kg} kg</span>
                  </div>
                ),
              )}
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
      <div
        className={`mb-2 flex items-center gap-2 text-xs font-medium ${color}`}
      >
        {icon}
        {label}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
