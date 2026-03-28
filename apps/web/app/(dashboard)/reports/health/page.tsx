import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getBusinessHealthMetrics } from "@kivvi/core/src/domain/dashboard";
import { getSalesReport, getAgingReport } from "@kivvi/core/src/domain/reports";
import { formatCurrency } from "@/lib/utils";
import { AGING_BUCKET_COLORS } from "@/lib/config/chart-colors";
import { RevenueChart, AgingChart } from "../../dashboard/charts";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";
import {
  TrendingUp,
  Target,
  Wallet,
  Clock,
  DollarSign,
  Users,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export const revalidate = 60;

export default async function HealthReportPage() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const t = await getTranslations("dashboard.healthMetrics");
  const td = await getTranslations("dashboard");

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
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* Health Metrics KPIs */}
      <Suspense fallback={<MetricsSkeleton />}>
        <HealthMetricsSection />
      </Suspense>

      {/* Charts */}
      <Suspense fallback={<ChartsSkeleton />}>
        <ChartsSection />
      </Suspense>
    </div>
  );
}

async function HealthMetricsSection() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const t = await getTranslations("dashboard.healthMetrics");

  let metrics;
  try {
    metrics = await getBusinessHealthMetrics(db, session.user.companyId);
  } catch (error) {
    logger.error("HealthMetrics: failed to load", error);
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        {t("subtitle")}
      </div>
    );
  }

  const metricCards = [
    {
      label: t("profitMargin"),
      value: `${metrics.profitMargin}%`,
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      trend:
        metrics.profitMargin >= 20
          ? "excellent"
          : metrics.profitMargin >= 10
            ? "good"
            : "poor",
    },
    {
      label: t("conversionRate"),
      value: `${metrics.conversionRate}%`,
      icon: <Target className="h-5 w-5" />,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      trend:
        metrics.conversionRate >= 30
          ? "excellent"
          : metrics.conversionRate >= 15
            ? "good"
            : "poor",
    },
    {
      label: t("avgInvoice"),
      value: formatCurrency(metrics.avgInvoiceValue),
      icon: <Wallet className="h-5 w-5" />,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      trend: "neutral" as const,
    },
    {
      label: t("daysToPayment"),
      value: `${metrics.avgDaysToPayment}d`,
      icon: <Clock className="h-5 w-5" />,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
      trend:
        metrics.avgDaysToPayment <= 15
          ? "excellent"
          : metrics.avgDaysToPayment <= 30
            ? "good"
            : "poor",
    },
    {
      label: t("cashFlowRatio"),
      value: `${metrics.cashFlowRatio}%`,
      icon: <DollarSign className="h-5 w-5" />,
      color: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
      trend:
        metrics.cashFlowRatio >= 120
          ? "excellent"
          : metrics.cashFlowRatio >= 100
            ? "good"
            : "poor",
    },
    {
      label: t("customerRetention"),
      value: `${metrics.customerRetentionRate}%`,
      icon: <Users className="h-5 w-5" />,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
      trend:
        metrics.customerRetentionRate >= 80
          ? "excellent"
          : metrics.customerRetentionRate >= 60
            ? "good"
            : "poor",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {metricCards.map((metric) => (
        <div key={metric.label} className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {metric.label}
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${metric.bgColor}`}
            >
              <div className={metric.color}>{metric.icon}</div>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold">{metric.value}</p>
            {metric.trend !== "neutral" && (
              <p
                className={`mt-1 text-xs ${
                  metric.trend === "excellent"
                    ? "text-green-600 dark:text-green-400"
                    : metric.trend === "good"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-red-600 dark:text-red-400"
                }`}
              >
                {metric.trend === "excellent"
                  ? t("trendExcellent")
                  : metric.trend === "good"
                    ? t("trendGood")
                    : t("trendNeedsAttention")}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

async function ChartsSection() {
  const session = await auth();
  if (!session?.user?.companyId) redirect("/login");

  const companyId = session.user.companyId;
  const t = await getTranslations("dashboard");

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [salesReport, agingReport] = await Promise.all([
    getSalesReport(
      db,
      companyId,
      sixMonthsAgo.toISOString().split("T")[0],
      new Date().toISOString().split("T")[0],
    ),
    getAgingReport(db, companyId, new Date().toISOString().split("T")[0]),
  ]);

  const revenueData = salesReport.rows.map((r) => ({
    month: r.month,
    revenue: Number(r.revenue),
  }));

  const agingData = [
    {
      name: t("aging.current"),
      value: Number(agingReport.totals.current),
      color: AGING_BUCKET_COLORS.current,
    },
    {
      name: t("aging.days30"),
      value: Number(agingReport.totals.days30),
      color: AGING_BUCKET_COLORS.days30,
    },
    {
      name: t("aging.days60"),
      value: Number(agingReport.totals.days60),
      color: AGING_BUCKET_COLORS.days60,
    },
    {
      name: t("aging.days90"),
      value: Number(agingReport.totals.days90),
      color: AGING_BUCKET_COLORS.days90,
    },
    {
      name: t("aging.over90"),
      value: Number(agingReport.totals.over90),
      color: AGING_BUCKET_COLORS.over90,
    },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">{t("charts.revenue")}</h3>
        {revenueData.length > 0 ? (
          <RevenueChart
            data={revenueData}
            revenueLabel={t("charts.revenueLabel")}
          />
        ) : (
          <p className="py-12 text-center text-muted-foreground">
            {t("charts.noRevenue")}
          </p>
        )}
      </div>
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">{t("charts.aging")}</h3>
        {agingData.length > 0 ? (
          <AgingChart data={agingData} />
        ) : (
          <p className="py-12 text-center text-muted-foreground">
            {t("charts.noInvoices")}
          </p>
        )}
      </div>
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <div className="mt-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {[...Array(2)].map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-4 h-[300px] w-full" />
        </div>
      ))}
    </div>
  );
}
