import { ArrowLeft, Leaf, Recycle, Package } from "lucide-react";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies } from "@kivvi/database";
import type { Metadata } from "next";
import type { CompanySettings } from "@kivvi/database";
import { getSessionOrRedirect } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { getImpactMetrics } from "@kivvi/core/src/domain/impact";
import { PageHeader } from "@/components/page-header";
import { CO2_FACTORS_KG } from "@/lib/config/co2-factors";
import { ImpactPdfDownload } from "./impact-pdf-download";

export const metadata: Metadata = {
  title: "Impact Report — Kivvi",
};

export const revalidate = 60;

export default async function ImpactReportPage() {
  const session = await getSessionOrRedirect();
  const t = await getTranslations("inventory");
  const tr = await getTranslations("reports");
  const tc = await getTranslations("common");
  const companyId = session.user.companyId;

  // Fetch company CO2 overrides
  const company = await db.query.companies.findFirst({
    where: eq(companies.id, companyId),
    columns: { settings: true, name: true },
  });
  const settings = (company?.settings as CompanySettings) ?? {};
  const co2FactorsKg = settings.co2FactorsKg;

  const metrics = await getImpactMetrics(db, companyId, { co2FactorsKg });

  const co2Kg = Number(metrics.co2AvoidedKg);
  const co2Tonnes = (co2Kg / 1000).toFixed(2);

  // Equivalent comparisons for context
  const treesEquivalent = Math.round(co2Kg / 21); // ~21 kg CO2/tree/year
  const carKmEquivalent = Math.round(co2Kg / 0.21); // ~210g CO2/km

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
              value={metrics.itemsReused.toLocaleString()}
              sub={`${metrics.reuseRatePercent}% ${t("reuseRate")}`}
              color="text-success"
            />
            <SummaryCard
              icon={<Leaf className="h-5 w-5" />}
              label={t("co2Avoided")}
              value={`${co2Tonnes} t`}
              sub={`${co2Kg.toLocaleString()} kg total`}
              color="text-success"
            />
            <SummaryCard
              icon={<Package className="h-5 w-5" />}
              label={tr("impactItemsProcessed")}
              value={metrics.itemsProcessed.toLocaleString()}
              sub={`${metrics.wasteDiverted} ${t("divertedFromLandfill")}`}
              color="text-info"
            />
            <SummaryCard
              icon={<Recycle className="h-5 w-5" />}
              label={tr("impactItemsRecycled")}
              value={metrics.itemsRecycled.toLocaleString()}
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
                  {treesEquivalent.toLocaleString()}
                </div>
                <p className="text-muted-foreground">
                  {tr("impactTreesEquivalent", {
                    count: treesEquivalent.toLocaleString(),
                  })}
                </p>
              </div>
              <div className="rounded-lg bg-success/5 p-4">
                <div className="text-2xl font-bold text-success mb-1">
                  {carKmEquivalent.toLocaleString()}
                </div>
                <p className="text-muted-foreground">
                  {tr("impactCarKmEquivalent", {
                    count: carKmEquivalent.toLocaleString(),
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
                          <span className="capitalize font-medium">
                            {cat.category}
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
                              : `${catCo2Kg.toLocaleString()} kg`}
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

          {/* CO2 factors reference */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-1 font-semibold">{tr("impactCo2Factors")}</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {tr("impactCo2FactorsDesc")}{" "}
              {co2FactorsKg && Object.keys(co2FactorsKg).length > 0
                ? tr("impactCo2FactorsCustom")
                : tr("impactCo2FactorsDefault")}
            </p>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 text-xs">
              {Object.entries({ ...CO2_FACTORS_KG, ...co2FactorsKg }).map(
                ([cat, kg]) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <span className="capitalize text-muted-foreground">
                      {cat}
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
